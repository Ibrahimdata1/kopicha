'use client'

import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { generatePromptPayPayload } from '@/lib/qr'
import { AlertTriangle, X, Ticket, Check, Clock, ShieldOff, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import type { Shop } from '@/lib/types'

const MONTHLY_FEE = 199
const SETUP_FEE = 999
const TRIAL_DAYS = 7

interface Props {
  shop: Shop | null
  children: React.ReactNode
}

function getDaysOverdue(shop: Shop | null): number {
  // No subscription date set → if setup_fee_paid, they need to pay monthly
  if (!shop?.subscription_paid_until) {
    // If they paid setup fee but no subscription date, treat as overdue immediately
    return shop?.setup_fee_paid ? 999 : 0
  }
  const paidUntil = new Date(shop.subscription_paid_until)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  paidUntil.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - paidUntil.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function getTrialDaysLeft(shop: Shop | null): number {
  if (!shop?.first_product_at) return -1 // -1 means no trial started (unlimited)
  const firstProduct = new Date(shop.first_product_at)
  const expiry = new Date(firstProduct.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function getStorageKey(shopId: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `qrforpay_sub_dismissed_${shopId}_${today}`
}

export default function SubscriptionGuard({ shop, children }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referralError, setReferralError] = useState('')
  const [referralLoading, setReferralLoading] = useState(false)
  const [setupFeePaid, setSetupFeePaid] = useState(shop?.setup_fee_paid ?? false)
  const [companyPromptpay, setCompanyPromptpay] = useState('0994569544')

  // Fetch company PromptPay from super admin profile (pending_promptpay field)
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('pending_promptpay')
      .eq('role', 'super_admin')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.pending_promptpay) setCompanyPromptpay(data.pending_promptpay)
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">ร้านค้าถูกระงับ</h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
            ร้านค้าของคุณถูกระงับการใช้งาน<br />กรุณาติดต่อผู้ดูแลระบบ
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
  const trialExpired = !setupFeePaid && trialDaysLeft >= 0 && trialDaysLeft <= 0
  const isBlocked = setupFeePaid && daysOverdue >= 3
  const needsReminder = setupFeePaid && daysOverdue > 0 && daysOverdue < 3

  // Check if already dismissed today
  useEffect(() => {
    if (!shop?.id || !needsReminder) return
    const wasDismissed = localStorage.getItem(getStorageKey(shop.id))
    if (wasDismissed) setDismissed(true)
  }, [shop?.id, needsReminder])

  const handleDismiss = () => {
    if (shop?.id) {
      localStorage.setItem(getStorageKey(shop.id), '1')
    }
    setDismissed(true)
  }

  const handleReferralSubmit = useCallback(async () => {
    const code = referralCode.trim().toUpperCase()
    if (!code) { setReferralError('กรุณากรอกรหัสตัวแทน'); return }
    if (!shop?.id) return

    setReferralLoading(true)
    setReferralError('')

    try {
      const supabase = createClient()
      // Check if code exists in agents table
      const { data: agent } = await supabase
        .from('agents')
        .select('id, code')
        .eq('code', code)
        .eq('active', true)
        .single()

      if (!agent) {
        setReferralError('รหัสตัวแทนไม่ถูกต้อง')
        return
      }

      // Mark setup fee as paid (agent collected it)
      const { error: updateErr } = await supabase
        .from('shops')
        .update({ setup_fee_paid: true, referral_code: code })
        .eq('id', shop.id)

      if (updateErr) throw updateErr

      setSetupFeePaid(true)
    } catch (err: unknown) {
      setReferralError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
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
        .update({ setup_fee_paid: true })
        .eq('id', shop.id)
      setSetupFeePaid(true)
    } catch { /* ignore */ }
  }, [shop?.id])

  let setupQr = ''
  let monthlyQr = ''
  try {
    setupQr = generatePromptPayPayload(companyPromptpay, SETUP_FEE)
    monthlyQr = generatePromptPayPayload(companyPromptpay, MONTHLY_FEE)
  } catch { /* ignore */ }

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
              หมดระยะทดลองใช้ฟรี
            </h2>
            <p className="text-gray-600 dark:text-slate-400 text-sm">
              ชำระค่าแรกเข้า ฿{SETUP_FEE.toLocaleString()} เพื่อใช้งานต่อ
            </p>
          </div>

          {/* QR Payment */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3 text-center">
              ค่าแรกเข้า ฿{SETUP_FEE.toLocaleString()} (จ่ายครั้งเดียว)
            </p>
            {setupQr && (
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-white border border-gray-200 dark:border-slate-600 rounded-xl inline-block">
                  <QRCodeSVG value={setupQr} size={180} />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
              สแกน QR PromptPay เพื่อชำระเงิน
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 text-center">
              PromptPay: {companyPromptpay}
            </p>
            <button
              onClick={handleMarkPaid}
              className="mt-4 w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition"
            >
              โอนแล้ว
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
            <span className="text-xs text-gray-400 dark:text-slate-500">หรือ</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          </div>

          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              <Ticket size={13} className="inline mr-1.5 text-gray-400" />
              รหัสตัวแทน (ชำระผ่านตัวแทนแล้ว)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralError('') }}
                className="input flex-1"
                placeholder="เช่น AG-SOMCHAI-X4K2"
                onKeyDown={(e) => e.key === 'Enter' && handleReferralSubmit()}
              />
              <button
                onClick={handleReferralSubmit}
                disabled={referralLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition shrink-0 min-h-[44px]"
              >
                {referralLoading ? <span className="spinner-sm" /> : <Check size={18} />}
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
            ไม่สามารถใช้ระบบได้
          </h2>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
            กรุณาชำระค่าบริการรายเดือนเพื่อใช้งานต่อ
          </p>

          {/* Package info */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 text-left">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">ร้าน: <strong className="text-gray-800 dark:text-slate-200">{shop?.name}</strong></p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">แพ็คเกจ: <strong className="text-gray-800 dark:text-slate-200">Pro (รายเดือน)</strong></p>
            <p className="text-xs text-red-500 dark:text-red-400">หมดอายุ: <strong>{shop?.subscription_paid_until ? new Date(shop.subscription_paid_until).toLocaleDateString('en-GB') : 'ยังไม่ได้ตั้ง'}</strong> (เกิน {daysOverdue} วัน)</p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">
              ค่าบริการ ฿{MONTHLY_FEE}/เดือน
            </p>
            {monthlyQr && (
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-white border border-gray-200 dark:border-slate-600 rounded-xl inline-block">
                  <QRCodeSVG value={monthlyQr} size={180} />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-400">
              สแกน QR PromptPay เพื่อชำระเงิน
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              PromptPay: {companyPromptpay}
            </p>
          </div>

          <p className="text-xs text-gray-400 dark:text-slate-500">
            หลังชำระเงินแล้ว กรุณาแจ้งแอดมินเพื่อเปิดระบบ
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Trial banner — show remaining days */}
      {!setupFeePaid && trialDaysLeft >= 1 && trialDaysLeft <= 3 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 px-4 py-2.5 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <Clock size={14} className="inline mr-1" />
            ทดลองใช้ฟรีเหลืออีก <strong>{trialDaysLeft} วัน</strong> — หลังจากนั้นต้องชำระค่าแรกเข้า ฿{SETUP_FEE.toLocaleString()}
          </p>
        </div>
      )}

      {/* Monthly reminder banner (once per day) */}
      {needsReminder && !dismissed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800/40 w-full max-w-sm p-6 text-center animate-slide-up">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
              กรุณาชำระค่าบริการ
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
              ร้าน: <strong>{shop?.name}</strong> · แพ็คเกจ Pro (รายเดือน)
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
              หมดอายุ: <strong>{shop?.subscription_paid_until ? new Date(shop.subscription_paid_until).toLocaleDateString('en-GB') : '-'}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
              ค่าบริการรายเดือน ฿{MONTHLY_FEE}
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 mb-4">
              เกินกำหนด {daysOverdue} วัน — ระบบจะถูกระงับใน {3 - daysOverdue} วัน
            </p>

            {!showPayment ? (
              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 text-sm transition"
                >
                  ภายหลัง
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition"
                >
                  ชำระเงิน
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4">
                {monthlyQr && (
                  <div className="flex justify-center mb-3">
                    <div className="p-3 bg-white border border-gray-200 dark:border-slate-600 rounded-xl inline-block">
                      <QRCodeSVG value={monthlyQr} size={160} />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  สแกน QR PromptPay เพื่อชำระเงิน
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  PromptPay: {companyPromptpay}
                </p>
                <button
                  onClick={handleDismiss}
                  className="mt-3 w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition"
                >
                  ชำระแล้ว / ปิด
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  )
}
