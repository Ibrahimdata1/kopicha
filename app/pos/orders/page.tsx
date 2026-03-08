import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import OrdersView from '@/components/OrdersView'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()

  if (!profile?.shop_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted">ไม่พบข้อมูลร้านค้า</p>
      </div>
    )
  }

  const { data: shop } = await supabase.from('shops').select('*').eq('id', profile.shop_id).single()
  if (!shop) redirect('/pos/settings')

  return <OrdersView shop={shop} />
}
