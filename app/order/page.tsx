'use client'

// Customer Self-Ordering Page
// Flow: menu → (add items) → place order (to kitchen) → back to menu → repeat → pay all at once
// QR URL: /order?session=<customer_session_uuid>
// No auth required — uses anon Supabase client with RLS

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { generatePromptPayPayload, generateQRReference } from '@/lib/qr'

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })), { ssr: false })
import type { CustomerSession, Product, OrderWithItems, Payment } from '@/lib/types'
import Image from 'next/image'
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  CreditCard,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartEntry {
  product: Product
  qty: number
}

type Screen = 'loading' | 'error' | 'menu' | 'cart' | 'paying' | 'paid'

function fmt(n: number) {
  return '฿' + (n ?? 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const CART_KEY = (sid: string) => `qrforpay_cart_${sid}`

function saveCart(sid: string, cart: CartEntry[]) {
  try { localStorage.setItem(CART_KEY(sid), JSON.stringify(cart)) } catch { /* ignore */ }
}
function loadCart(sid: string): CartEntry[] {
  try {
    const raw = localStorage.getItem(CART_KEY(sid))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function clearCart(sid: string) {
  try { localStorage.removeItem(CART_KEY(sid)) } catch { /* ignore */ }
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'รอครัว',
  preparing: 'กำลังทำ',
  ready: 'พร้อมเสิร์ฟ',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
}
const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-500',
}
const ORDER_STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Package size={13} />,
  preparing: <ChefHat size={13} />,
  ready: <CheckCircle2 size={13} />,
  completed: <CheckCircle2 size={13} />,
}

// ─── Cart merge helper ────────────────────────────────────────────────────────
// Merges remote cart items into local cart. Uses max-qty strategy so
// simultaneous adds from multiple devices are preserved.
function mergeCarts(
  local: CartEntry[],
  remote: { productId: string; qty: number }[],
  productsList: Product[],
): CartEntry[] {
  const merged = new Map<string, CartEntry>()
  for (const entry of local) merged.set(entry.product.id, { ...entry })
  for (const item of remote) {
    const existing = merged.get(item.productId)
    if (existing) {
      existing.qty = Math.max(existing.qty, item.qty)
    } else {
      const product = productsList.find((p) => p.id === item.productId)
      if (product) merged.set(item.productId, { product, qty: item.qty })
    }
  }
  return Array.from(merged.values())
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function OrderPageContent() {
  const params = useSearchParams()
  const sessionId = params.get('session') ?? ''
  const supabase = createClient()

  const [screen, setScreen] = useState<Screen>('loading')
  const [error, setError] = useState('')
  const [shopName, setShopName] = useState('')
  const [promptpayId, setPromptpayId] = useState('')
  const [taxRate, setTaxRate] = useState(0.07)
  const [paymentMode, setPaymentMode] = useState<'auto' | 'counter'>('counter')
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; sort_order: number }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartEntry[]>([])
  const [placedOrders, setPlacedOrders] = useState<OrderWithItems[]>([])
  const [isPlacing, setIsPlacing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Payment
  const [qrPayload, setQrPayload] = useState('')
  const [qrTimeLeft, setQrTimeLeft] = useState(600)
  const [payStatus, setPayStatus] = useState<'pending' | 'success' | 'failed' | 'expired'>('pending')

  // Dialog
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirm?: boolean
    resolve: (v: boolean) => void
  } | null>(null)

  // Unique client ID for broadcast (per browser tab)
  const clientIdRef = useRef(typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36))
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  function showConfirm(title: string, message: string) {
    return new Promise<boolean>((resolve) => setDialog({ title, message, confirm: true, resolve }))
  }

  // ── Load session + shop + menu ─────────────────────────────────────────────
  const loadPlacedOrders = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(id, quantity, unit_price, subtotal, item_status, product:products(name, image_url)), payment:payments(*)')
      .eq('customer_session_id', sid)
      .not('status', 'in', '("cancelled")')
      .order('created_at', { ascending: true })

    const mapped: OrderWithItems[] = (data ?? []).map((o: OrderWithItems & { payment: unknown }) => {
      const rawPay = Array.isArray(o.payment) ? (o.payment as unknown[])[0] : o.payment
      return { ...o, payment: (rawPay as Payment) ?? undefined }
    })
    setPlacedOrders(mapped)
    return mapped
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setError('ไม่พบ QR Session — กรุณาขอ QR ใหม่จากพนักงาน')
      setScreen('error')
      return
    }
    ;(async () => {
      try {
        const { data: sess, error: sessErr } = await supabase
          .from('customer_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessErr || !sess) {
          setError('QR code ไม่ถูกต้องหรือหมดอายุ — กรุณาขอ QR ใหม่')
          setScreen('error')
          return
        }
        if (sess.status === 'cancelled') {
          setError('QR code นี้ถูกยกเลิก — กรุณาขอ QR ใหม่จากพนักงาน')
          setScreen('error')
          return
        }
        if (sess.status === 'paid') {
          setSession(sess)
          setScreen('paid')
          return
        }

        setSession(sess)

        const { data: shop } = await supabase
          .from('shops')
          .select('name, promptpay_id, tax_rate, payment_mode')
          .eq('id', sess.shop_id)
          .single()

        if (!shop) { setError('ไม่พบข้อมูลร้านค้า'); setScreen('error'); return }
        setShopName(shop.name)
        setPromptpayId(shop.promptpay_id ?? '')
        setTaxRate(shop.tax_rate ?? 0.07)
        setPaymentMode((shop.payment_mode as 'auto' | 'counter') ?? 'counter')

        const [{ data: cats }, { data: prods }] = await Promise.all([
          supabase.from('categories').select('*').eq('shop_id', sess.shop_id).order('sort_order'),
          supabase.from('products').select('*').eq('shop_id', sess.shop_id).eq('is_active', true).order('name'),
        ])
        setCategories(cats ?? [])
        setProducts(prods ?? [])

        // Restore persisted cart
        const saved = loadCart(sessionId)
        if (saved.length > 0) setCart(saved)

        await loadPlacedOrders(sess.id)
        setScreen('menu')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่ได้')
        setScreen('error')
      }
    })()
  }, [sessionId])

  // ── Broadcast helper: send cart state to other devices ────────────────────
  const broadcastCart = useCallback((updatedCart: CartEntry[]) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cart_sync',
      payload: {
        clientId: clientIdRef.current,
        items: updatedCart.map((c) => ({ productId: c.product.id, qty: c.qty })),
      },
    })
  }, [])

  // ── Realtime: order status + payment updates + cart sync + menu/shop ─────
  useEffect(() => {
    if (!sessionId || screen === 'loading' || screen === 'error' || !session) return

    const shopId = session.shop_id

    channelRef.current = supabase
      .channel(`customer-session:${sessionId}`)
      // Listen for both INSERT and UPDATE on orders (so other devices see new orders)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_session_id=eq.${sessionId}`,
      }, () => loadPlacedOrders(sessionId))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'customer_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        const updated = payload.new as CustomerSession
        if (updated.status === 'paid') setScreen('paid')
        // Update discount fields realtime
        setSession((prev) => prev ? { ...prev, discount_amount: updated.discount_amount ?? 0, discount_type: updated.discount_type, discount_note: updated.discount_note } : prev)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
      }, async (payload) => {
        if (payload.new.status === 'success') {
          setPayStatus('success')
          setTimeout(() => setScreen('paid'), 1500)
        }
      })
      // Realtime: shop name / settings change
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'shops',
        filter: `id=eq.${shopId}`,
      }, (payload) => {
        const s = payload.new as { name?: string; promptpay_id?: string; tax_rate?: number; payment_mode?: string }
        if (s.name) setShopName(s.name)
        if (s.promptpay_id !== undefined) setPromptpayId(s.promptpay_id ?? '')
        if (s.tax_rate !== undefined) setTaxRate(s.tax_rate ?? 0.07)
        if (s.payment_mode) setPaymentMode(s.payment_mode as 'auto' | 'counter')
      })
      // Realtime: product changes (add/edit/delete/deactivate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `shop_id=eq.${shopId}`,
      }, async () => {
        const { data: prods } = await supabase
          .from('products').select('*').eq('shop_id', shopId).eq('is_active', true).order('name')
        setProducts(prods ?? [])
        // Remove cart items for products no longer active
        const activeIds = new Set((prods ?? []).map((p: Product) => p.id))
        setCart((prev) => {
          const filtered = prev.filter((c) => activeIds.has(c.product.id))
          if (filtered.length !== prev.length) saveCart(sessionId, filtered)
          return filtered
        })
      })
      // Realtime: category changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `shop_id=eq.${shopId}`,
      }, async () => {
        const { data: cats } = await supabase
          .from('categories').select('*').eq('shop_id', shopId).order('sort_order')
        setCategories(cats ?? [])
      })
      // Realtime: order_items changes (shop cancels item)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
      }, () => loadPlacedOrders(sessionId))
      // Broadcast: sync cart between devices sharing the same session
      .on('broadcast', { event: 'cart_sync' }, ({ payload }) => {
        if (payload.clientId === clientIdRef.current) return // ignore own broadcasts
        const remoteItems = payload.items as { productId: string; qty: number }[]
        setCart((prev) => {
          const merged = mergeCarts(prev, remoteItems, products)
          saveCart(sessionId, merged)
          return merged
        })
      })
      // When another device places an order and clears cart
      .on('broadcast', { event: 'cart_cleared' }, ({ payload }) => {
        if (payload.clientId === clientIdRef.current) return
        clearCart(sessionId)
        setCart([])
        loadPlacedOrders(sessionId)
      })
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [sessionId, screen, session?.shop_id, products])

  // ── Polling fallback: refresh placed orders every 3s (Realtime may miss order_items) ──
  useEffect(() => {
    if (!sessionId || (screen !== 'menu' && screen !== 'paying')) return
    const interval = setInterval(() => loadPlacedOrders(sessionId), 3000)
    return () => clearInterval(interval)
  }, [sessionId, screen, loadPlacedOrders])

  // ── QR countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'paying') return
    const timer = setInterval(() => {
      setQrTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); if (payStatus === 'pending') setPayStatus('expired'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [screen])

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const cartTotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0)
  const cartQty   = cart.reduce((s, c) => s + c.qty, 0)

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id)
      if (existing && product.stock > 0 && existing.qty >= product.stock) return prev
      const updated = existing
        ? prev.map((c) => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c)
        : [...prev, { product, qty: 1 }]
      saveCart(sessionId, updated)
      broadcastCart(updated)
      return updated
    })
  }

  const changeQty = async (productId: string, delta: number) => {
    const entry = cart.find((c) => c.product.id === productId)
    if (entry && entry.qty === 1 && delta === -1) {
      const ok = await showConfirm('ลบสินค้า', `ต้องการลบ "${entry.product.name}" ออกจากตะกร้า?`)
      if (!ok) return
    }
    setCart((prev) => {
      const updated = prev
        .map((c) => c.product.id === productId ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
        .filter((c) => c.qty > 0)
      saveCart(sessionId, updated)
      broadcastCart(updated)
      if (updated.length === 0) setScreen('menu')
      return updated
    })
  }

  // ── Place order (send to kitchen) ─────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!session || cart.length === 0) return

    // Race condition guard: re-verify session is still active before placing order
    const { data: freshSession } = await supabase
      .from('customer_sessions').select('status').eq('id', session.id).single()
    if (freshSession?.status !== 'active') {
      setDialog({ title: 'ไม่สามารถสั่งได้', message: 'บิลนี้ปิดหรือชำระเงินแล้ว', resolve: () => {} })
      return
    }

    const ok = await showConfirm(
      'ยืนยันการสั่ง',
      `${cartQty} รายการ รวม ${fmt(cartTotal)}\nออเดอร์จะส่งไปยังครัวทันที`
    )
    if (!ok) return

    setIsPlacing(true)
    const snapshot = [...cart]
    try {
      // Round to avoid floating-point issues
      const subtotal = Math.round(cartTotal * 100) / 100
      const taxAmount = Math.round(subtotal * (taxRate / (1 + taxRate)) * 100) / 100

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          shop_id: session.shop_id,
          cashier_id: null,
          subtotal,
          discount_amount: 0,
          tax_amount: taxAmount,
          total_amount: subtotal,
          payment_method: 'qr',
          status: 'pending',
          order_source: 'customer',
          customer_session_id: session.id,
          table_number: session.table_label,
        })
        .select()
        .single()

      if (orderErr || !order) throw orderErr ?? new Error('สร้างออเดอร์ไม่ได้')

      await supabase.from('order_items').insert(
        snapshot.map((c) => ({
          order_id: order.id,
          product_id: c.product.id,
          quantity: c.qty,
          unit_price: c.product.price,
          subtotal: c.product.price * c.qty,
        }))
      )

      await supabase.from('payments').insert({
        order_id: order.id,
        method: 'qr',
        amount: subtotal,
        qr_payload: null,
        transaction_ref: generateQRReference(),
        status: 'pending',
      })

      clearCart(sessionId)
      setCart([])
      // Notify other devices that cart was cleared (order placed)
      channelRef.current?.send({
        type: 'broadcast',
        event: 'cart_cleared',
        payload: { clientId: clientIdRef.current },
      })
      setScreen('menu')
      await loadPlacedOrders(sessionId)
      setOrderSuccess(true)
      setTimeout(() => setOrderSuccess(false), 3000)
    } catch (err: unknown) {
      setCart(snapshot) // restore on error
      setDialog({
        title: 'เกิดข้อผิดพลาด',
        message: err instanceof Error ? err.message : 'ลองใหม่อีกครั้ง',
        resolve: () => {},
      })
    } finally {
      setIsPlacing(false)
    }
  }

  // ── Show payment QR ───────────────────────────────────────────────────────
  const handleShowPayment = () => {
    if (unpaidGrandTotal <= 0) {
      setDialog({ title: 'ไม่มียอดที่ต้องชำระ', message: 'ยังไม่มีออเดอร์ที่ค้างชำระ', resolve: () => {} })
      return
    }

    let qr = ''
    if (promptpayId) {
      try { qr = generatePromptPayPayload(promptpayId, unpaidGrandTotal) } catch { /* ignore */ }
    }
    setQrPayload(qr)
    setQrTimeLeft(600)
    setPayStatus('pending')
    setScreen('paying')
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeOrders = placedOrders.filter((o) => o.status !== 'cancelled')
  const unpaidOrders = activeOrders.filter((o) => o.payment?.status !== 'success')
  // Calculate totals from active items (not o.total_amount) for accuracy when items are cancelled
  const calcTotal = (orders: OrderWithItems[]) => orders.reduce((s, o) => {
    const items = (o.items ?? []).filter((i) => (i.item_status ?? 'active') === 'active')
    return s + items.reduce((s2, i) => s2 + Number(i.subtotal), 0)
  }, 0)
  const sessionTotal = calcTotal(activeOrders)
  const unpaidTotal  = calcTotal(unpaidOrders)

  // Discount from session (applied by shop staff)
  const sessionDiscountAmt = session?.discount_type === 'percent'
    ? Math.round(sessionTotal * (session.discount_amount ?? 0) / 100)
    : (session?.discount_amount ?? 0)
  const sessionGrandTotal = Math.max(0, sessionTotal - sessionDiscountAmt)
  const unpaidGrandTotal = Math.max(0, unpaidTotal - sessionDiscountAmt)
  // Re-generate QR when total changes on paying screen
  useEffect(() => {
    if (screen !== 'paying' || payStatus !== 'pending' || !promptpayId) return
    try {
      const qr = generatePromptPayPayload(promptpayId, unpaidGrandTotal)
      setQrPayload(qr)
    } catch { /* ignore */ }
  }, [unpaidGrandTotal, screen, payStatus, promptpayId])

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products

  // ─── Screens ──────────────────────────────────────────────────────────────

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400 text-sm">กำลังโหลดเมนู...</p>
        </div>
      </div>
    )
  }

  if (screen === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">เปิดไม่ได้</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (screen === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">ชำระเงินสำเร็จ!</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm">ขอบคุณที่ใช้บริการ</p>
          {session?.table_label && (
            <p className="text-primary-600 dark:text-primary-400 font-semibold mt-2">โต๊ะ {session.table_label}</p>
          )}
          {sessionTotal > 0 && (
            <div className="mt-4">
              {sessionDiscountAmt > 0 && (
                <p className="text-sm text-orange-500 line-through">{fmt(sessionTotal)}</p>
              )}
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(sessionGrandTotal)}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen === 'paying') {
    const minutes = Math.floor(qrTimeLeft / 60)
    const seconds = qrTimeLeft % 60
    const displayTotal = unpaidGrandTotal

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setScreen('menu')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-slate-100">{shopName}</h1>
            <p className="text-xs text-gray-600 dark:text-slate-400">สแกนเพื่อชำระเงิน</p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          {payStatus === 'success' ? (
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-8 text-center">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-green-700 dark:text-green-400">ชำระเงินสำเร็จ!</h2>
              <p className="text-green-600 dark:text-green-500 mt-1 text-sm">ขอบคุณที่ใช้บริการ</p>
            </div>
          ) : payStatus === 'expired' || payStatus === 'failed' ? (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-8 text-center">
              <X size={40} className="text-red-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
                {payStatus === 'expired' ? 'QR หมดอายุ' : 'การชำระเงินล้มเหลว'}
              </h2>
              <p className="text-red-600 dark:text-red-400 mt-1 text-sm">กรุณาแจ้งพนักงาน หรือกลับไปลองใหม่</p>
              <button
                onClick={handleShowPayment}
                className="mt-4 px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition text-sm"
              >
                สร้าง QR ใหม่
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 text-center">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg mb-1">สแกน QR PromptPay</h2>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-5">{shopName}</p>

              {qrPayload ? (
                <div className="flex justify-center mb-5">
                  <div className="p-4 bg-white border-2 border-gray-200 dark:border-slate-600 rounded-2xl inline-block shadow-sm">
                    <QRCodeSVG value={qrPayload} size={220} />
                  </div>
                </div>
              ) : (
                <div className="h-56 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-5">
                  <p className="text-gray-400 dark:text-slate-400 text-sm">ไม่มีข้อมูล PromptPay</p>
                </div>
              )}

              <div className="text-4xl font-bold text-primary-600 mb-2">{fmt(displayTotal)}</div>

              <div className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${
                qrTimeLeft < 60
                  ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                หมดอายุใน {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>
          )}

          {/* Order summary on pay screen */}
          {unpaidOrders.length > 0 && payStatus !== 'success' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 text-sm mb-3">รายการที่ต้องชำระ</h3>
              <div className="space-y-2">
                {unpaidOrders.map((o) => {
                  const activeItems = (o.items ?? []).filter((i) => (i.item_status ?? 'active') === 'active')
                  const itemNames = activeItems.map((i) => `${(i as { product?: { name: string } }).product?.name ?? 'สินค้า'} ×${i.quantity}`).join('  •  ')
                  return (
                    <div key={o.id} className="text-sm space-y-0.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 dark:text-slate-300 font-medium">ออเดอร์ #{o.order_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLOR[o.status] ?? ''}`}>
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{fmt(o.total_amount ?? 0)}</span>
                      </div>
                      {itemNames && <p className="text-xs text-gray-600 dark:text-slate-400">{itemNames}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 text-center">
            หากโอนแล้วแต่ระบบไม่อัพเดต กรุณาแจ้งพนักงาน
          </div>
        </div>
      </div>
    )
  }

  // ── Menu screen ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 dark:text-slate-100 text-base">{shopName}</h1>
            {session?.table_label && (
              <p className="text-xs text-gray-600 dark:text-slate-400">โต๊ะ {session.table_label}</p>
            )}
          </div>
          {cartQty > 0 && (
            <button
              onClick={() => setScreen('cart')}
              className="flex items-center gap-2 bg-primary-500 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-md shadow-primary-500/30 transition"
            >
              <ShoppingCart size={15} />
              <span>{cartQty}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-lg text-xs">{fmt(cartTotal)}</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 flex-1">

        {/* Order success toast */}
        {orderSuccess && (
          <div className="fixed top-20 left-0 right-0 flex justify-center z-50" style={{ animation: 'toastIn 0.25s ease-out' }}>
          <div className="bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 size={16} />
            ส่งออเดอร์ไปครัวแล้ว!
          </div>
          </div>
        )}

        {/* Placed orders summary — merged items across all orders */}
        {activeOrders.length > 0 && (() => {
          // Merge items across all orders by product
          const mergedMap = new Map<string, { name: string; quantity: number; subtotal: number }>()
          for (const order of activeOrders) {
            for (const item of (order.items ?? []).filter((i) => (i.item_status ?? 'active') === 'active')) {
              const name = (item as { product?: { name: string } }).product?.name ?? 'สินค้า'
              const productId = (item as { product_id?: string }).product_id ?? item.id
              const existing = mergedMap.get(productId)
              if (existing) {
                existing.quantity += item.quantity
                existing.subtotal += item.subtotal
              } else {
                mergedMap.set(productId, { name, quantity: item.quantity, subtotal: item.subtotal })
              }
            }
          }
          const mergedList = Array.from(mergedMap.values())
          return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                <ChefHat size={15} className="text-primary-500" />
                ออเดอร์ของคุณ ({mergedList.length} รายการ)
              </h3>
              <span className="font-bold text-primary-600 dark:text-primary-400 text-sm">{fmt(sessionGrandTotal)}</span>
            </div>

            <div className="space-y-2 mb-3">
              {mergedList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-slate-300">{item.name} ×{item.quantity}</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 shrink-0">{fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {sessionDiscountAmt > 0 && (
              <div className="flex items-center justify-between text-sm px-1 py-2 mb-2 border-t border-gray-100 dark:border-slate-700">
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  ส่วนลด {session?.discount_type === 'percent' ? `${session.discount_amount}%` : ''}
                  {session?.discount_note ? ` (${session.discount_note})` : ''}
                </span>
                <span className="text-orange-600 dark:text-orange-400 font-semibold">-{fmt(sessionDiscountAmt)}</span>
              </div>
            )}

            {unpaidOrders.length > 0 && (
              paymentMode === 'auto' ? (
                <button
                  onClick={handleShowPayment}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition shadow-md shadow-primary-500/25"
                >
                  <CreditCard size={16} />
                  ชำระเงิน {fmt(unpaidGrandTotal)}
                </button>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-center">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">ยอดรวม {fmt(unpaidGrandTotal)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">กรุณาชำระเงินที่เคาน์เตอร์</p>
                </div>
              )
            )}
          </div>
          )
        })()}

        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                !selectedCategory ? 'bg-primary-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategory === cat.id ? 'bg-primary-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-28">
          {filteredProducts.map((product) => {
            const entry = cart.find((c) => c.product.id === product.id)
            const outOfStock = product.stock === 0
            return (
              <div
                key={product.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden shadow-sm transition ${
                  outOfStock ? 'opacity-50 border-gray-200 dark:border-slate-700' : 'border-gray-200 dark:border-slate-700 hover:border-primary-200 hover:shadow-md'
                }`}
              >
                {/* Image */}
                <div className="relative h-32 bg-gray-100 dark:bg-slate-700">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill className="object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package size={28} className="text-gray-300 dark:text-slate-500" />
                  </div>
                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full">หมด</span>
                    </div>
                  )}
                  {entry && !outOfStock && (
                    <div className="absolute top-2 right-2 bg-primary-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                      {entry.qty}
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <p className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug mb-1 line-clamp-2">{product.name}</p>
                  <p className="text-primary-600 dark:text-primary-400 font-bold text-sm mb-2">{fmt(product.price)}</p>

                  {!outOfStock && (
                    entry ? (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => changeQty(product.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 flex items-center justify-center transition"
                        >
                          <Minus size={14} strokeWidth={2.5} />
                        </button>
                        <span className="font-bold text-gray-900 dark:text-slate-100 w-6 text-center">{entry.qty}</span>
                        <button
                          onClick={() => changeQty(product.id, 1)}
                          className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition"
                      >
                        + เพิ่ม
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cart bottom bar */}
      {cartQty > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-4 py-3 z-30 shadow-2xl">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setScreen('cart')}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-6 transition shadow-lg shadow-primary-500/30"
            >
              <span className="bg-primary-600 text-white text-sm w-7 h-7 rounded-full flex items-center justify-center font-bold">
                {cartQty}
              </span>
              <span className="flex items-center gap-2">
                <ShoppingCart size={16} />
                ดูตะกร้า
              </span>
              <span>{fmt(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart overlay */}
      {screen === 'cart' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setScreen('menu')}>
          <div
            className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="font-bold text-lg text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary-500" />
                ตะกร้าของคุณ
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const ok = await showConfirm('ล้างตะกร้า', 'ต้องการลบสินค้าทั้งหมดออกจากตะกร้า?')
                    if (ok) {
                      clearCart(sessionId); setCart([]); setScreen('menu')
                      channelRef.current?.send({ type: 'broadcast', event: 'cart_cleared', payload: { clientId: clientIdRef.current } })
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 transition"
                >
                  ล้างตะกร้า
                </button>
                <button onClick={() => setScreen('menu')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {cart.map((c) => (
                <div key={c.product.id} className="flex items-center gap-3">
                  {c.product.image_url && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative bg-gray-100 dark:bg-slate-700">
                      <Image src={c.product.image_url} alt={c.product.name} fill className="object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-slate-100 text-sm truncate">{c.product.name}</p>
                    <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">{fmt(c.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => changeQty(c.product.id, -1)}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-300"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="font-bold w-5 text-center text-sm text-gray-900 dark:text-slate-100">{c.qty}</span>
                    <button
                      onClick={() => changeQty(c.product.id, 1)}
                      className="w-8 h-8 rounded-full bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold w-16 text-right text-gray-800 dark:text-slate-200">
                    {fmt(c.product.price * c.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-gray-800 dark:text-slate-200">รวม</span>
                <span className="font-bold text-2xl text-primary-600 dark:text-primary-400">{fmt(cartTotal)}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 rounded-2xl transition disabled:opacity-50 text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30"
              >
                {isPlacing ? (
                  <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังสั่ง...</>
                ) : (
                  <><ChefHat size={18} /> สั่งอาหาร {fmt(cartTotal)}</>
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">
                ออเดอร์จะส่งไปยังครัวทันที — {paymentMode === 'counter' ? 'ชำระเงินที่เคาน์เตอร์' : 'ชำระเงินได้ทีหลัง'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dialog */}
      {dialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2 text-lg">{dialog.title}</h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-5 whitespace-pre-line">{dialog.message}</p>
            <div className="flex gap-3">
              {dialog.confirm && (
                <button
                  onClick={() => { dialog.resolve(false); setDialog(null) }}
                  className="flex-1 py-3 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
              )}
              <button
                onClick={() => { dialog.resolve(true); setDialog(null) }}
                className="flex-1 py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition"
              >
                {dialog.confirm ? 'ยืนยัน' : 'รับทราบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  )
}
