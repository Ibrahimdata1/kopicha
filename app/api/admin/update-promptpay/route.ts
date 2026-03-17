import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verify user is super_admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { promptpay } = await req.json()
  if (!promptpay || typeof promptpay !== 'string') {
    return NextResponse.json({ error: 'กรุณากรอก PromptPay' }, { status: 400 })
  }

  const digits = promptpay.replace(/\D/g, '')
  if (digits.length !== 10 && digits.length !== 13) {
    return NextResponse.json({ error: 'PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขนิติบุคคล 13 หลัก' }, { status: 400 })
  }

  // Use service role to bypass RLS
  const serviceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceRole
    .from('profiles')
    .update({ pending_promptpay: promptpay.trim() })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
