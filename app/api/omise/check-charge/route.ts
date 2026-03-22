import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const Omise = require('omise')

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { chargeId } = await req.json()
    if (!chargeId || typeof chargeId !== 'string' || !chargeId.startsWith('chrg_')) {
      return NextResponse.json({ error: 'Invalid charge ID' }, { status: 400 })
    }

    const secretKey = process.env.OMISE_SECRET_KEY
    if (!secretKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

    const omise = Omise({ secretKey })
    const charge = await omise.charges.retrieve(chargeId)

    // Only return status — don't leak other charge details
    return NextResponse.json({
      status: charge.status, // pending, successful, failed, expired, reversed
    })
  } catch {
    return NextResponse.json({ error: 'Failed to check charge' }, { status: 500 })
  }
}
