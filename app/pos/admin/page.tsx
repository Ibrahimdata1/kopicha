'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
  ShieldOff,
  ShieldCheck,
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
  is_deleted?: boolean
  deleted_at?: string | null
  owner?: {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
  } | null
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
  const [dateInputs, setDateInputs] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const { confirm, ConfirmDialogUI } = useConfirm()

  useEffect(() => {
    if (profile?.role !== 'super_admin') return
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load all shops directly via supabase (RLS allows super_admin)
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name, promptpay_id, subscription_paid_until, created_at, is_deleted, deleted_at')
        .order('created_at', { ascending: false })

      // Load owners
      const { data: owners } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, shop_id')
        .in('role', ['owner'])

      // Also load deactivated owners (role is null but have shop_id)
      const { data: deactivated } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, shop_id')
        .is('role', null)
        .not('shop_id', 'is', null)

      const allOwners = [...(owners ?? []), ...(deactivated ?? [])]
      const ownerByShop: Record<string, ShopRow['owner']> = {}
      for (const o of allOwners) {
        if (o.shop_id) ownerByShop[o.shop_id] = o
      }

      const enriched: ShopRow[] = (shopsData ?? []).map((shop) => ({
        ...shop,
        owner: ownerByShop[shop.id] ?? null,
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

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    setError('')
    try {
      if (!profile?.id) throw new Error('ไม่พบโปรไฟล์')
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ pending_promptpay: companyPromptpay.trim() })
        .eq('id', profile.id)
      if (updateErr) throw updateErr
      showSuccess('บันทึก PromptPay รับเงินเรียบร้อย')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSetSubscriptionDate = async (shopId: string, shopName: string) => {
    const dateStr = dateInputs[shopId]
    if (!dateStr) { setError('กรุณาเลือกวันที่'); return }
    const today = new Date().toISOString().slice(0, 10)
    if (dateStr < today) { setError('วันที่ต้องไม่น้อยกว่าวันนี้'); return }
    const ok = await confirm({
      title: `ตั้งวันหมดอายุร้าน "${shopName}"?`,
      message: `หมดอายุวันที่ ${dateStr}`,
      confirmLabel: 'ยืนยัน',
    })
    if (!ok) return
    setActionLoading(shopId)
    setError('')
    try {
      const { error: updateErr } = await supabase
        .from('shops')
        .update({ subscription_paid_until: dateStr })
        .eq('id', shopId)
      if (updateErr) throw updateErr
      setShops((prev) =>
        prev.map((s) => (s.id === shopId ? { ...s, subscription_paid_until: dateStr } : s))
      )
      showSuccess(`ตั้งวันหมดอายุร้าน "${shopName}" เป็น ${dateStr}`)
      setDateInputs((prev) => ({ ...prev, [shopId]: '' }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeactivateOwner = async (ownerId: string, shopId: string, shopName: string) => {
    const ok = await confirm({
      title: `ยกเลิกสิทธิ์ร้าน "${shopName}"?`,
      message: 'Owner และ Cashier ทั้งหมดในร้านจะเข้าระบบไม่ได้จนกว่าจะอนุมัติใหม่',
      confirmLabel: 'ยกเลิกสิทธิ์',
      danger: true,
    })
    if (!ok) return
    setError('')
    setActionLoading(ownerId)
    try {
      // Deactivate owner
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: null })
        .eq('id', ownerId)
      if (updateErr) throw updateErr
      // Deactivate all cashiers in this shop
      await supabase.from('profiles').update({ role: null }).eq('shop_id', shopId).eq('role', 'cashier')
      setShops((prev) =>
        prev.map((s) =>
          s.owner?.id === ownerId ? { ...s, owner: { ...s.owner!, role: null } } : s
        )
      )
      showSuccess('ยกเลิกสิทธิ์เรียบร้อย')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivateOwner = async (ownerId: string, shopId: string, shopName: string) => {
    const ok = await confirm({
      title: `อนุมัติกลับร้าน "${shopName}"?`,
      message: 'Owner และ Cashier ทั้งหมดจะกลับเข้าระบบได้',
      confirmLabel: 'อนุมัติกลับ',
    })
    if (!ok) return
    setError('')
    setActionLoading(ownerId)
    try {
      // Reactivate owner
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: 'owner' })
        .eq('id', ownerId)
      if (updateErr) throw updateErr
      // Reactivate cashiers in this shop (those with shop_id but null role)
      await supabase.from('profiles').update({ role: 'cashier' }).eq('shop_id', shopId).is('role', null)
      setShops((prev) =>
        prev.map((s) =>
          s.owner?.id === ownerId ? { ...s, owner: { ...s.owner!, role: 'owner' } } : s
        )
      )
      showSuccess('อนุมัติกลับเรียบร้อย')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSoftDeleteShop = async (shopId: string, shopName: string) => {
    const ok = await confirm({
      title: `ลบร้าน "${shopName}"?`,
      message: 'ร้านจะถูกซ่อน (soft delete) สามารถกู้คืนได้ภายหลัง',
      confirmLabel: 'ลบร้าน',
      danger: true,
    })
    if (!ok) return
    setError('')
    setActionLoading(shopId)
    try {
      // Deactivate all users in this shop (owner + cashiers)
      await supabase.from('profiles').update({ role: null }).eq('shop_id', shopId)
      // Soft delete shop
      const { error: updateErr } = await supabase
        .from('shops')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', shopId)
      if (updateErr) throw updateErr
      setShops((prev) =>
        prev.map((s) =>
          s.id === shopId ? { ...s, is_deleted: true, deleted_at: new Date().toISOString() } : s
        )
      )
      showSuccess(`ลบร้าน "${shopName}" เรียบร้อย`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUndeleteShop = async (shopId: string, shopName: string) => {
    const ok = await confirm({
      title: `กู้คืนร้าน "${shopName}"?`,
      message: 'ร้านจะกลับมาใช้งานได้ตามปกติ',
      confirmLabel: 'กู้คืน',
    })
    if (!ok) return
    setError('')
    setActionLoading(shopId)
    try {
      // Undelete shop
      const { error: updateErr } = await supabase
        .from('shops')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', shopId)
      if (updateErr) throw updateErr
      setShops((prev) =>
        prev.map((s) =>
          s.id === shopId ? { ...s, is_deleted: false, deleted_at: null } : s
        )
      )
      showSuccess(`กู้คืนร้าน "${shopName}" เรียบร้อย`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setActionLoading(null)
    }
  }

  const getShopStatus = (shop: ShopRow): { label: string; color: string } => {
    if (shop.is_deleted) return { label: 'Deleted', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }
    if (shop.owner?.role !== 'owner') return { label: 'Deactivated', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' }
    return { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
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

      {/* System Config - PromptPay */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <Settings size={16} className="text-gray-400 dark:text-slate-500" />
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">ตั้งค่า PromptPay</h2>
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

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400"
            placeholder="ค้นหาร้านค้า..."
          />
        </div>

        {shops.filter(s => {
          if (!search.trim()) return true
          const q = search.toLowerCase()
          return s.name.toLowerCase().includes(q) || s.owner?.email?.toLowerCase().includes(q) || s.owner?.full_name?.toLowerCase().includes(q) || s.promptpay_id?.includes(q)
        }).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500 gap-2">
            <Building2 size={32} strokeWidth={1.5} />
            <p className="text-sm">ยังไม่มีร้านค้า</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {shops.filter(s => {
              if (!search.trim()) return true
              const q = search.toLowerCase()
              return s.name.toLowerCase().includes(q) || s.owner?.email?.toLowerCase().includes(q) || s.owner?.full_name?.toLowerCase().includes(q) || s.promptpay_id?.includes(q)
            }).map((shop) => {
              const status = getShopStatus(shop)
              const isDeleted = !!shop.is_deleted
              const isDeactivated = shop.owner?.role !== 'owner' && !isDeleted

              return (
                <div
                  key={shop.id}
                  className={`px-6 py-4 ${isDeleted ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-gray-900 dark:text-slate-100 ${isDeleted ? 'line-through text-red-400 dark:text-red-500' : ''}`}>
                          {shop.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
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
                        PromptPay: {shop.promptpay_id || '-'} · สร้าง{' '}
                        {new Date(shop.created_at).toLocaleDateString('en-GB')}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          !shop.subscription_paid_until ||
                          new Date(shop.subscription_paid_until) < new Date()
                            ? 'text-red-500 dark:text-red-400 font-medium'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        สมาชิก:{' '}
                        {shop.subscription_paid_until
                          ? `ถึง ${new Date(shop.subscription_paid_until).toLocaleDateString('en-GB')}`
                          : 'ยังไม่เปิดใช้'}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* Date picker for subscription */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={dateInputs[shop.id] || ''}
                        onChange={(e) =>
                          setDateInputs((prev) => ({ ...prev, [shop.id]: e.target.value }))
                        }
                        className="text-xs px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300"
                      />
                      <button
                        onClick={() => handleSetSubscriptionDate(shop.id, shop.name)}
                        disabled={actionLoading === shop.id || !dateInputs[shop.id]}
                        className="text-xs px-3 py-1.5 border border-green-200 dark:border-green-700/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                        title="เลือกวันหมดอายุ"
                      >
                        <Calendar size={13} />
                        ตั้งวันหมดอายุ
                      </button>
                    </div>

                    {/* Deactivate / Reactivate */}
                    {shop.owner && !isDeleted ? (
                      shop.owner.role === 'owner' ? (
                        <button
                          onClick={() => handleDeactivateOwner(shop.owner!.id, shop.id, shop.name)}
                          disabled={actionLoading === shop.owner.id}
                          className="text-xs px-3 py-1.5 border border-orange-200 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                        >
                          <ShieldOff size={13} />
                          ยกเลิกสิทธิ์
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateOwner(shop.owner!.id, shop.id, shop.name)}
                          disabled={actionLoading === shop.owner.id}
                          className="text-xs px-3 py-1.5 border border-blue-200 dark:border-blue-700/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                        >
                          <ShieldCheck size={13} />
                          อนุมัติกลับ
                        </button>
                      )
                    ) : null}

                    {/* Soft Delete / Undelete */}
                    {isDeleted ? (
                      <button
                        onClick={() => handleUndeleteShop(shop.id, shop.name)}
                        disabled={actionLoading === shop.id}
                        className="text-xs px-3 py-1.5 border border-blue-200 dark:border-blue-700/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                      >
                        <RotateCcw size={13} />
                        กู้คืน
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSoftDeleteShop(shop.id, shop.name)}
                        disabled={actionLoading === shop.id}
                        className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-700/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        ลบร้าน
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
