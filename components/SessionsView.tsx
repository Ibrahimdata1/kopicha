'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import type { CustomerSession, OrderWithItems, Profile, Shop } from '@/lib/types'
import GenerateSessionModal from '@/components/GenerateSessionModal'
import SessionDetailModal from '@/components/SessionDetailModal'
import { buildOrderUrl } from '@/lib/qr'

export type SessionWithOrders = CustomerSession & {
  orders: OrderWithItems[]
  total_amount: number
}

function fmt(n: number | null | undefined) {
  return '฿' + (n ?? 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'เมื่อกี้'
  if (diff < 60) return `${diff} นาที`
  return `${Math.floor(diff / 60)} ชม.`
}

const BILL_STATUS = {
  active: { label: 'รอชำระเงิน', badge: 'badge badge-yellow', border: 'border-l-amber-400' },
  paid: { label: 'ชำระแล้ว', badge: 'badge badge-green', border: 'border-l-emerald-400' },
  cancelled: { label: 'บิลยกเลิก', badge: 'badge badge-red', border: 'border-l-rose-400' },
} as const

interface Props {
  shop: Shop
  profile: Profile
}

export default function SessionsView({ shop, profile }: Props) {
  const supabase = createClient()
  const [sessions, setSessions] = useState<SessionWithOrders[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionWithOrders | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const { data: rawSessions } = await supabase
        .from('customer_sessions')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!rawSessions) return

      const sessionIds = rawSessions.map((s) => s.id)
      let orders: OrderWithItems[] = []

      if (sessionIds.length > 0) {
        const { data: rawOrders } = await supabase
          .from('orders')
          .select('*, items:order_items(id, quantity, unit_price, subtotal, item_status, product:products(name)), payment:payments(*)')
          .in('customer_session_id', sessionIds)
          .not('status', 'eq', 'cancelled')

        orders = (rawOrders ?? []).map((o: OrderWithItems & { payment: unknown }) => {
          const rawPay = Array.isArray(o.payment) ? (o.payment as unknown[])[0] : o.payment
          return { ...o, payment: rawPay ?? undefined } as OrderWithItems
        })
      }

      const enriched: SessionWithOrders[] = rawSessions.map((s) => {
        const sessionOrders = orders.filter((o) => o.customer_session_id === s.id)
        const total = sessionOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
        return { ...s, orders: sessionOrders, total_amount: total }
      })

      setSessions(enriched)
    } finally {
      setLoading(false)
    }
  }, [shop.id])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  useEffect(() => {
    channelRef.current = supabase
      .channel(`sessions:${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shop.id}` }, fetchSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_sessions', filter: `shop_id=eq.${shop.id}` }, fetchSessions)
      .subscribe()
    return () => { channelRef.current?.unsubscribe() }
  }, [shop.id, fetchSessions])

  useEffect(() => {
    if (selectedSession) {
      const updated = sessions.find((s) => s.id === selectedSession.id)
      if (updated) setSelectedSession(updated)
    }
  }, [sessions])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">บิลที่เปิดอยู่</h1>
          <p className="text-sm text-muted mt-0.5">
            {sessions.length > 0 ? `${sessions.length} บิลที่รอชำระเงิน` : 'ยังไม่มีบิลที่เปิดอยู่'}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/pos/sessions/history" className="btn-secondary px-4 py-2 text-sm">ประวัติ</a>
          <button onClick={() => setShowGenerate(true)} className="btn-primary px-4 py-2 text-sm">+ บิลใหม่</button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt size={26} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">ยังไม่มีบิลที่เปิดอยู่</p>
          <p className="text-sm text-muted mt-1">กดปุ่ม &quot;บิลใหม่&quot; เพื่อสร้าง QR ให้ลูกค้า</p>
          <button onClick={() => setShowGenerate(true)} className="btn-primary mt-6 px-6 py-2.5 text-sm">+ บิลใหม่</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sessions.map((session) => {
            const status = BILL_STATUS[session.status as keyof typeof BILL_STATUS] ?? BILL_STATUS.active
            const itemCount = session.orders.reduce(
              (sum, o) => sum + (o.items ?? []).filter((i) => (i.item_status ?? 'active') === 'active').length, 0
            )
            return (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 border border-slate-200 dark:border-slate-700 ${status.border} p-5 text-left hover:shadow-card-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 w-full animate-fade-in shadow-card group`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={status.badge}>{status.label}</span>
                  <span className="text-xs text-subtle">{timeAgo(session.created_at)}</span>
                </div>
                {session.table_label && (
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-1">
                    โต๊ะ {session.table_label}
                  </p>
                )}
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">
                  {fmt(session.total_amount)}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">{itemCount > 0 ? `${itemCount} รายการ` : 'ยังไม่มีรายการ'}</p>
                  <p className="text-xs text-subtle font-mono">{session.id.slice(0, 6)}...</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showGenerate && (
        <GenerateSessionModal
          shop={shop}
          profile={profile}
          onClose={() => setShowGenerate(false)}
          onCreated={(session) => {
            const newSession: SessionWithOrders = { ...session, orders: [], total_amount: 0 }
            setSessions((prev) => [newSession, ...prev])
            setShowGenerate(false)
            setSelectedSession(newSession)
          }}
        />
      )}

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          shop={shop}
          profile={profile}
          orderUrl={buildOrderUrl(selectedSession.id)}
          onClose={() => setSelectedSession(null)}
          onRefresh={fetchSessions}
        />
      )}
    </div>
  )
}
