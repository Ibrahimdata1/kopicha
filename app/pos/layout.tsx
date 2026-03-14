import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PosNav from '@/components/PosNav'
import { PosProvider } from '@/lib/pos-context'
import SubscriptionGuard from '@/components/SubscriptionGuard'
import OrderNotification from '@/components/OrderNotification'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile first (needed for shop_id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.role) redirect('/pending')

  // Fetch shop in parallel-ready way (non-blocking after profile)
  const shopPromise = profile.shop_id
    ? supabase.from('shops').select('*').eq('id', profile.shop_id).single()
    : null
  const shop = shopPromise ? (await shopPromise).data : null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <PosNav profile={profile} />
      <main className="flex-1 overflow-auto">
        <PosProvider profile={profile} shop={shop}>
          {shop && <OrderNotification shopId={shop.id} />}
          {profile.role === 'super_admin' ? children : (
            <SubscriptionGuard shop={shop}>
              {children}
            </SubscriptionGuard>
          )}
        </PosProvider>
      </main>
    </div>
  )
}
