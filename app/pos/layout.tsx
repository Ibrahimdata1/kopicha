import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PosNav from '@/components/PosNav'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, shop_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.role) redirect('/pending')

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <PosNav profile={profile} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
