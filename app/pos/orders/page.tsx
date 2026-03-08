'use client'

import { usePosContext } from '@/lib/pos-context'
import OrdersView from '@/components/OrdersView'

export default function OrdersPage() {
  const { shop } = usePosContext()

  if (!shop) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted">ไม่พบข้อมูลร้านค้า</p>
      </div>
    )
  }

  return <OrdersView shop={shop} />
}
