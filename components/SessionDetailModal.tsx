'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, X, Banknote, ArrowRightLeft, XCircle, CheckCircle2, MapPin, ReceiptText, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import type { Profile, Shop } from '@/lib/types'
import type { SessionWithOrders } from '@/components/SessionsView'
import { useConfirm } from '@/components/ConfirmDialog'

interface Props {
  session: SessionWithOrders
  shop: Shop
  profile: Profile | null
  orderUrl: string
  onClose: () => void
  onRefresh: () => void
}

function fmt(n: number | null | undefined) {
  return '฿' + (n ?? 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const BILL_STATUS = {
  active: { label: 'รอชำระเงิน', badge: 'badge badge-yellow' },
  paid: { label: 'ชำระแล้ว', badge: 'badge badge-green' },
  cancelled: { label: 'บิลยกเลิก', badge: 'badge badge-red' },
} as const

export default function SessionDetailModal({ session: initialSession, shop, profile, orderUrl, onClose, onRefresh }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [cashInput, setCashInput] = useState('')
  const [showCash, setShowCash] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [cancellingItem, setCancellingItem] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showChangeTable, setShowChangeTable] = useState(false)
  const [newTableLabel, setNewTableLabel] = useState('')
  const [paidSuccess, setPaidSuccess] = useState<{ method: string; staffName: string } | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountInput, setDiscountInput] = useState('')
  const [discountNote, setDiscountNote] = useState('')

  // Local session state — so modal survives parent re-renders
  const [session, setSession] = useState(initialSession)

  const supabase = createClient()
  const { confirm, ConfirmDialogUI } = useConfirm()

  // Sync with parent when parent passes new session data (e.g. from Realtime)
  useEffect(() => {
    setSession(initialSession)
  }, [initialSession])

  // Re-fetch session data from DB
  const refreshLocal = useCallback(async () => {
    const { data: sess } = await supabase
      .from('customer_sessions')
      .select('*')
      .eq('id', session.id)
      .single()
    if (!sess) return

    const { data: rawOrders } = await supabase
      .from('orders')
      .select('*, items:order_items(id, quantity, unit_price, subtotal, item_status, product:products(name, image_url)), payment:payments(*)')
      .eq('customer_session_id', session.id)
      .not('status', 'eq', 'cancelled')

    const orders = (rawOrders ?? []).map((o: Record<string, unknown>) => {
      const rawPay = Array.isArray(o.payment) ? (o.payment as unknown[])[0] : o.payment
      return { ...o, payment: rawPay ?? undefined }
    }) as SessionWithOrders['orders']

    // Calculate total from active items (not o.total_amount) for consistency with table card
    const total = orders.reduce((s, o) => {
      const activeItems = (o.items ?? []).filter((i) => (i.item_status ?? 'active') === 'active')
      return s + activeItems.reduce((s2, i) => s2 + Number(i.subtotal), 0)
    }, 0)
    setSession({ ...sess, orders, total_amount: total })
  }, [session.id])

  // Realtime: auto-refresh when orders/items change for this session
  useEffect(() => {
    const channel = supabase
      .channel(`session-detail:${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_session_id=eq.${session.id}`,
      }, () => refreshLocal())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
      }, () => refreshLocal())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'customer_sessions',
        filter: `id=eq.${session.id}`,
      }, () => refreshLocal())
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session.id, refreshLocal])

  // Polling fallback: refresh every 5 seconds while session is active
  useEffect(() => {
    if (session.status !== 'active') return
    const interval = setInterval(refreshLocal, 5000)
    return () => clearInterval(interval)
  }, [session.id, session.status, refreshLocal])

  const isPaid = session.status === 'paid'
  const isCancelled = session.status === 'cancelled'
  const isActive = session.status === 'active'

  // Orders with active items — grouped by order (batch/set)
  const orderBatches = session.orders
    .map((o, idx) => {
      const activeItems = (o.items ?? [])
        .filter((i) => (i.item_status ?? 'active') === 'active')
        .map((i) => ({
          ...i,
          name: (i as { product?: { name: string } }).product?.name ?? 'สินค้า',
        }))
      const batchTotal = activeItems.reduce((s, i) => s + Number(i.subtotal), 0)
      return { orderId: o.id, orderNumber: o.order_number, batchIndex: idx + 1, items: activeItems, total: batchTotal }
    })
    .filter((b) => b.items.length > 0)

  const totalItemCount = orderBatches.reduce((s, b) => s + b.items.length, 0)

  // Merged items for print receipt (combined by product)
  const mergedItems = (() => {
    const map = new Map<string, { name: string; quantity: number; subtotal: number }>()
    for (const batch of orderBatches) {
      for (const item of batch.items) {
        const productId = (item as { product_id?: string }).product_id ?? item.id
        const existing = map.get(productId)
        if (existing) {
          existing.quantity += item.quantity
          existing.subtotal += item.subtotal
        } else {
          map.set(productId, { name: item.name, quantity: item.quantity, subtotal: item.subtotal })
        }
      }
    }
    return Array.from(map.values())
  })()

  // Discount calculation
  const subtotalBeforeDiscount = session.total_amount ?? 0
  const discountAmt = session.discount_type === 'percent'
    ? Math.round(subtotalBeforeDiscount * (session.discount_amount ?? 0) / 100)
    : (session.discount_amount ?? 0)
  const grandTotal = Math.max(0, subtotalBeforeDiscount - discountAmt)

  const handleApplyDiscount = async () => {
    const val = parseFloat(discountInput) || 0
    if (val <= 0) { setError('กรุณาใส่ส่วนลด'); return }
    if (discountType === 'percent' && val > 100) { setError('ส่วนลดเกิน 100%'); return }
    if (discountType === 'fixed' && val > subtotalBeforeDiscount) { setError('ส่วนลดเกินยอดรวม'); return }

    setProcessing(true)
    setError('')
    try {
      await supabase.from('customer_sessions')
        .update({ discount_amount: val, discount_type: discountType, discount_note: discountNote.trim() || null })
        .eq('id', session.id)

      setSession((prev) => ({ ...prev, discount_amount: val, discount_type: discountType as 'percent' | 'fixed', discount_note: discountNote.trim() || null }))
      setShowDiscount(false)
      setDiscountInput('')
      setDiscountNote('')
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveDiscount = async () => {
    const ok = await confirm({ title: 'ลบส่วนลด?', confirmLabel: 'ลบส่วนลด', danger: true })
    if (!ok) return
    setProcessing(true)
    try {
      await supabase.from('customer_sessions')
        .update({ discount_amount: 0, discount_type: null, discount_note: null })
        .eq('id', session.id)
      setSession((prev) => ({ ...prev, discount_amount: 0, discount_type: null, discount_note: null }))
      onRefresh()
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html>
<html><head><title>QR Bill</title>
<meta charset="utf-8">
<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Courier New', monospace;
    width: 100%;
    text-align: center;
    background: #fff;
    color: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  h2 {
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 2mm;
  }
  p {
    font-size: 9pt;
    color: #444;
    margin: 1.5mm 0;
    line-height: 1.4;
  }
  .qr-wrap {
    margin: 6mm auto;
    display: block;
    width: 65mm;
    height: 65mm;
  }
  .qr-wrap svg {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
  .url {
    font-size: 7pt;
    word-break: break-all;
    color: #888;
    margin-top: 3mm;
  }
  .divider {
    border: none;
    border-top: 1px dashed #ccc;
    margin: 4mm 0;
  }
</style>
</head>
<body>${content.innerHTML}</body></html>`)
    w.document.close()
    w.print()
  }

  const handlePrintReceipt = () => {
    if (mergedItems.length === 0) return
    const w = window.open('', '_blank')
    if (!w) return
    const itemCount = mergedItems.reduce((s, i) => s + i.quantity, 0)
    const now = new Date()
    const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const receiptNo = session.id.slice(0, 8).toUpperCase()

    const rows = mergedItems.map((item) => {
      const price = (item.subtotal ?? 0).toFixed(0)
      return `<tr>
        <td class="item-name">${item.name}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">${price}</td>
      </tr>`
    }).join('')

    const discountLine = discountAmt > 0
      ? `<div class="total-row" style="color:#e65100"><span>ส่วนลด${session.discount_type === 'percent' ? ` ${session.discount_amount}%` : ''}</span><span>-฿${discountAmt.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span></div>`
      : ''

    const subtotalLine = discountAmt > 0
      ? `<div class="total-row"><span>รวมก่อนลด</span><span>฿${subtotalBeforeDiscount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span></div>`
      : ''

    w.document.write(`<!DOCTYPE html>
<html><head><title>ใบเสร็จ - ${shop.name}</title><meta charset="utf-8">
<style>
  @page { size: 80mm auto; margin: 0; }
  @media print { body { margin: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', 'Lucida Console', monospace;
    width: 72mm; margin: 0 auto; padding: 4mm 2mm 6mm;
    color: #000; font-size: 8.5pt; line-height: 1.4;
    -webkit-print-color-adjust: exact;
  }
  .header { text-align: center; padding-bottom: 3mm; }
  .shop-name { font-size: 14pt; font-weight: bold; letter-spacing: 0.5pt; margin-bottom: 1mm; }
  .shop-sub { font-size: 7pt; color: #555; }
  .dash { border: none; border-top: 1px dashed #000; margin: 2.5mm 0; }
  .dash-double { border: none; border-top: 2px double #000; margin: 2.5mm 0; }
  .info-row { display: flex; justify-content: space-between; font-size: 7.5pt; color: #333; }
  .info-row span:first-child { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 1mm 0; }
  th { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; padding-bottom: 1.5mm; }
  th.h-name { text-align: left; }
  th.h-qty { text-align: center; width: 10mm; }
  th.h-price { text-align: right; width: 18mm; }
  td { padding: 0.8mm 0; vertical-align: top; font-size: 8.5pt; }
  .item-name { text-align: left; }
  .item-qty { text-align: center; width: 10mm; }
  .item-price { text-align: right; width: 18mm; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 1mm; }
  .total-row { display: flex; justify-content: space-between; padding: 0.5mm 0; font-size: 8.5pt; }
  .total-row.grand { font-size: 12pt; font-weight: bold; padding: 1.5mm 0; }
  .footer { text-align: center; margin-top: 4mm; }
  .footer p { font-size: 7pt; color: #555; line-height: 1.5; }
  .footer .thank { font-size: 9pt; font-weight: bold; color: #000; margin-bottom: 1mm; }
</style></head>
<body>
  <div class="header">
    <div class="shop-name">${shop.name}</div>
    <div class="shop-sub">ใบเสร็จรับเงิน / Receipt</div>
  </div>

  <hr class="dash-double">

  <div style="margin-bottom:2mm">
    <div class="info-row"><span>เลขที่:</span><span>${receiptNo}</span></div>
    <div class="info-row"><span>วันที่:</span><span>${dateStr} ${timeStr}</span></div>
    ${session.table_label ? `<div class="info-row"><span>โต๊ะ:</span><span>${session.table_label}</span></div>` : ''}
    <div class="info-row"><span>รายการ:</span><span>${itemCount} ชิ้น</span></div>
  </div>

  <hr class="dash">

  <table>
    <thead><tr>
      <th class="h-name">รายการ</th>
      <th class="h-qty">จำนวน</th>
      <th class="h-price">ราคา</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <hr class="dash">

  <div class="totals">
    ${subtotalLine}
    ${discountLine}
    <div class="total-row grand">
      <span>รวมทั้งสิ้น</span>
      <span>฿${grandTotal.toFixed(0).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')}</span>
    </div>
  </div>

  <hr class="dash-double">

  <div class="footer">
    <p class="thank">ขอบคุณที่ใช้บริการ</p>
    <p>Thank you for your visit!</p>
    <p style="margin-top:2mm">Powered by QRforPay</p>
  </div>
</body></html>`)
    w.document.close()
    w.print()
  }

  // Mark ALL orders in session as completed + session as paid
  const staffName = profile?.full_name ?? profile?.email ?? 'พนักงาน'

  const markSessionPaid = async (method: 'transfer' | 'cash', cashData?: { received: number; change: number }) => {
    setProcessing(true)
    setError('')
    try {
      const now = new Date().toISOString()
      const activeOrderIds = session.orders
        .filter((o) => !['cancelled'].includes(o.status))
        .map((o) => o.id)

      if (activeOrderIds.length > 0) {
        // Update all payments
        await supabase.from('payments')
          .update({
            status: 'success',
            method: method === 'cash' ? 'cash' : 'promptpay',
            confirmation_type: 'manual',
            confirmed_by: profile?.id ?? null,
            ...(cashData ? { cash_received: cashData.received, cash_change: cashData.change } : {}),
          })
          .in('order_id', activeOrderIds)

        // Update all orders to completed
        await supabase.from('orders')
          .update({ status: 'completed', completed_at: now })
          .in('id', activeOrderIds)
      }

      // Mark session as paid
      await supabase.from('customer_sessions')
        .update({ status: 'paid', paid_at: now })
        .eq('id', session.id)

      setShowCash(false)
      setCashInput('')
      setPaidSuccess({ method: method === 'cash' ? 'เงินสด' : 'โอนเงิน', staffName })
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(false)
    }
  }

  const handleTransferPay = async () => {
    const ok = await confirm({
      title: 'ยืนยันรับโอนเงิน',
      message: `ยอด ${fmt(grandTotal)}${discountAmt > 0 ? ` (ลด ${fmt(discountAmt)})` : ''}`,
      confirmLabel: 'ยืนยันรับโอน',
    })
    if (!ok) return
    await markSessionPaid('transfer')
  }

  const handleCashPay = async () => {
    const received = parseFloat(cashInput) || 0
    if (received < grandTotal) {
      setError(`เงินไม่พอ ยอดที่ต้องชำระ ${fmt(grandTotal)}`)
      return
    }
    const change = received - grandTotal
    const ok = await confirm({
      title: 'ยืนยันรับเงินสด',
      message: `รับ ${fmt(received)} · ทอน ${fmt(change)}`,
      confirmLabel: 'ยืนยัน',
    })
    if (!ok) return
    await markSessionPaid('cash', { received, change })
  }

  const handleChangeTable = async () => {
    if (!newTableLabel.trim()) return
    setProcessing(true)
    setError('')
    try {
      await supabase.from('customer_sessions')
        .update({ table_label: newTableLabel.trim() })
        .eq('id', session.id)

      // Update table_number on all active orders
      const activeOrderIds = session.orders
        .filter((o) => !['cancelled', 'completed'].includes(o.status))
        .map((o) => o.id)
      if (activeOrderIds.length > 0) {
        await supabase.from('orders')
          .update({ table_number: newTableLabel.trim() })
          .in('id', activeOrderIds)
      }

      setShowChangeTable(false)
      setNewTableLabel('')
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelBill = async () => {
    const ok = await confirm({ title: 'ยกเลิกบิลนี้?', confirmLabel: 'ยกเลิกบิล', danger: true })
    if (!ok) return
    setProcessing(true)
    setError('')
    try {
      const now = new Date().toISOString()
      const activeOrderIds = session.orders
        .filter((o) => !['cancelled', 'completed'].includes(o.status))
        .map((o) => o.id)

      if (activeOrderIds.length > 0) {
        await supabase.from('orders')
          .update({ status: 'cancelled', cancelled_at: now, cancelled_by: profile?.id ?? null })
          .in('id', activeOrderIds)
        await supabase.from('payments')
          .update({ status: 'failed' })
          .in('order_id', activeOrderIds)
          .eq('status', 'pending')
      }

      await supabase.from('customer_sessions')
        .update({ status: 'cancelled' })
        .eq('id', session.id)

      onRefresh()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelItem = async (orderId: string, itemId: string) => {
    const ok = await confirm({ title: 'ยกเลิกรายการนี้?', confirmLabel: 'ยกเลิก', danger: true })
    if (!ok) return
    setCancellingItem(itemId)
    setError('')
    try {
      const now = new Date().toISOString()
      const { error: itemErr } = await supabase.from('order_items')
        .update({ item_status: 'cancelled', item_cancelled_by: profile?.id ?? null, item_cancelled_at: now })
        .eq('id', itemId)
      if (itemErr) throw itemErr

      // Optimistic local update — remove item from session state immediately
      setSession((prev) => {
        const updatedOrders = prev.orders.map((o) => {
          if (o.id !== orderId) return o
          const updatedItems = (o.items ?? []).map((i) =>
            i.id === itemId ? { ...i, item_status: 'cancelled' as const } : i
          )
          const activeItems = updatedItems.filter((i) => (i.item_status ?? 'active') === 'active')
          const newTotal = activeItems.reduce((s, i) => s + Number(i.subtotal), 0)
          if (activeItems.length === 0) {
            return { ...o, items: updatedItems, status: 'cancelled' as const, total_amount: 0, subtotal: 0 }
          }
          return { ...o, items: updatedItems, total_amount: newTotal, subtotal: newTotal }
        }).filter((o) => o.status !== 'cancelled')

        const newSessionTotal = updatedOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
        return { ...prev, orders: updatedOrders, total_amount: newSessionTotal }
      })

      // Update DB in background
      const { data: allOrderItems } = await supabase
        .from('order_items').select('id, item_status, subtotal').eq('order_id', orderId)

      const activeItems = (allOrderItems ?? []).filter(
        (i: { item_status?: string }) => (i.item_status ?? 'active') === 'active'
      )
      if (activeItems.length === 0) {
        await supabase.from('orders')
          .update({ status: 'cancelled', cancelled_at: now, cancelled_by: profile?.id ?? null })
          .eq('id', orderId)
        await supabase.from('payments').update({ status: 'failed' })
          .eq('order_id', orderId).eq('status', 'pending')
      } else {
        const newTotal = activeItems.reduce((s: number, i: { subtotal: number }) => s + Number(i.subtotal), 0)
        await supabase.from('orders')
          .update({ total_amount: newTotal, subtotal: newTotal })
          .eq('id', orderId)
        await supabase.from('payments').update({ amount: newTotal })
          .eq('order_id', orderId).eq('status', 'pending')
      }
      // Also refresh parent (table card) so totals stay in sync
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      // Revert on error — re-fetch from DB
      await refreshLocal()
    } finally {
      setCancellingItem(null)
    }
  }

  const billStatus = BILL_STATUS[session.status as keyof typeof BILL_STATUS] ?? BILL_STATUS.active

  return (
    <>
    {ConfirmDialogUI}
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <span className={billStatus.badge}>{billStatus.label}</span>
            {session.table_label ? (
              <button
                onClick={() => { if (isActive) { setNewTableLabel(session.table_label ?? ''); setShowChangeTable(true) } }}
                className={`flex items-center gap-1 text-sm font-bold text-primary-600 dark:text-primary-400 ${isActive ? 'hover:underline cursor-pointer' : ''}`}
                disabled={!isActive}
              >
                <MapPin size={13} />
                โต๊ะ {session.table_label}
              </button>
            ) : (
              isActive && (
                <button
                  onClick={() => setShowChangeTable(true)}
                  className="text-xs text-muted hover:text-primary-500 transition"
                >
                  + ระบุโต๊ะ
                </button>
              )
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* QR Code — printRef captures this for receipt */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 text-center" ref={printRef}>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">{shop.name}</h2>
            <div className="flex justify-center mb-3">
              <div className="qr-wrap p-3 bg-white rounded-xl border border-slate-200 inline-block">
                <QRCodeSVG value={orderUrl} size={200} />
              </div>
            </div>
            <p className="text-xs text-muted mb-1">สแกนเพื่อสั่งและชำระเงิน</p>
            <p className="text-xs text-subtle break-all url">{orderUrl}</p>
          </div>

          <button
            onClick={handlePrint}
            className="btn-secondary w-full py-2.5 text-sm"
          >
            <Printer size={14} />
            พิมพ์ / บันทึก QR
          </button>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">
              {error}
            </div>
          )}

          {/* Bill items — grouped by order batch */}
          {orderBatches.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    รายการ ({totalItemCount})
                  </h3>
                  <button
                    onClick={handlePrintReceipt}
                    className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2 py-1 rounded-lg transition"
                    title="พิมพ์ใบรายการ"
                  >
                    <ReceiptText size={13} />
                    พิมพ์
                  </button>
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {discountAmt > 0 ? (
                    <span className="flex items-center gap-2">
                      <span className="text-sm line-through text-muted font-normal">{fmt(subtotalBeforeDiscount)}</span>
                      {fmt(grandTotal)}
                    </span>
                  ) : fmt(session.total_amount)}
                </span>
              </div>

              <div className="space-y-3">
                {orderBatches.map((batch) => (
                  <div key={batch.orderId} className="section-card overflow-hidden">
                    {/* Batch header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        ชุดที่ {batch.batchIndex}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {fmt(batch.total)}
                      </span>
                    </div>
                    {/* Items */}
                    <div className="divide-y divide-slate-50 dark:divide-slate-700">
                      {batch.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="text-slate-700 dark:text-slate-300 flex-1">
                            {item.name} ×{item.quantity}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-muted">{fmt(item.subtotal)}</span>
                            {isActive && (
                              <button
                                onClick={() => handleCancelItem(batch.orderId, item.id)}
                                disabled={cancellingItem === item.id}
                                className="text-xs text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition disabled:opacity-40"
                              >
                                ลบ
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount */}
              {isActive && orderBatches.length > 0 && (
                session.discount_amount > 0 && session.discount_type ? (
                  <div className="flex items-center justify-between text-sm mt-3 px-1">
                    <div className="flex items-center gap-1.5">
                      <Tag size={13} className="text-orange-500" />
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        ส่วนลด {session.discount_type === 'percent' ? `${session.discount_amount}%` : fmt(session.discount_amount)}
                      </span>
                      {session.discount_note && (
                        <span className="text-xs text-muted">({session.discount_note})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600 dark:text-orange-400 font-medium">-{fmt(discountAmt)}</span>
                      <button onClick={handleRemoveDiscount} className="text-xs text-rose-500 hover:underline">ลบ</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDiscount(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 mt-3 text-sm font-medium text-orange-600 dark:text-orange-400 border border-dashed border-orange-300 dark:border-orange-700 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                  >
                    <Tag size={15} />
                    เพิ่มส่วนลด
                  </button>
                )
              )}
              {discountAmt > 0 && (
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-sm text-muted">ยอดสุทธิ</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{fmt(grandTotal)}</span>
                </div>
              )}

              {/* Payment buttons */}
              {isActive && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowCash(true)}
                    className="btn-secondary flex-1 py-3 text-sm"
                  >
                    <Banknote size={15} className="text-emerald-500" />
                    เงินสด
                  </button>
                  <button
                    onClick={handleTransferPay}
                    disabled={processing}
                    className="btn-primary flex-1 py-3 text-sm"
                  >
                    {processing ? <span className="spinner-sm" /> : <><ArrowRightLeft size={14} />รับโอน</>}
                  </button>
                </div>
              )}

              {isPaid && (
                <div className="flex items-center gap-2 justify-center mt-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium text-sm">ชำระเงินแล้ว</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">
              <p className="font-medium">ลูกค้ายังไม่ได้สั่ง</p>
              <p className="text-sm mt-1">แชร์ QR code ให้ลูกค้าสแกน</p>
            </div>
          )}

          {/* Cancel bill */}
          {isActive && (
            <button
              onClick={handleCancelBill}
              disabled={processing}
              className="w-full py-2.5 text-sm font-medium text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition disabled:opacity-50"
            >
              <XCircle size={14} className="inline mr-1.5 mb-0.5" />
              ยกเลิกบิล
            </button>
          )}
        </div>
      </div>

      {/* Change table modal */}
      {showChangeTable && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xs p-6 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">ย้ายโต๊ะ</h3>
            <p className="text-sm text-muted mb-4">
              {session.table_label ? `โต๊ะปัจจุบัน: ${session.table_label}` : 'ยังไม่ได้ระบุโต๊ะ'}
            </p>

            {shop.table_count > 0 ? (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({ length: shop.table_count }, (_, i) => String(i + 1)).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNewTableLabel(num)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                      newTableLabel === num
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                        : num === session.table_label
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={newTableLabel}
                onChange={(e) => setNewTableLabel(e.target.value)}
                placeholder="เลขโต๊ะใหม่"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowChangeTable(false); setNewTableLabel('') }}
                className="btn-secondary flex-1 py-3"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleChangeTable}
                disabled={processing || !newTableLabel.trim() || newTableLabel.trim() === session.table_label}
                className="btn-primary flex-1 py-3"
              >
                {processing ? <span className="spinner-sm" /> : `ย้ายไปโต๊ะ ${newTableLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash payment modal */}
      {showCash && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xs p-6 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">รับเงินสด</h3>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
              {fmt(grandTotal)}
            </p>
            {discountAmt > 0 && (
              <p className="text-xs text-orange-500 mb-3">ส่วนลด -{fmt(discountAmt)}</p>
            )}

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              รับเงินมา (฿)
            </label>
            <input
              type="number"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              className="w-full text-3xl font-bold px-4 py-3 border-b-2 border-primary-500 bg-transparent focus:outline-none mb-3 text-slate-900 dark:text-slate-100"
              placeholder="0"
              autoFocus
            />
            {(() => {
              const received = parseFloat(cashInput) || 0
              const change = received - grandTotal
              if (received > 0 && change >= 0)
                return <p className="text-emerald-600 dark:text-emerald-400 font-bold mb-4">ทอน {fmt(change)}</p>
              if (received > 0 && change < 0)
                return <p className="text-rose-500 dark:text-rose-400 font-bold mb-4">ขาด {fmt(-change)}</p>
              return <div className="mb-4" />
            })()}

            {error && <p className="text-rose-500 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCash(false); setError('') }}
                className="btn-secondary flex-1 py-3"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCashPay}
                disabled={processing}
                className="btn-primary flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
              >
                {processing ? <span className="spinner-sm" /> : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount modal */}
      {showDiscount && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xs p-6 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Tag size={16} className="text-orange-500" />
              เพิ่มส่วนลด
            </h3>
            <p className="text-sm text-muted mb-4">ยอดก่อนลด {fmt(subtotalBeforeDiscount)}</p>

            {/* Type selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  discountType === 'percent'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                เปอร์เซ็นต์ %
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  discountType === 'fixed'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                จำนวนเงิน ฿
              </button>
            </div>

            {/* Amount input */}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {discountType === 'percent' ? 'ส่วนลด (%)' : 'ส่วนลด (฿)'}
            </label>
            <input
              type="number"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="w-full text-2xl font-bold px-4 py-3 border-b-2 border-orange-500 bg-transparent focus:outline-none mb-3 text-slate-900 dark:text-slate-100"
              placeholder="0"
              autoFocus
            />

            {/* Preview */}
            {(() => {
              const val = parseFloat(discountInput) || 0
              if (val <= 0) return null
              const previewAmt = discountType === 'percent'
                ? Math.round(subtotalBeforeDiscount * val / 100)
                : val
              const previewTotal = Math.max(0, subtotalBeforeDiscount - previewAmt)
              return (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 mb-3 text-sm">
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>ลด</span>
                    <span>-{fmt(previewAmt)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 mt-1">
                    <span>ยอดสุทธิ</span>
                    <span>{fmt(previewTotal)}</span>
                  </div>
                </div>
              )
            })()}

            {/* Note */}
            <input
              type="text"
              value={discountNote}
              onChange={(e) => setDiscountNote(e.target.value)}
              placeholder="หมายเหตุ (ไม่บังคับ)"
              maxLength={100}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
            />

            {error && <p className="text-rose-500 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDiscount(false); setError(''); setDiscountInput(''); setDiscountNote('') }}
                className="btn-secondary flex-1 py-3"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApplyDiscount}
                disabled={processing}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {processing ? <span className="spinner-sm" /> : 'ใส่ส่วนลด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment success overlay */}
      {paidSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 animate-fade-in" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-8 text-center animate-slide-up">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">ชำระเงินสำเร็จ</h3>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{fmt(grandTotal)}</p>
            {discountAmt > 0 && (
              <p className="text-xs text-orange-500">ส่วนลด -{fmt(discountAmt)}</p>
            )}
            <div className="mt-2 space-y-1">
              {session.table_label && (
                <p className="text-sm text-muted">โต๊ะ {session.table_label}</p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {paidSuccess.method}
              </p>
            </div>
            <button
              onClick={() => { setPaidSuccess(null); onClose() }}
              className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
