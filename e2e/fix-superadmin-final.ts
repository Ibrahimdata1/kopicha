import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nooljfpynicvckfbsaba.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb2xqZnB5bmljdmNrZmJzYWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg5NDE1NiwiZXhwIjoyMDg4NDcwMTU2fQ.5amM0Q7huBUJ5rDmgSo9oWI27OibirwEYj_dKvJ1sSs'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Find super admin profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, shop_id')
    .eq('email', 'superadmin@admin.com')
    .single()

  if (error || !profile) { console.log('❌ Not found:', error?.message); return }
  console.log('📋 Before:', JSON.stringify(profile, null, 2))

  // Fix: remove shop_id + set name
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ shop_id: null, full_name: 'Super Admin' })
    .eq('id', profile.id)

  if (updateErr) { console.log('❌ Update failed:', updateErr.message); return }

  // Verify
  const { data: after } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, shop_id')
    .eq('id', profile.id)
    .single()

  console.log('✅ After:', JSON.stringify(after, null, 2))
}
main()
