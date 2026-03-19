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

  const { full_name, email, password } = body as { full_name?: string; email?: string; password?: string }
  if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  if (/[^\x20-\x7E]/.test(password)) return NextResponse.json({ error: 'รหัสผ่านใช้ได้เฉพาะตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 })
  if (!/[0-9]/.test(password)) return NextResponse.json({ error: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create the auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? email.split('@')[0] },
  })

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

  const userId = created.user.id
  const username = full_name ?? email.split('@')[0]

  // Assign to this shop as cashier
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ shop_id: profile.shop_id, role: 'cashier', full_name: username })
    .eq('id', userId)

  if (profileErr) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  // Store credentials in private storage so owner can retrieve anytime
  const credJson = JSON.stringify({ username, password })
  const credBytes = Buffer.from(credJson, 'utf-8')
  await admin.storage
    .from('cashier-creds')
    .upload(`${profile.shop_id}/${userId}.json`, credBytes, {
      contentType: 'application/json',
      upsert: true,
    })

  return NextResponse.json({ success: true, user_id: userId })
}
