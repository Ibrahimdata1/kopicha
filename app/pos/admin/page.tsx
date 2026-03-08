'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  AlertCircle,
  Building2,
  Check,
  Clock,
  ShieldAlert,
  Store,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import type { PendingUser } from '@/lib/types'

interface ShopRow {
  id: string
  name: string
  promptpay_id: string
  created_at: string
  owner?: {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
  } | null
  order_count?: number
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [shops, setShops] = useState<ShopRow[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p?.role !== 'super_admin') { router.push('/pos/sessions'); return }
      await loadData()
    })
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load all shops
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name, promptpay_id, created_at')
        .order('created_at', { ascending: false })

      // Load all owners
      const { data: owners } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, shop_id')
        .eq('role', 'owner')

      // Merge
      const ownerByShop: Record<string, ShopRow['owner']> = {}
      for (const o of owners ?? []) {
        if (o.shop_id) ownerByShop[o.shop_id] = o
      }

      const enriched: ShopRow[] = (shopsData ?? []).map((s) => ({
        ...s,
        owner: ownerByShop[s.id] ?? null,
      }))
      setShops(enriched)

      // Load pending users
      const { data: pending } = await supabase.rpc('get_pending_users')
      setPendingUsers((pending ?? []) as PendingUser[])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (user: PendingUser) => {
    setError('')
    try {
      const { error: rpcErr } = await supabase.rpc('approve_owner_signup', {
        p_user_id: user.id,
        p_shop_name: user.pending_shop_name ?? 'New Shop',
        p_promptpay: user.pending_promptpay ?? '',
      })
      if (rpcErr) throw rpcErr
      setSuccessMsg(`อนุมัติ ${user.full_name ?? user.email} เรียบร้อย`)
      setTimeout(() => setSuccessMsg(''), 3000)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  const handleReject = async (userId: string) => {
    if (!window.confirm('ปฏิเสธและลบคำขอนี้?')) return
    setError('')
    try {
      await supabase.from('profiles').update({ pending_shop_name: null, pending_promptpay: null }).eq('id', userId)
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  const handleDeactivateOwner = async (ownerId: string, shopName: string) => {
    if (!window.confirm(`ยกเลิกสิทธิ์เจ้าของร้าน "${shopName}"?\nผู้ใช้จะไม่สามารถเข้าระบบได้จนกว่าจะอนุมัติใหม่`)) return
    setError('')
    try {
      await supabase.from('profiles').update({ role: null, shop_id: null }).eq('id', ownerId)
      setSuccessMsg('ยกเลิกสิทธิ์เรียบร้อย')
      setTimeout(() => setSuccessMsg(''), 3000)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (!window.confirm(`ลบร้าน "${shopName}" ทั้งหมด?\nข้อมูลสินค้า หมวดหมู่ และทีมงานจะถูกลบด้วย`)) return
    setError('')
    try {
      // Remove all owners from this shop first
      await supabase.from('profiles').update({ role: null, shop_id: null }).eq('shop_id', shopId).eq('role', 'owner')
      await supabase.from('profiles').update({ shop_id: null }).eq('shop_id', shopId).eq('role', 'cashier')
      await supabase.from('shops').delete().eq('id', shopId)
      setShops((prev) => prev.filter((s) => s.id !== shopId))
      setSuccessMsg('ลบร้านเรียบร้อย')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 border-[3px]" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <ShieldAlert size={20} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Super Admin Panel</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            จัดการร้านค้า {shops.length} ร้าน · คำขอรอ {pendingUsers.length} รายการ
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-xl text-sm">
          <Check size={16} />
          {successMsg}
        </div>
      )}

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-700/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/40">
            <Clock size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-amber-800 dark:text-amber-300">
              รออนุมัติ ({pendingUsers.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {pendingUsers.map((user) => (
              <div key={user.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {user.full_name ?? user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                  {user.pending_shop_name && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                      ร้าน: <span className="font-medium">{user.pending_shop_name}</span>
                      {user.pending_promptpay && (
                        <span className="text-gray-400 dark:text-slate-500"> · {user.pending_promptpay}</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(user.id)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-600 rounded-lg transition-colors"
                    title="ปฏิเสธ"
                  >
                    <X size={15} />
                  </button>
                  <button
                    onClick={() => handleApprove(user)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Check size={14} />
                    อนุมัติ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Shops */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <Store size={16} className="text-gray-400 dark:text-slate-500" />
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">
            ร้านค้าทั้งหมด ({shops.length})
          </h2>
        </div>

        {shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500 gap-2">
            <Building2 size={32} strokeWidth={1.5} />
            <p className="text-sm">ยังไม่มีร้านค้า</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {shops.map((shop) => (
              <div key={shop.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{shop.name}</p>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                      Active
                    </span>
                  </div>
                  {shop.owner ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users size={12} className="text-gray-400 dark:text-slate-500" />
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {shop.owner.full_name ?? shop.owner.email}
                        <span className="text-gray-400 dark:text-slate-500 ml-1.5 text-xs">
                          {shop.owner.email}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">ไม่มีเจ้าของ</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    PromptPay: {shop.promptpay_id || '-'} ·{' '}
                    {new Date(shop.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {shop.owner && (
                    <button
                      onClick={() => handleDeactivateOwner(shop.owner!.id, shop.name)}
                      className="text-xs px-3 py-1.5 border border-orange-200 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg font-medium transition-colors"
                    >
                      ยกเลิกสิทธิ์
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteShop(shop.id, shop.name)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-600 rounded-lg transition-colors"
                    title="ลบร้าน"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
