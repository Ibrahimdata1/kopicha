'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import { useI18n } from '@/lib/i18n/context'
import type { PendingUser, TeamMember } from '@/lib/types'
import { useConfirm } from '@/components/ConfirmDialog'
import { validatePromptPay } from '@/lib/validate-promptpay'
import {
  Camera,
  Check,
  Clock,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Save,
  Settings2,
  ShieldAlert,
  Smartphone,
  Store,
  Trash2,
  UserPlus,
  Users,
  User,
  ShieldCheck,
} from 'lucide-react'
import Image from 'next/image'

// ─── types ────────────────────────────────────────────────────────────────────
interface CashierCred { username: string; password: string }

function generateTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  // ensure at least 1 digit
  pw = pw.slice(0, 7) + String(Math.floor(Math.random() * 8) + 2)
  return pw
}

export default function SettingsPage() {
  const supabase = createClient()
  const { confirm, ConfirmDialogUI } = useConfirm()
  const { profile, shop, refreshShop } = usePosContext()
  const { t } = useI18n()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)

  // Shop form
  const [shopName, setShopName] = useState(shop?.name ?? '')
  const [promptpay, setPromptpay] = useState(shop?.promptpay_id ?? '')
  const [tableCount, setTableCount] = useState(shop?.table_count != null ? String(shop.table_count) : '')
  const [paymentMode, setPaymentMode] = useState<'auto' | 'counter'>(shop?.payment_mode ?? 'counter')
  const [isSavingShop, setIsSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)
  const [error, setError] = useState('')

  // Cashier form
  const [cashierUsername, setCashierUsername] = useState('')
  const [cashierPassword, setCashierPassword] = useState('')
  const [showCashierPw, setShowCashierPw] = useState(false)
  const [isCreatingCashier, setIsCreatingCashier] = useState(false)
  // Reset password
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetFormId, setResetFormId] = useState<string | null>(null)
  const [resetNewPw, setResetNewPw] = useState('')
  const [showResetPw, setShowResetPw] = useState(false)

  // Stored credentials (visible to owner anytime)
  const [cashierCreds, setCashierCreds] = useState<Record<string, CashierCred>>({})
  const [showPwFor, setShowPwFor] = useState<string | null>(null)

  // Logo upload
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const isSuperAdmin = profile?.role === 'super_admin'
  const isOwner = profile?.role === 'owner'

  // ─── load team ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (profile?.shop_id) {
        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('shop_id', profile.shop_id)
          .order('created_at')
        setTeam((teamData ?? []) as TeamMember[])
      }
      if (profile?.role === 'super_admin') {
        const { data: pending } = await supabase.rpc('get_pending_users')
        setPendingUsers((pending ?? []) as PendingUser[])
      }
      // Load cashier credentials for owner
      if (['owner', 'super_admin'].includes(profile?.role ?? '')) {
        const res = await fetch('/api/cashier-credentials')
        if (res.ok) setCashierCreds(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [])

  // ─── copy helper ──────────────────────────────────────────────────────────
  const copyTo = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {})
  }

  // ─── save shop ────────────────────────────────────────────────────────────
  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop?.id) return
    const name = shopName.trim()
    if (!name || name.length < 2) { setError(t('settings.shopNameMin2')); return }
    if (name.length > 100) { setError(t('settings.shopNameTooLong')); return }
    const ppDigits = promptpay.replace(/\D/g, '')
    const ppError = validatePromptPay(ppDigits)
    if (ppError) { setError(ppError); return }
    const tcStr = tableCount.trim()
    const tc = tcStr === '' ? 0 : parseInt(tcStr, 10)
    if (isNaN(tc) || tc < 0 || tc > 999) { setError(t('settings.tableCountInvalid')); return }

    setIsSavingShop(true)
    setError('')
    try {
      const { error: updateErr } = await supabase
        .from('shops')
        .update({ name, promptpay_id: ppDigits, table_count: tc, payment_mode: paymentMode })
        .eq('id', shop.id)
      if (updateErr) throw updateErr
      await refreshShop()
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsSavingShop(false)
    }
  }

  // ─── create cashier ───────────────────────────────────────────────────────
  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault()
    const uname = cashierUsername.trim().toLowerCase()
    const pw = cashierPassword

    // Validation
    if (!uname) { setError('กรุณากรอก Username'); return }
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) { setError(t('settings.usernameInvalid')); return }
    if (!pw) { setError('กรุณากรอกรหัสผ่าน'); return }
    if (/[^\x20-\x7E]/.test(pw)) { setError('รหัสผ่านใช้ได้เฉพาะตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น'); return }
    if (pw.length < 8) { setError(t('settings.passwordMin8')); return }
    if (pw.length > 100) { setError('รหัสผ่านยาวเกินไป'); return }
    if (!/[0-9]/.test(pw)) { setError(t('settings.passwordNeedsNumber')); return }

    const shopId = shop?.id ?? ''
    const fakeEmail = `${uname}@${shopId.slice(0, 8)}.cashier`
    setIsCreatingCashier(true)
    setError('')
    try {
      const res = await fetch('/api/create-cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: uname, email: fakeEmail, password: pw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? t('common.error'))

      // Reload team list + credentials
      if (profile?.shop_id) {
        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('shop_id', profile.shop_id)
          .order('created_at')
        setTeam((teamData ?? []) as TeamMember[])
      }
      const credsRes = await fetch('/api/cashier-credentials')
      if (credsRes.ok) setCashierCreds(await credsRes.json())

      setCashierUsername('')
      setCashierPassword('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsCreatingCashier(false)
    }
  }

  // ─── reset cashier password ───────────────────────────────────────────────
  const handleResetPassword = async (member: TeamMember, newPw: string) => {
    if (/[^\x20-\x7E]/.test(newPw)) { setError('รหัสผ่านใช้ได้เฉพาะตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น'); return }
    if (newPw.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    if (!/[0-9]/.test(newPw)) { setError('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'); return }

    setResettingId(member.id)
    setError('')
    try {
      const res = await fetch('/api/reset-cashier-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: member.id, new_password: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? t('common.error'))
      // Refresh stored credentials
      const credsRes = await fetch('/api/cashier-credentials')
      if (credsRes.ok) setCashierCreds(await credsRes.json())
      setResetFormId(null)
      setResetNewPw('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setResettingId(null)
    }
  }

  // ─── remove member ────────────────────────────────────────────────────────
  const handleRemoveMember = async (memberId: string) => {
    const ok = await confirm({ title: t('settings.removeMemberConfirm'), confirmLabel: t('common.delete'), danger: true })
    if (!ok) return
    try {
      const { error: rpcErr } = await supabase.rpc('remove_team_member', { p_profile_id: memberId })
      if (rpcErr) throw rpcErr
      setTeam((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  // ─── approve owner (super admin) ──────────────────────────────────────────
  const handleApproveOwner = async (userId: string, shopNameApprove: string, ppApprove: string) => {
    try {
      const { error: rpcErr } = await supabase.rpc('approve_owner_signup', {
        p_user_id: userId, p_shop_name: shopNameApprove, p_promptpay: ppApprove,
      })
      if (rpcErr) throw rpcErr
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  // ─── logo upload ──────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !shop?.id) return
    if (!file.type.startsWith('image/')) { setError(t('settings.selectImageFile')); return }
    if (file.size > 2 * 1024 * 1024) { setError(t('settings.fileMax2MB')); return }
    setIsUploadingLogo(true)
    setError('')
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const filePath = `${shop.id}/logo.${ext}`
      const { error: uploadErr } = await supabase.storage.from('shop-logos').upload(filePath, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('shop-logos').getPublicUrl(filePath)
      const logoUrl = urlData.publicUrl + '?t=' + Date.now()
      const { error: updateErr } = await supabase.from('shops').update({ logo_url: logoUrl }).eq('id', shop.id)
      if (updateErr) throw updateErr
      await refreshShop()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('settings.uploadFailed'))
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // ─── role helpers ─────────────────────────────────────────────────────────
  const ROLE_LABEL: Record<string, string> = {
    super_admin: 'Super Admin',
    owner: t('settings.roleOwner'),
    cashier: t('settings.roleCashier'),
  }
  const RoleIcon = ({ role }: { role: string }) => {
    if (role === 'super_admin') return <ShieldAlert size={14} className="text-purple-500 shrink-0" />
    if (role === 'owner') return <ShieldCheck size={14} className="text-primary-500 shrink-0" />
    return <User size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 border-[3px]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {ConfirmDialogUI}
      <h1 className="page-title flex items-center gap-2">
        <Settings2 size={20} className="text-subtle" />
        {t('settings.title')}
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/40">
          {error}
        </div>
      )}

      {/* Subscription Status */}
      {isOwner && shop && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-gray-400 dark:text-slate-500" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">{t('settings.subscriptionStatus')}</h2>
          </div>
          {(() => {
            const now = new Date()
            const firstProduct = shop.first_product_at ? new Date(shop.first_product_at) : null
            const trialEnd = firstProduct ? new Date(firstProduct.getTime() + 7 * 24 * 60 * 60 * 1000) : null
            const subDate = shop.subscription_paid_until ? new Date(shop.subscription_paid_until) : null
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const subDay = subDate ? new Date(subDate.getTime()) : null; subDay?.setHours(0, 0, 0, 0)
            const subExpired = subDay && subDay < today
            // Only show trial if no paid subscription date set at all
            const isInTrial = !subDate && !shop.setup_fee_paid && trialEnd && trialEnd > now
            return (
              <div className="space-y-2">
                {!subDate && !shop.setup_fee_paid && !firstProduct && (
                  <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <span className="text-sm text-blue-700 dark:text-blue-300">{t('settings.trialFree7Days')}</span>
                  </div>
                )}
                {isInTrial && trialEnd && (
                  <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <span className="text-sm text-amber-700 dark:text-amber-300">{t('settings.freeTrial')}</span>
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {t('settings.expires')} {trialEnd.toLocaleDateString('en-GB')} ({t('settings.remaining')} {Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)} {t('common.days')})
                    </span>
                  </div>
                )}
                {subDate && (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${subExpired ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                    <span className={`text-sm ${subExpired ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                      {subExpired ? t('settings.expired') : shop.setup_fee_paid ? t('settings.member') : t('settings.freeTrial')}
                    </span>
                    <span className={`text-sm font-semibold ${subExpired ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                      {t('settings.until')} {subDate.toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
        </section>
      )}

      {/* Shop Settings */}
      {(isOwner || isSuperAdmin) && shop && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} className="text-gray-400 dark:text-slate-500" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">{t('settings.shopInfo')}</h2>
          </div>

          {/* Shop Logo */}
          {isOwner && (
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100 dark:border-slate-700">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shrink-0 flex items-center justify-center">
                {shop.logo_url
                  ? <Image src={shop.logo_url} alt="Logo" width={64} height={64} className="object-cover w-full h-full" />
                  : <Store size={24} className="text-gray-300 dark:text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-1">{t('settings.shopLogo')}</p>
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  isUploadingLogo ? 'bg-gray-100 dark:bg-slate-700 text-gray-400' : 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-950/50'
                }`}>
                  <Camera size={13} />
                  {isUploadingLogo ? t('settings.uploading') : t('settings.changePhoto')}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
                </label>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('settings.max2MB')}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveShop} className="space-y-4">
            {/* ชื่อร้าน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('settings.shopName')}</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                maxLength={100}
                className="input"
                required
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">2–100 ตัวอักษร</p>
            </div>

            {/* PromptPay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('settings.promptpayNumber')}</label>
              <input
                type="text"
                value={promptpay}
                onChange={(e) => setPromptpay(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={13}
                placeholder="0812345678"
                className="input"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">เบอร์มือถือ 10 หลัก (06/08/09) หรือเลขบัตรประชาชน/นิติบุคคล 13 หลัก</p>
            </div>

            {/* จำนวนโต๊ะ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('settings.tableCount')}</label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={tableCount}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '' || parseInt(v) >= 0) setTableCount(v)
                }}
                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault() }}
                placeholder={t('settings.tableCountPlaceholder')}
                className="input"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('settings.tableCountHint')} (0–999)</p>
            </div>

            {/* Payment mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t('settings.paymentSystem')}</label>
              <div className="grid grid-cols-2 gap-3">
                {(['counter', 'auto'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMode === mode
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                        : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                  >
                    {mode === 'counter'
                      ? <CreditCard size={22} className={paymentMode === mode ? 'text-primary-500' : 'text-gray-400 dark:text-slate-500'} />
                      : <Smartphone size={22} className={paymentMode === mode ? 'text-primary-500' : 'text-gray-400 dark:text-slate-500'} />}
                    <span className={`text-sm font-semibold ${paymentMode === mode ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-stone-500'}`}>
                      {mode === 'counter' ? t('settings.payAtCounter') : t('settings.autoPayment')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-stone-500 text-center leading-snug">
                      {mode === 'counter' ? t('settings.payAtCounterDesc') : t('settings.autoPaymentDesc')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={isSavingShop}
              className={`flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl transition-all disabled:opacity-50 ${
                shopSaved
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              }`}
            >
              {shopSaved ? (
                <><Check size={16} /> บันทึกแล้ว</>
              ) : isSavingShop ? (
                <><span className="spinner-sm border-white border-t-transparent" /> {t('common.saving')}</>
              ) : (
                <><Save size={16} /> {t('common.save')}</>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Team */}
      {(isOwner || isSuperAdmin) && shop && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-gray-400 dark:text-slate-500" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">{t('settings.team')}</h2>
          </div>

          {/* Team list */}
          <div className="divide-y divide-gray-100 dark:divide-slate-700 mb-5 -mx-6">
            {team.map((member) => {
              const isCashier = member.role === 'cashier'
              const username = isCashier && member.email ? member.email.split('@')[0] : null
              const isMe = member.id === profile?.id
              return (
                <div key={member.id}>
                <div className="flex items-center justify-between px-6 py-3 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RoleIcon role={member.role ?? ''} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                          {username ?? (member.full_name ?? member.email)}
                        </p>
                        {isMe && (
                          <span className="shrink-0 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full">คุณ</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-stone-500">
                        {ROLE_LABEL[member.role ?? ''] ?? member.role}
                        {!isCashier && member.email ? ` · ${member.email}` : ''}
                      </p>
                      {isCashier && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {cashierCreds[member.id] ? (
                            <>
                              <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                                PW: {showPwFor === member.id ? cashierCreds[member.id].password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPwFor(showPwFor === member.id ? null : member.id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                              >
                                {showPwFor === member.id ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyTo(cashierCreds[member.id].password)}
                                className="text-gray-400 hover:text-amber-500"
                              >
                                <Copy size={11} />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-slate-500 italic">ไม่มีข้อมูล — กด รีเซ็ต PW เพื่อตั้งใหม่</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isMe && (
                    <div className="flex gap-1.5 shrink-0">
                      {isCashier && (
                        <button
                          type="button"
                          onClick={() => { setResetFormId(resetFormId === member.id ? null : member.id); setResetNewPw(''); setShowResetPw(false); setError('') }}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-stone-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 hover:border-amber-200 transition-colors"
                        >
                          รีเซ็ต PW
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-slate-600 hover:border-red-300 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {resetFormId === member.id && (
                  <div className="px-6 pb-3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showResetPw ? 'text' : 'password'}
                        value={resetNewPw}
                        onChange={(e) => setResetNewPw(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                        placeholder="รหัสผ่านใหม่"
                        maxLength={100}
                        className="input text-sm pr-10 w-full"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowResetPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showResetPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={resettingId === member.id}
                      onClick={() => handleResetPassword(member, resetNewPw)}
                      className="text-xs px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold disabled:opacity-50"
                    >
                      {resettingId === member.id ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'บันทึก'}
                    </button>
                    <button type="button" onClick={() => setResetFormId(null)} className="text-xs px-2 py-2 text-gray-400 hover:text-gray-600">ยกเลิก</button>
                  </div>
                )}
                </div>
              )
            })}
          </div>


          {/* Add cashier form */}
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={15} className="text-gray-400 dark:text-slate-500" />
            <h3 className="font-semibold text-gray-700 dark:text-slate-300 text-sm">{t('settings.addCashier')}</h3>
          </div>
          <form onSubmit={handleCreateCashier} className="space-y-3">
            <div>
              <input
                type="text"
                value={cashierUsername}
                onChange={(e) => setCashierUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username (a-z, 0-9, _)"
                maxLength={30}
                className="input text-sm"
                required
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('settings.usernameHint')}</p>
            </div>
            <div>
              <div className="relative">
                <input
                  type={showCashierPw ? 'text' : 'password'}
                  value={cashierPassword}
                  onChange={(e) => setCashierPassword(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                  placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว + ตัวเลข)"
                  maxLength={100}
                  className="input text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCashierPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  {showCashierPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Password strength hints */}
              <div className="flex gap-4 mt-1.5">
                <span className={`text-xs ${cashierPassword.length >= 8 ? 'text-emerald-500' : 'text-gray-400 dark:text-slate-500'}`}>
                  {cashierPassword.length >= 8 ? '✓' : '○'} อย่างน้อย 8 ตัว
                </span>
                <span className={`text-xs ${/[0-9]/.test(cashierPassword) ? 'text-emerald-500' : 'text-gray-400 dark:text-slate-500'}`}>
                  {/[0-9]/.test(cashierPassword) ? '✓' : '○'} มีตัวเลข
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingCashier}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
            >
              <UserPlus size={15} />
              {isCreatingCashier ? t('settings.creating') : t('settings.addCashier')}
            </button>
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </form>

        </section>
      )}

      {/* Pending Users — super admin */}
      {isSuperAdmin && pendingUsers.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-700/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <h2 className="font-bold text-gray-900 dark:text-slate-100">
                {t('settings.pendingApproval')} ({pendingUsers.length})
              </h2>
            </div>
            <a href="/pos/admin" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
              {t('settings.viewAll')} →
            </a>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div key={user.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-slate-100">{user.full_name ?? user.email}</p>
                  <p className="text-xs text-gray-500 dark:text-stone-500">{user.email}</p>
                  {user.pending_shop_name && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-0.5">
                      {user.pending_shop_name}{user.pending_promptpay && ` · ${user.pending_promptpay}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleApproveOwner(user.id, user.pending_shop_name ?? 'New Shop', user.pending_promptpay ?? '')}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  <Check size={13} /> {t('settings.approve')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Super admin panel link */}
      {isSuperAdmin && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-primary-500" />
              <h2 className="font-bold text-gray-900 dark:text-slate-100">Admin Panel</h2>
            </div>
            <a href="/pos/admin" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors">
              {t('settings.manageShops')} →
            </a>
          </div>
        </section>
      )}

      {/* บัญชีของคุณ */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3">{t('settings.yourAccount')}</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center shrink-0">
            <RoleIcon role={profile?.role ?? ''} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{profile?.full_name}</p>
            <p className="text-sm text-gray-500 dark:text-stone-500">
              {ROLE_LABEL[profile?.role ?? ''] ?? profile?.role}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
