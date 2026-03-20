'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { generatePromptPayPayload } from '@/lib/qr'
import { AlertTriangle, Ticket, Check, Clock, ShieldOff, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useI18n } from '@/lib/i18n/context'
import type { Shop } from '@/lib/types'

const MONTHLY_FEE = 199
const SETUP_FEE = 1399
const TRIAL_DAYS = 7

interface Props {
  shop: Shop | null
  children: React.ReactNode
}

function getDaysOverdue(shop: Shop | null): number {
  if (!shop?.subscription_paid_until) return 0
  const paidUntil = new Date(shop.subscription_paid_until)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  paidUntil.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - paidUntil.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function getDaysUntilExpiry(shop: Shop | null): number {
  if (!shop?.subscription_paid_until) return Infinity
  const paidUntil = new Date(shop.subscription_paid_until)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  paidUntil.setHours(0, 0, 0, 0)
  return Math.floor((paidUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getTrialDaysLeft(shop: Shop | null): number {
  if (!shop?.first_product_at) return -1 // -1 means no trial started (unlimited)
  const firstProduct = new Date(shop.first_product_at)
  const expiry = new Date(firstProduct.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function toLocalDateStr(d: Date): string {
  // Use local year/month/day to avoid UTC timezone shift
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addOneMonth(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  return d
}

function calcNewExpiry(shop: Shop | null): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!shop?.subscription_paid_until) {
    if (shop?.first_product_at) {
      const trialEnd = new Date(shop.first_product_at)
      trialEnd.setHours(0, 0, 0, 0)
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
      const base = trialEnd > today ? trialEnd : today
      return toLocalDateStr(addOneMonth(base))
    }
    return toLocalDateStr(addOneMonth(today))
  }

  const originalExpiry = new Date(shop.subscription_paid_until)
  originalExpiry.setHours(0, 0, 0, 0)
  const daysLate = Math.floor((today.getTime() - originalExpiry.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLate > 10) {
    return toLocalDateStr(addOneMonth(today))
  } else {
    return toLocalDateStr(addOneMonth(originalExpiry))
  }
}


export default function SubscriptionGuard({ shop, children }: Props) {
  const [referralCode, setReferralCode] = useState('')
  const [referralError, setReferralError] = useState('')
  const [referralLoading, setReferralLoading] = useState(false)
  const [setupFeePaid, setSetupFeePaid] = useState(shop?.setup_fee_paid ?? false)
  const [companyPromptpay, setCompanyPromptpay] = useState<string | null>(null)
  const { t } = useI18n()

  // Fetch company PromptPay via DB function (bypasses RLS)
  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_company_promptpay').then(({ data }) => {
      setCompanyPromptpay(data ?? '0994569544')
    })
  }, [])

  // ═══ ร้านถูกลบ (soft delete) → แสดงหน้าระงับ ═══
  if (shop?.is_deleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800/40 w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldOff size={30} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{t('sub.shopSuspended')}</h2>
          <p className="text-gray-600 dark:text-stone-500 text-sm mb-6">
            {t('sub.shopSuspendedDesc')}<br />{t('sub.contactAdmin')}
          </p>
          <a
            href="mailto:contact.runawaytech@gmail.com"
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary-500/25 mb-3"
          >
            <Mail size={16} />
            contact.runawaytech@gmail.com
          </a>
        </div>
      </div>
    )
  }

  const daysOverdue = getDaysOverdue(shop)
  const trialDaysLeft = getTrialDaysLeft(shop)
  const daysUntilExpiry = getDaysUntilExpiry(shop)

  // Paid/referral user trial (setup_fee_paid=true, subscription_paid_until=null)
  // Trial starts from first_product_at, just like direct users
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const paidTrialEnd = (() => {
    if (!setupFeePaid || shop?.subscription_paid_until || !shop?.first_product_at) return null
    const d = new Date(shop.first_product_at)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + TRIAL_DAYS)
    return d
  })()
  const paidTrialExpired = !!paidTrialEnd && paidTrialEnd < today
  const paidTrialDaysLeft = paidTrialEnd
    ? Math.floor((paidTrialEnd.getTime() - today.getTime()) / 86400000)
    : null

  // === PAID MEMBER (setup_fee_paid = true) ===
  // Block immediately on day 1 overdue — no grace period
  // Also block when paid/referral trial has expired
  const isBlocked = (setupFeePaid && daysOverdue >= 1) || paidTrialExpired
  // Warn 3 days before subscription expiry or trial end
  const paidNearExpiry = setupFeePaid && !paidTrialExpired && (
    (daysOverdue === 0 && daysUntilExpiry <= 3) ||
    (paidTrialDaysLeft !== null && paidTrialDaysLeft >= 0 && paidTrialDaysLeft <= 3)
  )

  // === TRIAL USER (setup_fee_paid = false) ===
  // Admin may extend trial via subscription_paid_until — when that expires → ฿999 paywall
  const trialExpiredByExtension = !setupFeePaid && !!shop?.subscription_paid_until && daysOverdue > 0
  const trialExpiredNaturally = !setupFeePaid && !shop?.subscription_paid_until && trialDaysLeft >= 0 && trialDaysLeft <= 0
  const trialExpired = trialExpiredByExtension || trialExpiredNaturally

  // Near-expiry banner for trial users with admin extension (3 days before)
  const nearExpiry = !setupFeePaid && !!shop?.subscription_paid_until && daysUntilExpiry >= 0 && daysUntilExpiry <= 2


  const handleReferralSubmit = useCallback(async () => {
    const normalized = referralCode.trim().toUpperCase().replace(/-/g, '')
    if (!normalized) { setReferralError(t('sub.enterReferralCode')); return }
    if (!shop?.id) return

    setReferralLoading(true)
    setReferralError('')

    try {
      const supabase = createClient()
      // Fetch active agents and match after stripping dashes from both sides
      const { data: agents } = await supabase
        .from('agents')
        .select('id, code')
        .eq('active', true)
      const agent = agents?.find(a => a.code.replace(/-/g, '') === normalized) ?? null

      if (!agent) {
        setReferralError(t('sub.invalidReferralCode'))
        return
      }

      // Mark setup fee as paid + auto set subscription +1 calendar month
      const { error: updateErr } = await supabase
        .from('shops')
        .update({ setup_fee_paid: true, referral_code: agent.code, subscription_paid_until: calcNewExpiry(shop) })
        .eq('id', shop.id)

      if (updateErr) throw updateErr

      window.location.reload()
    } catch (err: unknown) {
      setReferralError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setReferralLoading(false)
    }
  }, [referralCode, shop?.id])

  const handleMarkPaid = useCallback(async () => {
    if (!shop?.id) return
    try {
      const supabase = createClient()
      await supabase
        .from('shops')
        .update({ setup_fee_paid: true, subscription_paid_until: calcNewExpiry(shop) })
        .eq('id', shop.id)
      setSetupFeePaid(true)
    } catch { /* ignore */ }
  }, [shop?.id])

  const setupQr = useMemo(() => {
    try { return companyPromptpay ? generatePromptPayPayload(companyPromptpay, SETUP_FEE) : '' } catch { return '' }
  }, [companyPromptpay])

  const monthlyQr = useMemo(() => {
    try { return companyPromptpay ? generatePromptPayPayload(companyPromptpay, MONTHLY_FEE) : '' } catch { return '' }
  }, [companyPromptpay])

  // === SETUP FEE PAYWALL (trial expired, hasn't paid ฿999) ===
  if (trialExpired && !setupFeePaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-amber-200 dark:border-amber-800/40 w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={30} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {t('sub.trialExpired')}
            </h2>
            <p className="text-gray-600 dark:text-stone-500 text-sm">
              {t('sub.paySetupFee', { amount: `฿${SETUP_FEE.toLocaleString()}` })}
            </p>
          </div>

          {/* QR Payment */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3 text-center">
              {t('sub.setupFee', { amount: `฿${SETUP_FEE.toLocaleString()}` })}
            </p>
            {setupQr && (
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-white border border-gray-200 dark:border-slate-600 rounded-xl inline-block">
                  <QRCodeSVG value={setupQr} size={180} />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-stone-500 text-center">
              {t('sub.scanQR')}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 text-center">
              PromptPay: {companyPromptpay}
            </p>
            <button
              onClick={handleMarkPaid}
              className="mt-4 w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition"
            >
              {t('sub.transferred')}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
            <span className="text-xs text-gray-400 dark:text-slate-500">{t('common.or')}</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          </div>

          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              <Ticket size={13} className="inline mr-1.5 text-gray-400" />
              {t('sub.referralCode')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => { setReferralCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()); setReferralError('') }}
                className="input flex-1 tracking-widest"
                placeholder="เช่น AGSOMCHAIX4K2"
                autoComplete="off"
                onKeyDown={(e) => e.key === 'Enter' && handleReferralSubmit()}
              />
              <button
                onClick={handleReferralSubmit}
                disabled={referralLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition shrink-0 min-h-[44px] flex items-center justify-center"
              >
                {referralLoading ? <span className="spinner-sm" /> : <span className="text-lg leading-none">✓</span>}
              </button>
            </div>
            {referralError && (
              <p className="text-xs text-red-500 mt-1.5">{referralError}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // === MONTHLY SUBSCRIPTION BLOCKED ===
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800/40 w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={30} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            หมดระยะทดลองใช้แล้ว
          </h2>
          <p className="text-gray-600 dark:text-stone-500 text-sm mb-4">
            ชำระค่าบริการรายเดือน ฿{MONTHLY_FEE} เพื่อใช้งานต่อ
          </p>

          {/* Package info */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 text-left">
            <p className="text-xs text-gray-500 dark:text-stone-500 mb-1">{t('sub.shopLabel')}: <strong className="text-gray-800 dark:text-slate-200">{shop?.name}</strong></p>
            <p className="text-xs text-gray-500 dark:text-stone-500 mb-1">{t('sub.package')}: <strong className="text-gray-800 dark:text-slate-200">Pro ({t('sub.monthly')})</strong></p>
            {paidTrialExpired ? (
              <p className="text-xs text-red-500 dark:text-red-400">หมดระยะทดลองใช้: <strong>{paidTrialEnd?.toLocaleDateString('en-GB')}</strong></p>
            ) : (
              <p className="text-xs text-red-500 dark:text-red-400">{t('sub.expires')}: <strong>{shop?.subscription_paid_until ? new Date(shop.subscription_paid_until).toLocaleDateString('en-GB') : t('sub.notSet')}</strong> ({t('sub.overdue')} {daysOverdue} {t('common.days')})</p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">
              {t('sub.fee', { amount: `฿${MONTHLY_FEE}` })}
            </p>
            {monthlyQr && (
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-white border border-gray-200 dark:border-slate-600 rounded-xl inline-block">
                  <QRCodeSVG value={monthlyQr} size={180} />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-stone-500">
              {t('sub.scanQR')}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              PromptPay: {companyPromptpay}
            </p>
          </div>

          <button
            onClick={async () => {
              if (!shop?.id) return
              const supabase = createClient()
              await supabase.from('shops').update({ subscription_paid_until: calcNewExpiry(shop) }).eq('id', shop.id)
              await new Promise(r => setTimeout(r, 600))
              window.location.reload()
            }}
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition mt-2"
          >
            {t('sub.paidExtend')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Near-expiry warning banner */}
      {nearExpiry && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 px-4 py-2.5 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <Clock size={14} className="inline mr-1" />
            {daysUntilExpiry === 0
              ? `การทดลองใช้ฟรีหมดอายุวันนี้ — กรุณาชำระค่าบริการ ฿${MONTHLY_FEE} เพื่อใช้งานต่อ`
              : `การทดลองใช้ฟรีจะหมดอายุในอีก ${daysUntilExpiry} วัน — กรุณาชำระค่าบริการ ฿${MONTHLY_FEE}`}
          </p>
        </div>
      )}

      {/* Trial banner — natural trial only (no admin extension), last 3 days */}
      {!setupFeePaid && !shop?.subscription_paid_until && trialDaysLeft >= 1 && trialDaysLeft <= 3 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 px-4 py-2.5 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <Clock size={14} className="inline mr-1" />
            {t('sub.trialRemaining', { days: String(trialDaysLeft), amount: `฿${SETUP_FEE.toLocaleString()}` })}
          </p>
        </div>
      )}

      {/* Paid member — near expiry warning (subscription or trial) */}
      {paidNearExpiry && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 px-4 py-2.5 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <Clock size={14} className="inline mr-1" />
            {(() => {
              const days = paidTrialDaysLeft !== null ? paidTrialDaysLeft : daysUntilExpiry
              return days <= 0
                ? <>ระยะทดลองใช้หมดอายุ<strong>วันนี้</strong> — กรุณาชำระ ฿{MONTHLY_FEE} เพื่อใช้งานต่อ</>
                : <>ระยะทดลองใช้จะหมดอายุในอีก <strong>{days} วัน</strong> — กรุณาชำระ ฿{MONTHLY_FEE} เพื่อใช้งานต่อเนื่อง</>
            })()}
            {' · '}
            <a href="/pos/settings" className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100">ชำระเงิน</a>
          </p>
        </div>
      )}

      {children}
    </>
  )
}
