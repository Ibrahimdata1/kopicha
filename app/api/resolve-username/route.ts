import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'missing username' }, { status: 400 })
    }

    const clean = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      return NextResponse.json({ error: 'invalid username' }, { status: 400 })
    }

    // Use service role to bypass RLS and find the cashier's fake email
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Fake email pattern: username@{shopId8}.cashier
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .like('email', `${clean}@%.cashier`)
      .limit(1)
      .single()

    if (!data?.email) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    return NextResponse.json({ email: data.email })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
