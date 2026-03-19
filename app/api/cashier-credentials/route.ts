import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // List all credential files for this shop
  const { data: files } = await admin.storage
    .from('cashier-creds')
    .list(profile.shop_id)

  if (!files || files.length === 0) return NextResponse.json({})

  // Download each credential file
  const result: Record<string, { username: string; password: string }> = {}
  await Promise.all(
    files.map(async (file) => {
      const userId = file.name.replace('.json', '')
      const { data } = await admin.storage
        .from('cashier-creds')
        .download(`${profile.shop_id}/${file.name}`)
      if (data) {
        const text = await data.text()
        try { result[userId] = JSON.parse(text) } catch {}
      }
    })
  )

  return NextResponse.json(result)
}
