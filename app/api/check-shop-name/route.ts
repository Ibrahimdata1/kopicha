import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ available: false, reason: 'กรุณากรอกชื่อร้าน' })
    }

    const clean = name.trim()
    if (clean.length < 2) {
      return NextResponse.json({ available: false, reason: 'ชื่อร้านสั้นเกินไป' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: shops } = await supabase
      .from('shops')
      .select('id')
      .ilike('name', clean)
      .eq('is_deleted', false)
      .limit(1)

    if (shops && shops.length > 0) {
      return NextResponse.json({ available: false, reason: 'ชื่อร้านนี้มีอยู่แล้วในระบบ' })
    }

    return NextResponse.json({ available: true })
  } catch {
    return NextResponse.json({ available: true })
  }
}
