import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nooljfpynicvckfbsaba.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb2xqZnB5bmljdmNrZmJzYWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTQxNTYsImV4cCI6MjA4ODQ3MDE1Nn0.o9H5czaqY2_car1hIXYcHk_PEkedad2n6tQ53-dtLYs'

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Login as super admin
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@admin.com',
    password: 'admin123',
  })

  if (authErr) {
    console.log('❌ Login failed:', authErr.message)
    return
  }

  console.log('✅ Logged in as:', auth.user?.email)

  // Check current profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, shop_id')
    .eq('id', auth.user!.id)
    .single()

  if (profileErr) {
    console.log('❌ Profile fetch error:', profileErr.message)
    return
  }

  console.log('📋 Current profile:', JSON.stringify(profile, null, 2))

  if (!profile.shop_id) {
    console.log('✅ shop_id is already null — no fix needed')
    return
  }

  // Remove shop_id from super admin
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ shop_id: null })
    .eq('id', auth.user!.id)

  if (updateErr) {
    console.log('❌ Update failed:', updateErr.message)
    console.log('💡 ต้องไปแก้ใน Supabase Dashboard แทน:')
    console.log('   → Table Editor → profiles → หา superadmin@admin.com → ลบ shop_id เป็น null')
    return
  }

  console.log('✅ Fixed! shop_id set to null for super admin')

  // Verify
  const { data: verify } = await supabase
    .from('profiles')
    .select('id, email, role, shop_id')
    .eq('id', auth.user!.id)
    .single()

  console.log('📋 After fix:', JSON.stringify(verify, null, 2))
}

main()
