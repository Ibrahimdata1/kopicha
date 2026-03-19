import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, shop_id')
    .eq('id', user.id)
    .single()

  if (!profile?.shop_id) return NextResponse.json({ error: 'No shop found' }, { status: 403 })
  if (!['owner', 'super_admin'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const { profile_id, new_password } = body as { profile_id?: string; new_password?: string }
  if (!profile_id || !new_password) {
    return NextResponse.json({ error: 'profile_id and new_password required' }, { status: 400 })
  }

  // Verify the target is a cashier in the same shop
  const { data: target } = await supabase
    .from('profiles')
    .select('id, role, shop_id, email')
    .eq('id', profile_id)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.shop_id !== profile.shop_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (target.role !== 'cashier') return NextResponse.json({ error: 'Can only reset cashier passwords' }, { status: 403 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: resetErr } = await admin.auth.admin.updateUserById(profile_id, {
    password: new_password,
  })

  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 })

  // Update stored credential
  const username = target.email?.split('@')[0] ?? profile_id
  const credJson = JSON.stringify({ username, password: new_password })
  const credBytes = Buffer.from(credJson, 'utf-8')
  await admin.storage
    .from('cashier-creds')
    .upload(`${profile.shop_id}/${profile_id}.json`, credBytes, {
      contentType: 'application/json',
      upsert: true,
    })

  return NextResponse.json({ success: true })
}
