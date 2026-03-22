import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS for webhook updates
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getBangkokToday(): Date {
  const str = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  return new Date(str + 'T00:00:00+07:00')
}

function parseBangkokDate(str: string): Date {
  return new Date(str.slice(0, 10) + 'T00:00:00+07:00')
}

function addOneMonth(date: Date): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + 1)
  if (d.getDate() !== day) d.setDate(0)
  return d
}

function toBangkokDateStr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
}

const TRIAL_DAYS = 7
const GRACE_DAYS = 7

function calcNewExpiry(currentExpiry: string | null, firstProductAt: string | null): string {
  const today = getBangkokToday()

  if (!currentExpiry) {
    // Trial user — base from trial end date, not today
    if (firstProductAt) {
      const trialEnd = parseBangkokDate(firstProductAt)
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
      const base = trialEnd > today ? trialEnd : today
      return toBangkokDateStr(addOneMonth(base))
    }
    return toBangkokDateStr(addOneMonth(today))
  }

  const orig = parseBangkokDate(currentExpiry)
  const base = orig > today ? orig : today
  return toBangkokDateStr(addOneMonth(base))
}

const Omise = require('omise')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Only handle successful charges
    if (body.key !== 'charge.complete') return NextResponse.json({ ok: true })
    const webhookCharge = body.data
    if (webhookCharge.status !== 'successful') return NextResponse.json({ ok: true })

    // Verify charge by fetching directly from Omise API with our secret key
    // Never trust webhook body alone — attacker could forge it
    const chargeId = webhookCharge.id
    if (!chargeId || typeof chargeId !== 'string' || !chargeId.startsWith('chrg_')) {
      return NextResponse.json({ error: 'Invalid charge ID' }, { status: 400 })
    }

    const secretKey = process.env.OMISE_SECRET_KEY
    if (!secretKey) {
      console.error('OMISE_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const omise = Omise({ secretKey })
    const charge = await omise.charges.retrieve(chargeId)

    // Use verified data from Omise API, not from webhook body
    if (charge.status !== 'successful') return NextResponse.json({ ok: true })

    const shopId = charge.metadata?.shopId
    if (!shopId) return NextResponse.json({ ok: true })

    // Get current shop data
    const { data: shop } = await supabase
      .from('shops')
      .select('subscription_paid_until, setup_fee_paid, first_product_at')
      .eq('id', shopId)
      .single()

    const newExpiry = calcNewExpiry(shop?.subscription_paid_until ?? null, shop?.first_product_at ?? null)
    const amountBaht = charge.amount / 100

    // ฿1,399 = setup fee (direct user), ฿199 = monthly
    const updates: Record<string, unknown> = { subscription_paid_until: newExpiry }
    if (amountBaht >= 1399) updates.setup_fee_paid = true

    await supabase.from('shops').update(updates).eq('id', shopId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Omise webhook error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
