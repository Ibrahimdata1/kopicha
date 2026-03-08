'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { CustomerSession, Shop } from '@/lib/types'
import { QRCodeSVG } from 'qrcode.react'
import { buildOrderUrl } from '@/lib/qr'
import { ArrowLeft, Printer, Search } from 'lucide-react'

type HistorySession = CustomerSession & {
  total_amount: number
  order_count: number
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

function fmt(n: number) {
  return '฿' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function SessionHistoryPage() {
  const supabase = createClient()
  const [shop, setShop] = useState<Shop | null>(null)
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(true)
  const [printSession, setPrintSession] = useState<HistorySession | null>(null)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid' | 'cancelled'>('all')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
      if (p?.shop_id) {
        const { data: s } = await supabase.from('shops').select('*').eq('id', p.shop_id).single()
        setShop(s)
      }
    })
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!shop?.id) return
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

      // Fetch order totals for each session
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
    } finally {
      setLoading(false)
    }
  }, [shop?.id, dateFrom, dateTo, statusFilter])

  useEffect(() => {
    if (shop?.id) fetchHistory()
  }, [shop?.id, fetchHistory])

  const handlePrint = (session: HistorySession) => {
    setPrintSession(session)
    setTimeout(() => {
      const el = document.getElementById('print-qr')
      if (!el) return
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(`<html><head><title>QR Session</title>
        <style>body{font-family:sans-serif;padding:20px;text-align:center;}
        h2{font-size:18px;margin:4px 0;}p{font-size:12px;color:#555;margin:2px 0;}
        .url{font-size:10px;word-break:break-all;color:#888;margin-top:8px;}</style>
        </head><body>${el.innerHTML}</body></html>`)
      w.document.close()
      w.print()
    }, 100)
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
          <p className="text-muted text-sm">ดูและพิมพ์ QR code ซ้ำสำหรับ session ที่ผ่านมา</p>
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

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="spinner w-8 h-8 border-[3px]" />
          <p className="text-muted text-sm">กำลังโหลด...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted">ไม่พบ session ในช่วงเวลานี้</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 shadow-sm overflow-hidden">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
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
              <button
                onClick={() => handlePrint(session)}
                className="btn-secondary shrink-0 px-3 py-2 text-sm flex items-center gap-1.5"
              >
                <Printer size={14} />
                พิมพ์ QR ซ้ำ
              </button>
            </div>
          ))}
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
