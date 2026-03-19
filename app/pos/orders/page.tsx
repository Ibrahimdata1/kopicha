'use client'

import { usePosContext } from '@/lib/pos-context'
import OrdersView from '@/components/OrdersView'
import { useI18n } from '@/lib/i18n/context'

export default function OrdersPage() {
  const { shop, profile } = usePosContext()
  const { t } = useI18n()

  if (!shop) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted">{t('orders.noShop')}</p>
      </div>
    )
  }

  return <OrdersView shop={shop} profile={profile} />
}
