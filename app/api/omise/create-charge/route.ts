import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const Omise = require('omise')

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user owns this shop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single()

    const { amount, shopId } = await req.json()
    if (!amount || !shopId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    if (!profile?.shop_id || profile.shop_id !== shopId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const omise = Omise({ secretKey: process.env.OMISE_SECRET_KEY })

    const charge = await omise.charges.create({
      amount: amount * 100, // Omise ใช้สตางค์ (satang)
      currency: 'thb',
      source: {
        type: 'promptpay',
      },
      metadata: { shopId },
    })

    return NextResponse.json({
      chargeId: charge.id,
      qrCode: charge.source?.scannable_code?.image?.download_uri ?? null,
      status: charge.status,
    })
  } catch (err: unknown) {
    console.error('Omise create charge error:', err)
    return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 })
  }
}
