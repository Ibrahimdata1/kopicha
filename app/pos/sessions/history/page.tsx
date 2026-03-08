'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { CustomerSession, Shop } from '@/lib/types'
import { QRCodeSVG } from 'qrcode.react'
import { buildOrderUrl } from '@/lib/qr'
import { ArrowLeft, ChevronRight, Printer, Search, X } from 'lucide-react'

type HistorySession = CustomerSession & {
  total_amount: number
  order_count: number
}

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  subtotal: number
  item_status: string
  product: { name: string } | null
}

interface OrderDetail {
  id: string
  status: string
  total_amount: number
  created_at: string
  items: OrderItem[]
}

const SESSION_STATUS_LABEL: Record<string, string> = {
  active: 'กำลังใช้งาน',
  paid: 'ชำระแล้ว',
  cancelled: 'ยกเลิก',
}

const SESSION_STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  paid: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'รอรับออเดอร์',
  preparing: 'กำลังทำ',
  ready: 'พร้อมเสิร์ฟ',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  preparing: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  ready: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
}

function fmt(n: number) {
  return '฿' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function SessionHistoryPage() {
  const supabase = createClient()
  const [shop, setShop] = useState<Shop | null>(null)
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(true)
  const [printSession, setPrintSession] = useState<HistorySession | null>(null)
  const [detailSession, setDetailSession] = useState<HistorySession | null>(null)
  const [detailOrders, setDetailOrders] = useState<OrderDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid' | 'cancelled'>('all')
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
      if (p?.shop_id) {
        const { data: s } = await supabase.from('shops').select('*').eq('id', p.shop_id).single()
        setShop(s)
      } else {
        setLoading(false)
      }
    })
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!shop?.id) return
    if (dateFrom > dateTo) {
      setDateError('วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด')
      setSessions([])
      return
    }
    setDateError('')
    setLoading(true)
    try {
      let query = supabase
        .from('customer_sessions')
        .select('*')
        .eq('shop_id', shop.id)
        .gte('created_at', dateFrom + 'T00:00:00')
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: rawSessions } = await query

      if (!rawSessions?.length) {
        setSessions([])
        return
      }

      const sessionIds = rawSessions.map((s) => s.id)
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_session_id, total_amount, status')
        .in('customer_session_id', sessionIds)
        .in('status', ['pending', 'preparing', 'ready', 'completed'])

      const enriched: HistorySession[] = rawSessions.map((s) => {
        const sessionOrders = (orders ?? []).filter((o) => o.customer_session_id === s.id)
        const total = sessionOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
        return { ...s, total_amount: total, order_count: sessionOrders.length }
      })

      setSessions(enriched)
    } catch (err: unknown) {
      console.error('fetchHistory error:', err)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [shop?.id, dateFrom, dateTo, statusFilter])

  useEffect(() => {
    if (shop?.id) fetchHistory()
  }, [shop?.id, fetchHistory])

  const handleOpenDetail = async (session: HistorySession) => {
    setDetailSession(session)
    setDetailOrders([])
    setDetailLoading(true)
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, items:order_items(id, quantity, unit_price, subtotal, item_status, product:products(name))')
        .eq('customer_session_id', session.id)
        .order('created_at', { ascending: true })
      setDetailOrders((data ?? []) as unknown as OrderDetail[])
    } finally {
      setDetailLoading(false)
    }
  }

  const handlePrint = (session: HistorySession, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrintSession(session)
    setTimeout(() => {
      const el = document.getElementById('print-qr')
      if (!el) return
      const w = window.open('', '_blank')
      if (!w) return
      const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c] ?? c))
      const orderUrl = buildOrderUrl(session.id)
      const svgHtml = el.querySelector('svg')?.outerHTML ?? ''
      w.document.write(`<!DOCTYPE html><html><head><title>QR Session</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body { font-family: 'Courier New', monospace; width: 100%; padding: 4mm; text-align: center; background: #fff; color: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
          h2 { font-size: 14pt; font-weight: bold; margin-bottom: 2mm; }
          p { font-size: 9pt; color: #444; margin: 1.5mm 0; }
          .qr-wrap { margin: 6mm auto; display: block; width: 65mm; height: 65mm; }
          .qr-wrap svg { width: 100% !important; height: 100% !important; display: block; }
          .url { font-size: 7pt; word-break: break-all; color: #888; margin-top: 3mm; }
        </style>
        </head><body>
        <h2>${esc(shop?.name ?? '')}</h2>
        <div class="qr-wrap">${svgHtml}</div>
        <p>สแกนเพื่อสั่งและชำระเงิน</p>
        <p class="url">${esc(orderUrl)}</p>
        </body></html>`)
      w.document.close()
      w.print()
      setPrintSession(null)
    }, 150)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <a
          href="/pos/sessions"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ArrowLeft size={18} />
        </a>
        <div>
          <h1 className="page-title">ประวัติ QR Sessions</h1>
          <p className="text-muted text-sm">กดที่รายการเพื่อดูรายละเอียดออเดอร์</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-5 flex flex-wrap gap-3 items-end shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">ตั้งแต่วันที่</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input w-auto text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">ถึงวันที่</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input w-auto text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">สถานะ</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input w-auto text-sm"
          >
            <option value="all">ทั้งหมด</option>
            <option value="active">กำลังใช้งาน</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
        <button
          onClick={fetchHistory}
          className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5"
        >
          <Search size={14} />
          ค้นหา
        </button>
      </div>
      {dateError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-xl border border-red-100 dark:border-red-800/40 mb-4">
          {dateError}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="spinner w-8 h-8 border-[3px]" />
          <p className="text-muted text-sm">กำลังโหลด...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted">ไม่พบ session ในช่วงเวลานี้</div>
      ) : (
        <>
        {sessions.length >= 100 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40 mb-4">
            แสดง 100 รายการล่าสุด — ลองเลือกช่วงเวลาที่สั้นลง
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 shadow-sm overflow-hidden">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleOpenDetail(session)}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {session.table_label ? `โต๊ะ ${session.table_label}` : 'ไม่ระบุโต๊ะ'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SESSION_STATUS_STYLE[session.status]}`}>
                    {SESSION_STATUS_LABEL[session.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{session.id.slice(0, 16)}...</p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(session.created_at).toLocaleString('th-TH')}
                  {session.order_count > 0 && ` · ${session.order_count} ออเดอร์ · ${fmt(session.total_amount)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handlePrint(session, e)}
                  className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  พิมพ์ QR ซ้ำ
                </button>
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500" />
              </div>
            </button>
          ))}
        </div>
        </>
      )}

      {/* Detail Modal */}
      {detailSession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetailSession(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  {detailSession.table_label ? `โต๊ะ ${detailSession.table_label}` : 'ไม่ระบุโต๊ะ'}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(detailSession.created_at).toLocaleString('th-TH')}
                  {' · '}
                  <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${SESSION_STATUS_STYLE[detailSession.status]}`}>
                    {SESSION_STATUS_LABEL[detailSession.status]}
                  </span>
                </p>
              </div>
              <button onClick={() => setDetailSession(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="spinner w-7 h-7 border-[3px]" />
                </div>
              ) : detailOrders.length === 0 ? (
                <p className="text-center text-muted py-10">ไม่มีออเดอร์ใน session นี้</p>
              ) : (
                <div className="space-y-4">
                  {detailOrders.map((order, idx) => {
                    const isCancelled = order.status === 'cancelled'
                    return (
                    <div key={order.id} className={`rounded-xl overflow-hidden border ${isCancelled ? 'border-red-200 dark:border-red-800/40 opacity-70' : 'border-slate-100 dark:border-slate-700/50'}`}>
                      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isCancelled ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50'}`}>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          ออเดอร์ #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">{new Date(order.created_at).toLocaleTimeString('th-TH')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_STYLE[order.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {ORDER_STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </div>
                      </div>
                      <div className={`divide-y ${isCancelled ? 'divide-red-100 dark:divide-red-800/30 bg-red-50/30 dark:bg-red-900/10' : 'divide-slate-100 dark:divide-slate-700/50'}`}>
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-xs font-semibold w-5 shrink-0 ${isCancelled ? 'text-red-400 dark:text-red-500' : 'text-primary-600 dark:text-primary-400'}`}>×{item.quantity}</span>
                              <span className={`text-sm truncate ${isCancelled ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{item.product?.name ?? '-'}</span>
                            </div>
                            <span className={`text-sm shrink-0 ml-2 ${isCancelled ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>{fmt(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      {!isCancelled && (
                        <div className="flex justify-end px-4 py-2.5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fmt(order.total_amount)}</span>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {detailSession.total_amount > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">ยอดรวมทั้งหมด</span>
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{fmt(detailSession.total_amount)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden print element */}
      {printSession && shop && (
        <div id="print-qr" className="hidden">
          <h2>{shop.name}</h2>
          {printSession.table_label && <p>โต๊ะ {printSession.table_label}</p>}
          <div style={{ margin: '16px auto', display: 'inline-block' }}>
            <QRCodeSVG value={buildOrderUrl(printSession.id)} size={200} />
          </div>
          <p>สแกนเพื่อสั่งและชำระเงิน</p>
          <p className="url">{buildOrderUrl(printSession.id)}</p>
        </div>
      )}
    </div>
  )
}
