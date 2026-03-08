'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Coffee, Store, User, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'shop'>('account')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [promptpay, setPromptpay] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAccountStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน (รหัสผ่านอย่างน้อย 6 ตัว)')
      return
    }
    setError('')
    setStep('shop')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopName.trim() || !promptpay.trim()) {
      setError('กรุณากรอกชื่อร้านและหมายเลข PromptPay')
      return
    }
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })
      if (signUpError) throw signUpError

      // Submit owner info (shop name + promptpay) via RPC
      const { error: rpcError } = await supabase.rpc('submit_owner_info', {
        p_shop_name: shopName.trim(),
        p_promptpay: promptpay.trim(),
      })
      if (rpcError) throw rpcError

      router.push('/pending')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-teal-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-slate-100 dark:border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
              <Coffee size={28} strokeWidth={2} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">ลงทะเบียนร้านค้า</h1>
            <p className="text-muted text-sm mt-1">
              {step === 'account' ? 'ขั้นตอน 1/2: ข้อมูลบัญชี' : 'ขั้นตอน 2/2: ข้อมูลร้านค้า'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 'account' || step === 'shop' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 'shop' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>

          {step === 'account' ? (
            <form onSubmit={handleAccountStep} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <User size={13} className="inline mr-1.5 text-slate-400" />
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                  placeholder="ชื่อ นามสกุล"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Mail size={13} className="inline mr-1.5 text-slate-400" />
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Lock size={13} className="inline mr-1.5 text-slate-400" />
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3"
              >
                ถัดไป
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Store size={13} className="inline mr-1.5 text-slate-400" />
                  ชื่อร้านค้า
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input"
                  placeholder="เช่น Coffee Corner"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  หมายเลข PromptPay (เบอร์โทร หรือ เลขประจำตัวผู้เสียภาษี)
                </label>
                <input
                  type="text"
                  value={promptpay}
                  onChange={(e) => setPromptpay(e.target.value)}
                  className="input"
                  placeholder="0812345678"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('account'); setError('') }}
                  className="btn-secondary flex-1 py-3"
                >
                  <ArrowLeft size={15} />
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-3"
                >
                  {loading ? (
                    <><span className="spinner-sm" /> กำลังสมัคร...</>
                  ) : 'สมัครสมาชิก'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-muted mt-6">
            มีบัญชีแล้ว?{' '}
            <a href="/login" className="text-primary-500 dark:text-primary-400 font-medium hover:underline">
              เข้าสู่ระบบ
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
