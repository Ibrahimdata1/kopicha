'use client'

import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, X, Banknote, ArrowRightLeft, XCircle, CheckCircle2, MapPin } from 'lucide-react'
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

export default function SessionDetailModal({ session, shop, profile, orderUrl, onClose, onRefresh }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [cashInput, setCashInput] = useState('')
  const [showCash, setShowCash] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [cancellingItem, setCancellingItem] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showChangeTable, setShowChangeTable] = useState(false)
  const [newTableLabel, setNewTableLabel] = useState('')
  const [paidSuccess, setPaidSuccess] = useState(false)

  const supabase = createClient()
  const { confirm, ConfirmDialogUI } = useConfirm()

  const isPaid = session.status === 'paid'
  const isCancelled = session.status === 'cancelled'
  const isActive = session.status === 'active'

  // All active items across all orders
  const allItems = session.orders.flatMap((o) =>
    (o.items ?? [])
      .filter((i) => (i.item_status ?? 'active') === 'active')
      .map((i) => ({ ...i, orderId: o.id, orderNumber: o.order_number }))
  )

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

  // Mark ALL orders in session as completed + session as paid
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
      setPaidSuccess(true)
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
      message: `ยอด ${fmt(session.total_amount)} · โดย: ${profile?.full_name ?? 'พนักงาน'}`,
      confirmLabel: 'ยืนยันรับโอน',
    })
    if (!ok) return
    await markSessionPaid('transfer')
  }

  const handleCashPay = async () => {
    const total = session.total_amount ?? 0
    const received = parseFloat(cashInput) || 0
    if (received < total) {
      setError(`เงินไม่พอ ยอดที่ต้องชำระ ${fmt(total)}`)
      return
    }
    const change = received - total
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
      await supabase.from('order_items')
        .update({ item_status: 'cancelled', item_cancelled_by: profile?.id ?? null, item_cancelled_at: now })
        .eq('id', itemId)

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
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setCancellingItem(null)
    }
  }

  const billStatus = BILL_STATUS[session.status as keyof typeof BILL_STATUS] ?? BILL_STATUS.active

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
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

          {/* Bill items */}
          {allItems.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  รายการ ({allItems.length})
                </h3>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {fmt(session.total_amount)}
                </span>
              </div>

              <div className="section-card divide-y divide-slate-50 dark:divide-slate-700">
                {allItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-700 dark:text-slate-300 flex-1">
                      {(item as { product?: { name: string } }).product?.name ?? 'สินค้า'} ×{item.quantity}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted">{fmt(item.subtotal)}</span>
                      {isActive && (
                        <button
                          onClick={() => handleCancelItem(item.orderId, item.id)}
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

      {ConfirmDialogUI}

      {/* Change table modal */}
      {showChangeTable && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xs p-6 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">รับเงินสด</h3>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-4">
              {fmt(session.total_amount)}
            </p>

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
              const total = session.total_amount ?? 0
              const change = received - total
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

      {/* Payment success overlay */}
      {paidSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-8 text-center animate-slide-up">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">ชำระเงินสำเร็จ</h3>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{fmt(session.total_amount)}</p>
            {session.table_label && (
              <p className="text-sm text-muted">โต๊ะ {session.table_label}</p>
            )}
            <button
              onClick={() => { setPaidSuccess(false); onClose() }}
              className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
