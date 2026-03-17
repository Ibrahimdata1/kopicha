'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import {
  AlertCircle,
  Building2,
  CalendarPlus,
  Check,
  Save,
  Settings,
  ShieldAlert,
  Store,
  Trash2,
  Users,
} from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'

interface ShopRow {
  id: string
  name: string
  promptpay_id: string
  subscription_paid_until: string | null
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
  const { profile } = usePosContext()
  const [shops, setShops] = useState<ShopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [companyPromptpay, setCompanyPromptpay] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const { confirm, ConfirmDialogUI } = useConfirm()

  useEffect(() => {
    if (profile?.role !== 'super_admin') return
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load all shops
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name, promptpay_id, subscription_paid_until, created_at')
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

      // Load company PromptPay from super admin profile
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('pending_promptpay')
        .eq('role', 'super_admin')
        .limit(1)
        .single()
      if (adminProfile?.pending_promptpay) setCompanyPromptpay(adminProfile.pending_promptpay)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    setError('')
    try {
      const res = await fetch('/api/admin/update-promptpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptpay: companyPromptpay }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด')
      setSuccessMsg('บันทึก PromptPay รับเงินเรียบร้อย')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleDeactivateOwner = async (ownerId: string, shopName: string) => {
    const ok = await confirm({ title: `ยกเลิกสิทธิ์ร้าน "${shopName}"?`, message: 'ผู้ใช้จะเข้าระบบไม่ได้จนกว่าจะอนุมัติใหม่', confirmLabel: 'ยกเลิกสิทธิ์', danger: true })
    if (!ok) return
    setError('')
    setActionLoading(ownerId)
    try {
      await supabase.from('profiles').update({ role: null, shop_id: null }).eq('id', ownerId)
      setSuccessMsg('ยกเลิกสิทธิ์เรียบร้อย')
      setTimeout(() => setSuccessMsg(''), 3000)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    const ok = await confirm({ title: `ลบร้าน "${shopName}"?`, message: 'ข้อมูลสินค้า หมวดหมู่ และทีมงานจะถูกลบทั้งหมด', confirmLabel: 'ลบร้าน', danger: true })
    if (!ok) return
    setError('')
    setActionLoading(shopId)
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
    } finally {
      setActionLoading(null)
    }
  }

  const handleExtendSubscription = async (shopId: string, shopName: string) => {
    const ok = await confirm({ title: `ต่ออายุร้าน "${shopName}" 30 วัน?`, confirmLabel: 'ต่ออายุ' })
    if (!ok) return
    setActionLoading(shopId)
    setError('')
    try {
      const shop = shops.find((s) => s.id === shopId)
      const baseDate = shop?.subscription_paid_until
        ? new Date(Math.max(new Date(shop.subscription_paid_until).getTime(), Date.now()))
        : new Date()
      baseDate.setDate(baseDate.getDate() + 30)
      const newDate = baseDate.toISOString().slice(0, 10)

      const { error: updateErr } = await supabase
        .from('shops')
        .update({ subscription_paid_until: newDate })
        .eq('id', shopId)
      if (updateErr) throw updateErr

      setShops((prev) =>
        prev.map((s) => (s.id === shopId ? { ...s, subscription_paid_until: newDate } : s))
      )
      setSuccessMsg(`ต่ออายุร้าน "${shopName}" ถึง ${newDate}`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
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
      {ConfirmDialogUI}
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <ShieldAlert size={20} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Super Admin Panel</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            จัดการร้านค้า {shops.length} ร้าน
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

      {/* System Config */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <Settings size={16} className="text-gray-400 dark:text-slate-500" />
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">ตั้งค่าระบบ</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            PromptPay รับเงินจาก Owner
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={companyPromptpay}
              onChange={(e) => setCompanyPromptpay(e.target.value)}
              className="input flex-1"
              placeholder="เบอร์โทร หรือ เลขบัตรประชาชน"
            />
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Save size={14} />
              {savingConfig ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </section>

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
                  <p className={`text-xs mt-0.5 ${
                    !shop.subscription_paid_until || new Date(shop.subscription_paid_until) < new Date()
                      ? 'text-red-500 dark:text-red-400 font-medium'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    สมาชิก: {shop.subscription_paid_until
                      ? `ถึง ${new Date(shop.subscription_paid_until).toLocaleDateString('th-TH')}`
                      : 'ยังไม่เปิดใช้'}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleExtendSubscription(shop.id, shop.name)}
                    disabled={actionLoading === shop.id}
                    className="text-xs px-3 py-1.5 border border-green-200 dark:border-green-700/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                    title="ต่ออายุ 30 วัน"
                  >
                    <CalendarPlus size={13} />
                    +30 วัน
                  </button>
                  {shop.owner && (
                    <button
                      onClick={() => handleDeactivateOwner(shop.owner!.id, shop.name)}
                      disabled={actionLoading === shop.owner.id || actionLoading === shop.id}
                      className="text-xs px-3 py-1.5 border border-orange-200 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      ยกเลิกสิทธิ์
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteShop(shop.id, shop.name)}
                    disabled={actionLoading === shop.id}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
