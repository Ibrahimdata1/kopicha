'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Bell, Check, ShoppingBag } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface NewOrder {
  id: string
  order_number: number
  table_number: string | null
  total_amount: number | null
  created_at: string
  items: { name: string; quantity: number }[]
}

interface Props {
  shopId: string
}

function fmt(n: number | null | undefined) {
  return '฿' + (n ?? 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function OrderNotification({ shopId }: Props) {
  const { t } = useI18n()
  const supabase = createClient()
  const [queue, setQueue] = useState<NewOrder[]>([])
  const seenIds = useRef<Set<string>>(new Set())
  const mountTime = useRef<string>(new Date().toISOString())
  const ready = useRef(false)

  // On mount: mark all existing orders as "seen" so we only notify for NEW ones
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(200)

      for (const o of data ?? []) seenIds.current.add(o.id)
      mountTime.current = new Date().toISOString()
      ready.current = true
    })()
  }, [shopId])

  const playSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const play = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur)
      }
      play(880, 0, 0.15)
      play(1100, 0.18, 0.15)
      play(880, 0.36, 0.15)
    } catch { /* ignore */ }
  }, [])

  const showOrderNotification = useCallback(async (orderId: string) => {
    if (seenIds.current.has(orderId)) return
    seenIds.current.add(orderId)

    // Wait a bit for order_items to be committed
    await new Promise((r) => setTimeout(r, 800))

    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, table_number, total_amount, created_at, order_source')
      .eq('id', orderId)
      .single()

    if (!order || order.order_source !== 'customer') return

    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, product:products(name)')
      .eq('order_id', orderId)
      .eq('item_status', 'active')

    const newOrder: NewOrder = {
      id: order.id,
      order_number: order.order_number,
      table_number: order.table_number,
      total_amount: order.total_amount,
      created_at: order.created_at,
      items: (items ?? []).map((i) => {
        const raw = i.product as unknown
        const name = (raw && typeof raw === 'object' && !Array.isArray(raw))
          ? (raw as { name: string }).name
          : 'สินค้า'
        return { name, quantity: i.quantity }
      }),
    }

    if (newOrder.items.length > 0) {
      setQueue((prev) => [...prev, newOrder])
      playSound()
    }
  }, [shopId, playSound])

  // Poll every 3 seconds for orders created after mount
  useEffect(() => {
    if (!shopId) return

    const poll = async () => {
      if (!ready.current) return

      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('shop_id', shopId)
        .eq('order_source', 'customer')
        .gte('created_at', mountTime.current)
        .order('created_at', { ascending: false })
        .limit(20)

      for (const o of data ?? []) {
        if (!seenIds.current.has(o.id)) {
          showOrderNotification(o.id)
        }
      }
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [shopId, showOrderNotification])

  // Also try Realtime as faster path
  useEffect(() => {
    if (!shopId) return

    const channel = supabase
      .channel(`order-notify:${shopId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `shop_id=eq.${shopId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT' && ready.current) {
          const orderId = payload.new?.id as string
          if (orderId) showOrderNotification(orderId)
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [shopId, showOrderNotification])

  const handleAcknowledge = (orderId: string) => {
    setQueue((prev) => prev.filter((o) => o.id !== orderId))
  }

  if (queue.length === 0) return null

  const current = queue[0]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary-200 dark:border-primary-800/40 w-full max-w-sm animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="bg-primary-500 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <Bell size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-base">{t('notify.newOrder')}</h3>
            <p className="text-white/80 text-sm">
              {current.table_number ? t('notify.table', { table: current.table_number }) : t('common.noTable')}
              {queue.length > 1 && (
                <span className="ml-2 bg-white/30 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  +{queue.length - 1} {t('notify.moreWaiting')}
                </span>
              )}
            </p>
          </div>
          <p className="text-white font-bold text-xl">{fmt(current.total_amount)}</p>
        </div>

        {/* Items */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ShoppingBag size={14} className="text-gray-400 dark:text-slate-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-stone-500">
              {t('notify.orderedItems', { count: current.items.length })}
            </span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {current.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 dark:text-slate-200">{item.name}</span>
                <span className="font-bold text-gray-900 dark:text-slate-100 tabular-nums">
                  ×{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Acknowledge button */}
        <div className="px-5 pb-5">
          <button
            onClick={() => handleAcknowledge(current.id)}
            className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-base active:scale-[0.98]"
          >
            <Check size={18} strokeWidth={3} />
            {t('notify.acknowledge')}
          </button>
        </div>
      </div>
    </div>
  )
}
