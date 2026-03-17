import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

async function verifySuperAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'super_admin' ? user : null
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: load all shops + owners
export async function GET() {
  if (!await verifySuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const s = getServiceClient()

  const { data: shops } = await s
    .from('shops')
    .select('id, name, promptpay_id, subscription_paid_until, created_at')
    .order('created_at', { ascending: false })

  const { data: owners } = await s
    .from('profiles')
    .select('id, full_name, email, role, shop_id')
    .eq('role', 'owner')

  const ownerByShop: Record<string, any> = {}
  for (const o of owners ?? []) {
    if (o.shop_id) ownerByShop[o.shop_id] = o
  }

  const enriched = (shops ?? []).map((shop) => ({
    ...shop,
    owner: ownerByShop[shop.id] ?? null,
  }))

  return NextResponse.json({ shops: enriched })
}

// POST: admin actions (extend, deactivate, delete)
export async function POST(req: Request) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, shopId, ownerId, shopName } = await req.json()
  const s = getServiceClient()

  try {
    if (action === 'extend') {
      // Extend subscription by 30 days
      const { data: shop } = await s.from('shops').select('subscription_paid_until').eq('id', shopId).single()
      const baseDate = shop?.subscription_paid_until
        ? new Date(Math.max(new Date(shop.subscription_paid_until).getTime(), Date.now()))
        : new Date()
      baseDate.setDate(baseDate.getDate() + 30)
      const newDate = baseDate.toISOString().slice(0, 10)

      const { error } = await s.from('shops').update({ subscription_paid_until: newDate }).eq('id', shopId)
      if (error) throw error
      return NextResponse.json({ ok: true, newDate })

    } else if (action === 'deactivate') {
      const { error } = await s.from('profiles').update({ role: null, shop_id: null }).eq('id', ownerId)
      if (error) throw error
      return NextResponse.json({ ok: true })

    } else if (action === 'delete') {
      await s.from('profiles').update({ role: null, shop_id: null }).eq('shop_id', shopId).eq('role', 'owner')
      await s.from('profiles').update({ shop_id: null }).eq('shop_id', shopId).eq('role', 'cashier')
      const { error } = await s.from('shops').delete().eq('id', shopId)
      if (error) throw error
      return NextResponse.json({ ok: true })

    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
