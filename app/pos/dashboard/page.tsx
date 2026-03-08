'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import { BarChart3, QrCode, Receipt, TrendingUp } from 'lucide-react'

interface Stats {
  totalSales: number
  orderCount: number
  sessionCount: number
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
  const [stats, setStats] = useState<Stats>({ totalSales: 0, orderCount: 0, sessionCount: 0, avgPerOrder: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today')

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

      // End of today (start of tomorrow)
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

      const [{ data: orders }, { data: sessions }] = await Promise.all([
        supabase.from('orders')
          .select('id, total_amount')
          .eq('shop_id', shop.id)
          .eq('status', 'completed')
          .gte('completed_at', startDate.toISOString())
          .lt('completed_at', endDate.toISOString()),
        supabase.from('customer_sessions')
          .select('id')
          .eq('shop_id', shop.id)
          .gte('created_at', startDate.toISOString()),
      ])

      const orderCount = orders?.length ?? 0
      const totalSales = Math.round((orders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0) * 100) / 100
      const avgPerOrder = orderCount > 0 ? Math.round((totalSales / orderCount) * 100) / 100 : 0
      const sessionCount = sessions?.length ?? 0

      setStats({ totalSales, orderCount, sessionCount, avgPerOrder })

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

  const STAT_CARDS = [
    {
      label: 'ยอดขายรวม',
      value: fmt(stats.totalSales),
      Icon: TrendingUp,
      bg: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      iconColor: 'text-green-600 dark:text-green-400',
      valueColor: 'text-green-700 dark:text-green-300',
    },
    {
      label: 'ออเดอร์',
      value: stats.orderCount.toString(),
      Icon: Receipt,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      label: 'QR Sessions',
      value: stats.sessionCount.toString(),
      Icon: QrCode,
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      iconBg: 'bg-primary-100 dark:bg-primary-900/40',
      iconColor: 'text-primary-600 dark:text-primary-400',
      valueColor: 'text-primary-700 dark:text-primary-300',
    },
    {
      label: 'เฉลี่ย/ออเดอร์',
      value: fmt(stats.avgPerOrder),
      Icon: BarChart3,
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      valueColor: 'text-orange-700 dark:text-orange-300',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">สรุปยอด</h1>
        <div className="flex gap-1.5">
          {(['today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                dateRange === r
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                  : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {r === 'today' ? 'วันนี้' : r === 'week' ? '7 วัน' : 'เดือนนี้'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : !shop ? (
        <div className="text-center py-20 text-muted">
          <BarChart3 size={40} strokeWidth={1.5} className="mx-auto mb-3" />
          <p>ไม่พบข้อมูลร้านค้า</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {STAT_CARDS.map(({ label, value, Icon, bg, iconBg, iconColor, valueColor }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 border border-transparent animate-fade-in`}>
                <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={17} className={iconColor} />
                </div>
                <p className={`text-2xl font-bold tracking-tight ${valueColor} mb-0.5`}>{value}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Top Products */}
          {topProducts.length > 0 ? (
            <div className="section-card p-5">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-4 text-sm">สินค้าขายดี (Top 5)</h2>
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.product_id} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 text-xs font-bold flex items-center justify-center shrink-0 border border-primary-100 dark:border-primary-900/50">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-slate-100 truncate text-sm">
                        {product.product_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                        {product.total_qty} ชิ้น
                      </p>
                      <p className="text-xs text-muted">
                        {fmt(product.total_revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-muted">
              <BarChart3 size={36} strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="font-medium text-sm">ยังไม่มียอดขายในช่วงเวลานี้</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
