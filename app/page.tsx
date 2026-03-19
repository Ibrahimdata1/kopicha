import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import LandingContent from '@/components/LandingContent'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Only redirect if user has a role — otherwise let them see the landing page
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'super_admin') redirect('/pos/admin')
    if (profile?.role) redirect('/pos/sessions')
    // role = null → show landing page (user can go to /register/shop to complete)
  }

  return <LandingContent />
}
