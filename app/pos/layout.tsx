import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PosNav from '@/components/PosNav'
import { PosProvider } from '@/lib/pos-context'
import SubscriptionGuard from '@/components/SubscriptionGuard'
import OrderNotification from '@/components/OrderNotification'

// Force dynamic rendering — never cache layout data (shop subscription must be fresh)
export const dynamic = 'force-dynamic'

// Pages that cashier cannot access
const CASHIER_BLOCKED = ['/pos/products', '/pos/dashboard']

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile first (needed for shop_id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, shop_id, full_name, email, avatar_url, pending_shop_name, pending_promptpay, created_at')
    .eq('id', user.id)
    .single()

  if (!profile?.role) redirect('/pending')

  // Cashier access guard — redirect to sessions if blocked page
  if (profile.role === 'cashier') {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? ''
    if (CASHIER_BLOCKED.some((p) => pathname.startsWith(p))) {
      redirect('/pos/sessions')
    }
  }

  // Fetch shop in parallel-ready way (non-blocking after profile)
  const shopPromise = profile.shop_id
    ? supabase.from('shops').select('*').eq('id', profile.shop_id).single()
    : null
  const shop = shopPromise ? (await shopPromise).data : null

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950">
      <PosNav profile={profile} />
      <main className="flex-1 overflow-auto">
        <PosProvider profile={profile} shop={shop}>
          {shop && <OrderNotification shopId={shop.id} />}
          {profile.role === 'super_admin' ? children : (
            <SubscriptionGuard shop={shop} role={profile.role}>
              {children}
            </SubscriptionGuard>
          )}
        </PosProvider>
      </main>
    </div>
  )
}
