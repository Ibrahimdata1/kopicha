'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import { useI18n } from '@/lib/i18n/context'
import { validatePromptPay } from '@/lib/validate-promptpay'
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  RotateCcw,
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
  setup_fee_paid: boolean
  first_product_at: string | null
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
  const { t } = useI18n()
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
        .select('id, name, promptpay_id, subscription_paid_until, setup_fee_paid, first_product_at, created_at, is_deleted, deleted_at')
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
      if (!profile?.id) throw new Error(t('admin.profileNotFound'))
      const digits = companyPromptpay.trim().replace(/\D/g, '')
      const ppError = validatePromptPay(digits)
      if (ppError) throw new Error(ppError)
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ pending_promptpay: digits })
        .eq('id', profile.id)
      if (updateErr) throw updateErr
      showSuccess(t('admin.promptpaySaved'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSetSubscriptionDate = async (shopId: string, shopName: string) => {
    const dateStr = dateInputs[shopId]
    if (!dateStr) { setError(t('admin.selectDate')); return }
    const today = new Date().toISOString().slice(0, 10)
    if (dateStr < today) { setError(t('admin.dateNotBeforeToday')); return }
    const ok = await confirm({
      title: `${t('admin.setExpiryShop')} "${shopName}"?`,
      message: `${t('admin.expiryDate')} ${dateStr}`,
      confirmLabel: t('common.confirm'),
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
      showSuccess(`${t('admin.setExpiryShop')} "${shopName}" ${t('admin.to')} ${dateStr}`)
      setDateInputs((prev) => ({ ...prev, [shopId]: '' }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleSoftDeleteShop = async (shopId: string, shopName: string) => {
    const ok = await confirm({
      title: `${t('admin.deleteShop')} "${shopName}"?`,
      message: t('admin.softDeleteMessage'),
      confirmLabel: t('admin.deleteShopBtn'),
      danger: true,
    })
    if (!ok) return
    setError('')
    setActionLoading(shopId)
    try {
      // Deactivate everyone in this shop (owner + cashier)
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
      showSuccess(`${t('admin.deleteShop')} "${shopName}" ${t('admin.success')}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleUndeleteShop = async (shopId: string, shopName: string) => {
    const ok = await confirm({
      title: `${t('admin.restoreShop')} "${shopName}"?`,
      message: t('admin.restoreMessage'),
      confirmLabel: t('admin.restoreBtn'),
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
      // Find shop owner_id to reactivate correctly
      const { data: shopData } = await supabase.from('shops').select('owner_id').eq('id', shopId).single()
      if (shopData?.owner_id) {
        // Reactivate owner
        await supabase.from('profiles').update({ role: 'owner' }).eq('id', shopData.owner_id).is('role', null)
      }
      // Reactivate cashiers (everyone else with this shop_id and null role)
      await supabase.from('profiles').update({ role: 'cashier' }).eq('shop_id', shopId).is('role', null)
      setShops((prev) =>
        prev.map((s) =>
          s.id === shopId ? { ...s, is_deleted: false, deleted_at: null } : s
        )
      )
      showSuccess(`${t('admin.restoreShop')} "${shopName}" ${t('admin.success')}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setActionLoading(null)
    }
  }

  const getShopStatus = (shop: ShopRow): { label: string; color: string } => {
    if (shop.is_deleted) return { label: t('admin.statusDeleted'), color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }
    return { label: t('admin.statusActive'), color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 border-[3px]" />
      </div>
    )
  }

  const TRIAL_DAYS = 7
  const subStatusText = (shop: ShopRow): string => {
    const now = new Date()
    // Paid subscription
    if (shop.subscription_paid_until) {
      const until = new Date(shop.subscription_paid_until)
      if (until >= now) return `ชำระแล้ว ถึง ${until.toLocaleDateString('en-GB')}`
      return `หมดอายุ ${until.toLocaleDateString('en-GB')}`
    }
    // Trial
    if (shop.first_product_at) {
      const trialEnd = new Date(new Date(shop.first_product_at).getTime() + TRIAL_DAYS * 86400000)
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)
      if (daysLeft > 0) return `ทดลองใช้ เหลือ ${daysLeft} วัน (ถึง ${trialEnd.toLocaleDateString('en-GB')})`
      return `ทดลองใช้หมดแล้ว (${trialEnd.toLocaleDateString('en-GB')})`
    }
    return 'ยังไม่มีสินค้า (trial ยังไม่เริ่ม)'
  }
  const subStatusColor = (shop: ShopRow): string => {
    const now = new Date()
    if (shop.subscription_paid_until) {
      return new Date(shop.subscription_paid_until) >= now
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-500 dark:text-red-400'
    }
    if (shop.first_product_at) {
      const trialEnd = new Date(new Date(shop.first_product_at).getTime() + TRIAL_DAYS * 86400000)
      if (trialEnd >= now) return 'text-amber-500 dark:text-amber-400'
    }
    return 'text-red-500 dark:text-red-400'
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('admin.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-stone-500">
            {t('admin.manageShops')} {shops.length} {t('admin.shopsUnit')}
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
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">{t('admin.promptpaySettings')}</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('admin.promptpayFromOwner')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={companyPromptpay}
              onChange={(e) => setCompanyPromptpay(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={13}
              className="input flex-1"
              placeholder={t('admin.promptpayPlaceholder')}
            />
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Save size={14} />
              {savingConfig ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </section>

      {/* All Shops */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <Store size={16} className="text-gray-400 dark:text-slate-500" />
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">
            {t('admin.allShops')} ({shops.length})
          </h2>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400"
            placeholder={t('admin.searchShops')}
          />
        </div>

        {shops.filter(s => {
          if (!search.trim()) return true
          const q = search.toLowerCase()
          return s.name.toLowerCase().includes(q) || s.owner?.email?.toLowerCase().includes(q) || s.owner?.full_name?.toLowerCase().includes(q) || s.promptpay_id?.includes(q)
        }).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500 gap-2">
            <Building2 size={32} strokeWidth={1.5} />
            <p className="text-sm">{t('admin.noShops')}</p>
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
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('admin.noOwner')}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        PromptPay: {shop.promptpay_id || '-'} · {t('admin.created')}{' '}
                        {new Date(shop.created_at).toLocaleDateString('en-GB')}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${subStatusColor(shop)}`}>
                        สมาชิก: {subStatusText(shop)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* Date picker for subscription */}
                    <div className="flex items-center gap-1.5">
                      <label className="relative block w-40 cursor-pointer">
                        <input
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={dateInputs[shop.id] || ''}
                          onChange={(e) =>
                            setDateInputs((prev) => ({ ...prev, [shop.id]: e.target.value }))
                          }
                          className="text-xs px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 w-full cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </label>
                      <button
                        onClick={() => handleSetSubscriptionDate(shop.id, shop.name)}
                        disabled={actionLoading === shop.id || !dateInputs[shop.id] || dateInputs[shop.id] < new Date().toISOString().slice(0, 10)}
                        className="text-xs px-3 py-1.5 border border-green-200 dark:border-green-700/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                        title={t('admin.selectExpiryDate')}
                      >
                        <Calendar size={13} />
                        {t('admin.setExpiry')}
                      </button>
                    </div>

                    {/* Soft Delete / Undelete */}
                    {isDeleted ? (
                      <button
                        onClick={() => handleUndeleteShop(shop.id, shop.name)}
                        disabled={actionLoading === shop.id}
                        className="text-xs px-3 py-1.5 border border-blue-200 dark:border-blue-700/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                      >
                        <RotateCcw size={13} />
                        {t('admin.restoreBtn')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSoftDeleteShop(shop.id, shop.name)}
                        disabled={actionLoading === shop.id}
                        className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-700/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        {t('admin.deleteShopBtn')}
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
