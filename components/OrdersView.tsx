'use client'

import { useCallback, useEffect, useState } from 'react'
import { Receipt, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { buildOrderUrl } from '@/lib/qr'
import type { OrderWithItems, Profile, Shop } from '@/lib/types'
import SessionDetailModal from '@/components/SessionDetailModal'
import type { SessionWithOrders } from '@/components/SessionsView'

interface Bill {
  id: string
  status: 'active' | 'paid' | 'cancelled'
  table_label: string | null
  created_at: string
  paid_at?: string | null
  cancelled_at?: string | null
  created_by?: string | null
  shop_id: string
  item_count: number
  total_amount: number
}

function fmt(n: number) {
  return '฿' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'เมื่อกี้'
  if (diff < 60) return `${diff} น.`
  if (diff < 1440) return `${Math.floor(diff / 60)} ชม.`
  return `${Math.floor(diff / 1440)} วัน`
}

const BILL_STATUS = {
  active: { label: 'รอชำระเงิน', badge: 'badge badge-yellow', Icon: Clock, dot: 'bg-amber-400' },
  paid: { label: 'ชำระแล้ว', badge: 'badge badge-green', Icon: CheckCircle2, dot: 'bg-emerald-400' },
  cancelled: { label: 'บิลยกเลิก', badge: 'badge badge-red', Icon: XCircle, dot: 'bg-rose-400' },
} as const

type FilterKey = 'all' | 'active' | 'paid' | 'cancelled'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'active', label: 'รอชำระเงิน' },
  { key: 'paid', label: 'ชำระแล้ว' },
  { key: 'cancelled', label: 'บิลยกเลิก' },
]

interface Props {
  shop: Shop
  profile: Profile
}

export default function OrdersView({ shop, profile }: Props) {
  const supabase = createClient()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedBill, setSelectedBill] = useState<SessionWithOrders | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchBills = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('customer_sessions')
        .select('id, shop_id, status, table_label, created_at, paid_at, cancelled_at, created_by')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (filter !== 'all') query = query.eq('status', filter)

      const { data: sessions } = await query
      if (!sessions) { setBills([]); return }

      const sessionIds = sessions.map((s) => s.id)
      if (sessionIds.length === 0) { setBills([]); return }

      const [{ data: orders }, ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, customer_session_id, total_amount, status')
          .in('customer_session_id', sessionIds)
          .not('status', 'eq', 'cancelled'),
      ])

      const orderIds = (orders ?? []).map((o) => o.id)
      const { data: items } = orderIds.length > 0
        ? await supabase.from('order_items').select('id, order_id, item_status').in('order_id', orderIds)
        : { data: [] }

      const billList: Bill[] = sessions.map((s) => {
        const sOrders = (orders ?? []).filter((o) => o.customer_session_id === s.id)
        const total = sOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
        const sItems = (items ?? []).filter((i) =>
          sOrders.some((o) => o.id === i.order_id) && (i.item_status ?? 'active') === 'active'
        )
        return {
          id: s.id,
          shop_id: s.shop_id,
          status: s.status as Bill['status'],
          table_label: s.table_label,
          created_at: s.created_at,
          paid_at: s.paid_at,
          cancelled_at: s.cancelled_at,
          created_by: s.created_by,
          item_count: sItems.length,
          total_amount: total,
        }
      })

      setBills(billList)
    } finally {
      setLoading(false)
    }
  }, [shop.id, filter])

  useEffect(() => { fetchBills() }, [fetchBills])

  const handleBillClick = async (bill: Bill) => {
    setLoadingDetail(true)
    try {
      const { data: rawOrders } = await supabase
        .from('orders')
        .select('*, items:order_items(id, quantity, unit_price, subtotal, item_status, product:products(name)), payment:payments(*)')
        .eq('customer_session_id', bill.id)
        .not('status', 'eq', 'cancelled')

      const orders: OrderWithItems[] = (rawOrders ?? []).map((o: OrderWithItems & { payment: unknown }) => {
        const rawPay = Array.isArray(o.payment) ? (o.payment as unknown[])[0] : o.payment
        return { ...o, payment: rawPay ?? undefined } as OrderWithItems
      })

      const sessionData: SessionWithOrders = {
        id: bill.id,
        shop_id: bill.shop_id,
        table_label: bill.table_label,
        status: bill.status,
        created_by: bill.created_by ?? null,
        created_at: bill.created_at,
        paid_at: bill.paid_at ?? null,
        cancelled_at: bill.cancelled_at ?? null,
        orders,
        total_amount: bill.total_amount,
      }
      setSelectedBill(sessionData)
    } finally {
      setLoadingDetail(false)
    }
  }

  const counts = {
    all: bills.length,
    active: bills.filter((b) => b.status === 'active').length,
    paid: bills.filter((b) => b.status === 'paid').length,
    cancelled: bills.filter((b) => b.status === 'cancelled').length,
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="page-header">
        <h1 className="page-title">บิลทั้งหมด</h1>
        <button onClick={fetchBills} className="btn-secondary px-3 py-1.5 text-sm">↻ รีเฟรช</button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
        {FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === tab.key
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
            {filter !== tab.key && counts[tab.key] > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="spinner" />
        </div>
      ) : bills.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Receipt size={36} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm">ไม่มีบิล</p>
        </div>
      ) : (
        <div className="section-card divide-y divide-slate-50 dark:divide-slate-700/50 animate-fade-in">
          {bills.map((bill) => {
            const statusInfo = BILL_STATUS[bill.status]
            return (
              <button key={bill.id} onClick={() => handleBillClick(bill)} disabled={loadingDetail} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors w-full text-left cursor-pointer">
                <div className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={statusInfo.badge}>{statusInfo.label}</span>
                    {bill.table_label && (
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400">โต๊ะ {bill.table_label}</span>
                    )}
                  </div>
                  <p className="text-xs text-subtle font-mono">{bill.id.slice(0, 8)}... · {timeAgo(bill.created_at)}</p>
                </div>
                <span className="text-xs text-muted shrink-0">
                  {bill.item_count > 0 ? `${bill.item_count} รายการ` : '—'}
                </span>
                <p className={`font-bold text-base shrink-0 ${
                  bill.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' :
                  bill.status === 'cancelled' ? 'text-slate-400' :
                  'text-slate-900 dark:text-slate-100'
                }`}>
                  {fmt(bill.total_amount)}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {selectedBill && (
        <SessionDetailModal
          session={selectedBill}
          shop={shop}
          profile={profile}
          orderUrl={buildOrderUrl(selectedBill.id)}
          onClose={() => setSelectedBill(null)}
          onRefresh={() => { setSelectedBill(null); fetchBills() }}
        />
      )}
    </div>
  )
}
