'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import { Banknote, BarChart3, Receipt, TrendingUp } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface Stats {
  totalSales: number
  orderCount: number
  cashTotal: number
  transferTotal: number
  avgPerOrder: number
}

interface TopProduct {
  product_id: string
  product_name: string
  total_qty: number
  total_revenue: number
}

function fmt(n: number) {
  return '฿' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function DashboardPage() {
  const supabase = createClient()
  const { shop } = usePosContext()
  const [stats, setStats] = useState<Stats>({ totalSales: 0, orderCount: 0, cashTotal: 0, transferTotal: 0, avgPerOrder: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today')
  const { t } = useI18n()

  const fetchStats = useCallback(async () => {
    if (!shop?.id) return
    setLoading(true)
    try {
      const now = new Date()
      let startDate: Date

      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (dateRange === 'week') {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

      const { data: orders } = await supabase.from('orders')
        .select('id, total_amount')
        .eq('shop_id', shop.id)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lt('completed_at', endDate.toISOString())

      const orderCount = orders?.length ?? 0
      const totalSales = Math.round((orders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0) * 100) / 100
      const avgPerOrder = orderCount > 0 ? Math.round((totalSales / orderCount) * 100) / 100 : 0

      let cashTotal = 0
      let transferTotal = 0
      if (orderCount > 0 && orders) {
        const orderIds = orders.map((o) => o.id)
        const { data: payments } = await supabase.from('payments')
          .select('method, amount')
          .in('order_id', orderIds)
          .eq('status', 'success')

        for (const p of payments ?? []) {
          if (p.method === 'cash') cashTotal += Number(p.amount ?? 0)
          else transferTotal += Number(p.amount ?? 0)
        }
      }

      setStats({ totalSales, orderCount, cashTotal: Math.round(cashTotal * 100) / 100, transferTotal: Math.round(transferTotal * 100) / 100, avgPerOrder })

      if (orderCount > 0 && orders) {
        const orderIds = orders.map((o) => o.id)
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity, subtotal, products(name)')
          .in('order_id', orderIds)
          .eq('item_status' as 'item_status', 'active')

        const productMap = new Map<string, TopProduct>()
        for (const item of items ?? []) {
          const raw = item.products as unknown
          const name = (raw && typeof raw === 'object' && !Array.isArray(raw))
            ? (raw as { name: string }).name
            : 'ไม่ทราบชื่อ'
          if (productMap.has(item.product_id)) {
            const existing = productMap.get(item.product_id)!
            existing.total_qty += item.quantity
            existing.total_revenue += item.subtotal
          } else {
            productMap.set(item.product_id, {
              product_id: item.product_id,
              product_name: name,
              total_qty: item.quantity,
              total_revenue: item.subtotal,
            })
          }
        }
        setTopProducts(
          Array.from(productMap.values())
            .sort((a, b) => b.total_qty - a.total_qty)
            .slice(0, 5)
        )
      } else {
        setTopProducts([])
      }
    } catch (err: unknown) {
      console.error('fetchStats error:', err)
    } finally {
      setLoading(false)
    }
  }, [shop?.id, dateRange])

  useEffect(() => { if (shop?.id) fetchStats() }, [shop?.id, fetchStats])

  const STAT_CARDS: { label: string; value: string; Icon: typeof TrendingUp; color: string; small?: boolean }[] = [
    { label: t('dashboard.totalSales'), value: fmt(stats.totalSales), Icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('dashboard.orders'), value: stats.orderCount.toString(), Icon: Receipt, color: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.cashTransfer'), value: `${fmt(stats.cashTotal)} / ${fmt(stats.transferTotal)}`, Icon: Banknote, color: 'text-primary-600 dark:text-primary-400', small: true },
    { label: t('dashboard.avgOrder'), value: fmt(stats.avgPerOrder), Icon: BarChart3, color: 'text-amber-600 dark:text-amber-400' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <div className="flex gap-px bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5">
          {(['today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dateRange === r
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'
              }`}
            >
              {r === 'today' ? t('dashboard.today') : r === 'week' ? t('dashboard.week') : t('dashboard.month')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2.5 }} />
        </div>
      ) : !shop ? (
        <div className="text-center py-20 text-muted">
          <BarChart3 size={32} strokeWidth={1.5} className="mx-auto mb-3" />
          <p className="text-sm">{t('dashboard.noShop')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {STAT_CARDS.map(({ label, value, Icon, color, small }) => (
              <div key={label} className="stat-card">
                <Icon size={16} className={`${color} mb-3`} />
                <p className={`${small ? 'text-base' : 'text-2xl'} font-display font-bold text-stone-900 dark:text-stone-100 mb-0.5`}>{value}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
              </div>
            ))}
          </div>

          {topProducts.length > 0 ? (
            <div className="section-card">
              <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
                <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">{t('dashboard.topProducts')}</h2>
              </div>
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {topProducts.map((product, index) => {
                  const maxQty = topProducts[0]?.total_qty || 1
                  const percent = (product.total_qty / maxQty) * 100
                  return (
                    <div key={product.product_id} className="px-5 py-3 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 text-xs font-medium flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm text-stone-900 dark:text-stone-100 truncate">{product.product_name}</p>
                          <div className="text-right shrink-0 ml-3">
                            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{product.total_qty} {t('common.pcs')}</span>
                            <span className="text-xs text-stone-400 ml-2">{fmt(product.total_revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-muted">
              <BarChart3 size={28} strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-sm">{t('dashboard.noSales')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
