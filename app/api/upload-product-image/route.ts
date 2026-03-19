import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verify user is authenticated
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user has a shop (owner/cashier)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, shop_id')
    .eq('id', user.id)
    .single()
  if (!profile?.shop_id) return NextResponse.json({ error: 'No shop found' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ GIF เท่านั้น' }, { status: 400 })
  }

  // Validate file size (5 MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'ขนาดไฟล์ต้องไม่เกิน 5 MB' }, { status: 400 })
  }

  // Upload via admin client (bypasses RLS)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${profile.shop_id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('product-images')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('product-images')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
