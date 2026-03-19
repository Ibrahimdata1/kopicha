import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ available: false, reason: 'กรุณากรอกอีเมล' })
    }

    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return NextResponse.json({ available: false, reason: 'รูปแบบอีเมลไม่ถูกต้อง' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Check profiles table
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', clean)
      .limit(1)

    if (profiles && profiles.length > 0) {
      return NextResponse.json({ available: false, reason: 'อีเมลนี้ถูกใช้แล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ' })
    }

    return NextResponse.json({ available: true })
  } catch {
    return NextResponse.json({ available: true }) // fail open — let signUp catch it
  }
}
