import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PosNav from '@/components/PosNav'
import { PosProvider } from '@/lib/pos-context'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.role) redirect('/pending')

  const shop = profile.shop_id
    ? (await supabase.from('shops').select('*').eq('id', profile.shop_id).single()).data
    : null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <PosNav profile={profile} />
      <main className="flex-1 overflow-auto">
        <PosProvider profile={profile} shop={shop}>
          {children}
        </PosProvider>
      </main>
    </div>
  )
}
