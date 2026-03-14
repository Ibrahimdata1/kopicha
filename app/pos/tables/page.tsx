'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import { buildOrderUrl } from '@/lib/qr'
import type { OrderWithItems, CustomerSession } from '@/lib/types'
import type { SessionWithOrders } from '@/components/SessionsView'
import { useConfirm } from '@/components/ConfirmDialog'

const SessionDetailModal = dynamic(() => import('@/components/SessionDetailModal'), { ssr: false })
import {
  ArrowRightLeft,
  Grid3X3,
  Users,
  X,
} from 'lucide-react'

interface TableData {
  key: string
  label: string
  session: (CustomerSession & { orders: OrderWithItems[]; total_amount: number }) | null
  status: 'available' | 'occupied'
}

function fmt(n: number | null | undefined) {
  return '฿' + (n ?? 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + time
}

export default function TablesPage() {
  const supabase = createClient()
  const { profile, shop } = usePosContext()
  const { confirm, ConfirmDialogUI } = useConfirm()
  const [tables, setTables] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)
  const [movingFrom, setMovingFrom] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionWithOrders | null>(null)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [creatingTable, setCreatingTable] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const tableCount = shop?.table_count ?? 0

  const fetchTables = useCallback(async () => {
    if (!shop?.id || tableCount === 0) { setLoading(false); return }

    try {
      // Fetch active sessions for this shop
      const { data: sessions } = await supabase
        .from('customer_sessions')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('status', 'active')

      const sessionIds = (sessions ?? []).map((s) => s.id)
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

      // Map sessions by table_label
      type SessionEnriched = CustomerSession & { orders: OrderWithItems[]; total_amount: number }
      const sessionByTable = new Map<string, SessionEnriched>()
      for (const s of (sessions ?? []) as CustomerSession[]) {
        if (s.table_label) {
          const sessionOrders = orders.filter((o) => o.customer_session_id === s.id)
          // Calculate total from active items (not orders.total_amount) so it's always accurate even during partial updates
          const total = sessionOrders.reduce((sum, o) => {
            const activeItems = (o.items ?? []).filter((i) => (i.item_status ?? 'active') === 'active')
            return sum + activeItems.reduce((s2, i) => s2 + Number(i.subtotal), 0)
          }, 0)
          sessionByTable.set(s.table_label, { ...s, orders: sessionOrders, total_amount: total })
        }
      }

      // Build table grid
      const tableData: TableData[] = Array.from({ length: tableCount }, (_, i) => {
        const key = String(i + 1)
        const session = sessionByTable.get(key) ?? null
        return {
          key,
          label: key,
          session,
          status: session ? 'occupied' : 'available',
        }
      })

      setTables(tableData)
    } finally {
      setLoading(false)
    }
  }, [shop?.id, tableCount])

  useEffect(() => { fetchTables() }, [fetchTables])

  // Realtime — delay refetch slightly so DB updates have time to propagate
  useEffect(() => {
    if (!shop?.id) return
    let timeout: ReturnType<typeof setTimeout> | null = null
    const debouncedFetch = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(fetchTables, 500)
    }
    channelRef.current = supabase
      .channel(`tables:${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shop.id}` }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_sessions', filter: `shop_id=eq.${shop.id}` }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, debouncedFetch)
      .subscribe()
    return () => { if (timeout) clearTimeout(timeout); channelRef.current?.unsubscribe() }
  }, [shop?.id, fetchTables])

  // Polling fallback — Realtime may miss order_items events (no filter support)
  useEffect(() => {
    if (!shop?.id || tableCount === 0) return
    const interval = setInterval(fetchTables, 5000)
    return () => clearInterval(interval)
  }, [shop?.id, tableCount, fetchTables])

  // Auto-open newly created session (don't auto-update selectedSession from tables — modal manages its own state)
  useEffect(() => {
    if (pendingSessionId) {
      const table = tables.find((t) => t.session?.id === pendingSessionId)
      if (table?.session) {
        setSelectedSession(table.session)
        setPendingSessionId(null)
      }
    }
  }, [tables])

  const handleTableClick = (table: TableData) => {
    // Move mode
    if (movingFrom) {
      if (table.key === movingFrom) {
        setMovingFrom(null) // cancel
        return
      }
      if (table.status === 'occupied') {
        setToast(`โต๊ะ ${table.label} ไม่ว่าง — ย้ายได้เฉพาะโต๊ะว่าง`)
        setTimeout(() => setToast(''), 2500)
        return
      }
      handleMoveTable(table.key)
      return
    }

    // Normal mode
    if (table.session) {
      setSelectedSession(table.session)
    } else {
      // Create session directly for this table
      handleCreateSession(table.key)
    }
  }

  const handleCreateSession = async (tableKey: string) => {
    if (!shop?.id || creatingTable) return
    const ok = await confirm({
      title: `เปิดโต๊ะ ${tableKey}`,
      message: 'สร้างบิลใหม่และ QR Code สำหรับโต๊ะนี้?',
      confirmLabel: 'เปิดโต๊ะ',
    })
    if (!ok) return
    setCreatingTable(tableKey)
    try {
      const { data, error } = await supabase
        .from('customer_sessions')
        .insert({
          shop_id: shop.id,
          table_label: tableKey,
          status: 'active',
          created_by: profile?.id ?? null,
        })
        .select()
        .single()

      if (error) throw error
      setPendingSessionId(data.id)
      await fetchTables()
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : 'สร้างบิลไม่ได้')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setCreatingTable(null)
    }
  }

  const handleMoveTable = async (targetKey: string) => {
    if (!movingFrom || !shop?.id) return
    const sourceTable = tables.find((t) => t.key === movingFrom)
    if (!sourceTable?.session) return

    setIsMoving(true)
    try {
      // Update session table_label
      await supabase
        .from('customer_sessions')
        .update({ table_label: targetKey })
        .eq('id', sourceTable.session.id)

      // Update all active orders' table_number
      const activeOrderIds = sourceTable.session.orders
        .filter((o) => !['cancelled', 'completed'].includes(o.status))
        .map((o) => o.id)

      if (activeOrderIds.length > 0) {
        await supabase
          .from('orders')
          .update({ table_number: targetKey })
          .in('id', activeOrderIds)
      }

      setMovingFrom(null)
      setToast(`ย้ายจากโต๊ะ ${movingFrom} ไปโต๊ะ ${targetKey} สำเร็จ`)
      setTimeout(() => setToast(''), 2500)
      await fetchTables()
    } catch {
      setToast('ย้ายโต๊ะไม่ได้ ลองใหม่')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setIsMoving(false)
    }
  }

  if (!shop) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted">ไม่มีข้อมูลร้านค้า</p>
      </div>
    )
  }

  if (tableCount === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Grid3X3 size={30} className="text-slate-300 dark:text-slate-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">ยังไม่ได้ตั้งจำนวนโต๊ะ</h2>
        <p className="text-muted text-sm mb-6">ไปตั้งค่าจำนวนโต๊ะก่อนเพื่อใช้ระบบจัดการโต๊ะ</p>
        <a href="/pos/settings" className="btn-primary px-6 py-2.5 text-sm">ไปตั้งค่า</a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 border-[3px]" />
      </div>
    )
  }

  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const availableCount = tables.filter((t) => t.status === 'available').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Grid3X3 size={20} className="text-subtle" />
            จัดการโต๊ะ
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-muted">ว่าง {availableCount}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-muted">ไม่ว่าง {occupiedCount}</span>
            </span>
          </div>
        </div>
        {movingFrom && (
          <button
            onClick={() => setMovingFrom(null)}
            className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
          >
            <X size={14} />
            ยกเลิกย้าย
          </button>
        )}
      </div>

      {/* Move mode banner */}
      {movingFrom && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 animate-fade-in">
          <ArrowRightLeft size={16} />
          <span className="font-medium">เลือกโต๊ะว่างที่ต้องการย้ายไป</span>
          <span className="text-blue-500 dark:text-blue-400">จากโต๊ะ {movingFrom}</span>
        </div>
      )}

      {/* Table Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {tables.map((table) => {
          const isSource = movingFrom === table.key
          const isAvailableTarget = movingFrom && !isSource && table.status === 'available'
          const isOccupiedBlocked = movingFrom && !isSource && table.status === 'occupied'

          return (
            <button
              key={table.key}
              onClick={() => handleTableClick(table)}
              disabled={isMoving || creatingTable === table.key}
              className={`
                relative rounded-2xl border-2 p-4 text-left transition-all duration-200 min-h-[120px] flex flex-col justify-between
                ${isSource
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30 shadow-lg'
                  : isAvailableTarget
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:shadow-lg hover:border-emerald-500 cursor-pointer animate-pulse-subtle'
                  : isOccupiedBlocked
                  ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed'
                  : table.status === 'occupied'
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 hover:shadow-md hover:border-amber-400 cursor-pointer'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer'
                }
              `}
            >
              {/* Table number */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold ${
                  table.status === 'occupied'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-gray-300 dark:text-slate-600'
                }`}>
                  {table.label}
                </span>
                {table.status === 'occupied' && !movingFrom && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMovingFrom(table.key) }}
                    className="p-2.5 -m-1 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="ย้ายโต๊ะ"
                  >
                    <ArrowRightLeft size={18} />
                  </button>
                )}
              </div>

              {/* Status */}
              {table.status === 'occupied' && table.session ? (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Users size={12} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">ไม่ว่าง</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {(() => {
                      const sub = table.session!.total_amount
                      const dAmt = table.session!.discount_type === 'percent'
                        ? Math.round(sub * (table.session!.discount_amount ?? 0) / 100)
                        : (table.session!.discount_amount ?? 0)
                      return dAmt > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs line-through text-muted font-normal">{fmt(sub)}</span>
                          {fmt(Math.max(0, sub - dAmt))}
                        </span>
                      ) : fmt(sub)
                    })()}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {table.session.orders.reduce((s, o) => s + (o.items ?? []).filter((i) => (i.item_status ?? 'active') === 'active').length, 0)} รายการ · {fmtTime(table.session.created_at)}
                  </p>
                </div>
              ) : isAvailableTarget ? (
                <div className="flex items-center gap-1.5">
                  <ArrowRightLeft size={13} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">ย้ายมาที่นี่</span>
                </div>
              ) : creatingTable === table.key ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-primary-500 font-medium">กำลังสร้าง...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-muted">ว่าง</span>
                </div>
              )}

              {isSource && (
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-blue-500/10">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow">
                    กำลังย้าย...
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {ConfirmDialogUI}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Session detail modal */}
      {selectedSession && shop && profile && (
        <SessionDetailModal
          session={selectedSession}
          shop={shop}
          profile={profile}
          orderUrl={buildOrderUrl(selectedSession.id)}
          onClose={() => setSelectedSession(null)}
          onRefresh={fetchTables}
        />
      )}
    </div>
  )
}
