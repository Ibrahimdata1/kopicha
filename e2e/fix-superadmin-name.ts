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
  if (authErr) { console.log('❌ Login failed:', authErr.message); return }
  console.log('✅ Logged in as:', auth.user?.email)

  // Try updating full_name via profiles table
  const { error: err1 } = await supabase
    .from('profiles')
    .update({ full_name: 'Super Admin' })
    .eq('id', auth.user!.id)

  if (err1) {
    console.log('❌ profiles update failed:', err1.message)

    // Try via auth.updateUser metadata
    const { error: err2 } = await supabase.auth.updateUser({
      data: { full_name: 'Super Admin' }
    })
    if (err2) {
      console.log('❌ auth update failed:', err2.message)
      console.log('💡 ต้องไปแก้ใน Supabase Dashboard:')
      console.log('   → profiles → superadmin@admin.com → full_name = "Super Admin"')
    } else {
      console.log('✅ Updated via auth metadata')
    }
  } else {
    console.log('✅ full_name changed to "Super Admin"')
  }

  // Verify
  const { data: p } = await supabase
    .from('profiles')
    .select('email, full_name, role, shop_id')
    .eq('id', auth.user!.id)
    .single()
  console.log('📋 Profile:', JSON.stringify(p, null, 2))
}
main()
