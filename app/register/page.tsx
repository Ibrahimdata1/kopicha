'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Coffee, Store, User, Mail, Lock, ArrowRight, ArrowLeft, Handshake, Phone, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react'
import { validatePromptPay } from '@/lib/validate-promptpay'
import { useI18n } from '@/lib/i18n/context'

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function generateCode(name: string) {
  const clean = name.trim().toUpperCase().replace(/\s+/g, '').slice(0, 8)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `AG-${clean}-${rand}`
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  const initialMode = searchParams.get('mode') === 'agent' ? 'agent' : 'shop'

  const [mode, setMode] = useState<'shop' | 'agent'>(initialMode)
  const { t } = useI18n()

  // Shop registration state
  const [step, setStep] = useState<'account' | 'shop'>('account')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [promptpay, setPromptpay] = useState('')
  const [manualRef, setManualRef] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [asyncErrors, setAsyncErrors] = useState<Record<string, string>>({})
  const [asyncChecking, setAsyncChecking] = useState<Record<string, boolean>>({})

  // Async validation (email, shop name)
  const checkEmailAsync = async () => {
    const v = email.trim()
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return
    setAsyncChecking((p) => ({ ...p, email: true }))
    try {
      const res = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v }),
      })
      const data = await res.json()
      setAsyncErrors((p) => ({ ...p, email: data.available ? '' : data.reason }))
    } catch { /* ignore */ }
    finally { setAsyncChecking((p) => ({ ...p, email: false })) }
  }

  const checkShopNameAsync = async () => {
    const v = shopName.trim()
    if (!v || v.length < 2) return
    setAsyncChecking((p) => ({ ...p, shopName: true }))
    try {
      const res = await fetch('/api/check-shop-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: v }),
      })
      const data = await res.json()
      setAsyncErrors((p) => ({ ...p, shopName: data.available ? '' : data.reason }))
    } catch { /* ignore */ }
    finally { setAsyncChecking((p) => ({ ...p, shopName: false })) }
  }

  // Realtime field validation
  const fieldError = (field: string): string => {
    if (!touched[field]) return ''
    switch (field) {
      case 'fullName': {
        const v = fullName.trim()
        if (!v) return 'กรุณากรอกชื่อ-นามสกุล'
        if (v.length < 2) return 'ชื่อสั้นเกินไป (อย่างน้อย 2 ตัว)'
        return ''
      }
      case 'email': {
        const v = email.trim()
        if (!v) return 'กรุณากรอกอีเมล'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'รูปแบบอีเมลไม่ถูกต้อง'
        return ''
      }
      case 'password': {
        if (!password) return 'กรุณากรอกรหัสผ่าน'
        if (password.length < 8) return `รหัสผ่านต้องอย่างน้อย 8 ตัว (ตอนนี้ ${password.length})`
        if (!/[0-9]/.test(password)) return 'ต้องมีตัวเลขอย่างน้อย 1 ตัว'
        return ''
      }
      case 'shopName': {
        const v = shopName.trim()
        if (!v) return 'กรุณากรอกชื่อร้าน'
        if (v.length < 2) return 'ชื่อร้านสั้นเกินไป (อย่างน้อย 2 ตัว)'
        return ''
      }
      case 'promptpay': {
        const v = promptpay.replace(/\D/g, '')
        if (!v) return 'กรุณากรอกหมายเลข PromptPay'
        if (v.length !== 10 && v.length !== 13) return 'ต้องเป็น 10 หลัก (เบอร์โทร) หรือ 13 หลัก (นิติบุคคล)'
        return ''
      }
      case 'agentName': {
        const v = agentName.trim()
        if (!v) return 'กรุณากรอกชื่อ'
        if (v.length < 2) return 'ชื่อสั้นเกินไป (อย่างน้อย 2 ตัว)'
        return ''
      }
      case 'agentPhone': {
        const v = agentPhone.replace(/\D/g, '')
        if (!v) return 'กรุณากรอกเบอร์โทร'
        if (v.length !== 10) return `ต้อง 10 หลัก (ตอนนี้ ${v.length})`
        if (!v.startsWith('0')) return 'ต้องขึ้นต้นด้วย 0'
        if (!['06', '08', '09'].includes(v.substring(0, 2))) return 'ต้องขึ้นต้นด้วย 06, 08 หรือ 09'
        return ''
      }
      default: return ''
    }
  }
  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }))

  // Agent registration state
  const [agentName, setAgentName] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [agentLine, setAgentLine] = useState('')
  const [agentResult, setAgentResult] = useState<{ code: string; link: string } | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  // ─── Shop Registration Logic ─────────────────────────

  const handleAccountStep = (e: React.FormEvent) => {
    e.preventDefault()
    const name = fullName.trim()
    if (!name) { setError('กรุณากรอกชื่อ-นามสกุล'); return }
    if (name.length < 2) { setError('ชื่อสั้นเกินไป'); return }
    if (name.length > 100) { setError('ชื่อยาวเกินไป'); return }
    if (!email.trim()) { setError('กรุณากรอกอีเมล'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('รูปแบบอีเมลไม่ถูกต้อง'); return }
    if (password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    if (!/[0-9]/.test(password)) { setError('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'); return }
    setError('')
    setStep('shop')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = shopName.trim()
    const pp = promptpay.trim()
    if (!name) { setError('กรุณากรอกชื่อร้าน'); return }
    if (name.length < 2 || name.length > 100) { setError('ชื่อร้านต้องมี 2-100 ตัวอักษร'); return }
    const ppDigits = pp.replace(/\D/g, '')
    const ppError = validatePromptPay(ppDigits)
    if (ppError) { setError(ppError); return }
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (signUpError) throw signUpError

      // Wait for profile trigger to create the row
      let profileReady = false
      for (let i = 0; i < 10; i++) {
        const { data: p } = await supabase.from('profiles').select('id').eq('email', email.trim()).limit(1).single()
        if (p) { profileReady = true; break }
        await new Promise((r) => setTimeout(r, 500))
      }
      if (!profileReady) throw new Error('ระบบกำลังสร้างบัญชี กรุณาลองอีกครั้ง')

      const { data: result, error: rpcError } = await supabase.rpc('self_register_shop', {
        p_shop_name: shopName.trim(),
        p_promptpay: promptpay.trim().replace(/\D/g, ''),
        p_referral_code: refCode || manualRef.trim().toUpperCase() || null,
      })
      if (rpcError) throw rpcError
      if (result?.error) throw new Error(result.error)

      router.push('/pos/sessions')
    } catch (err: unknown) {
      setError(translateError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setLoading(false)
    }
  }

  // Translate Supabase errors to Thai
  function translateError(msg: string): string {
    const map: Record<string, string> = {
      'email rate limit exceeded': 'สมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
      'Email rate limit exceeded': 'สมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
      'User already registered': 'อีเมลนี้ถูกใช้แล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ',
      'Invalid login credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      'Email not confirmed': 'อีเมลยังไม่ได้ยืนยัน กรุณาเช็คกล่องจดหมาย',
      'Signup requires a valid password': 'รหัสผ่านไม่ถูกต้อง',
      'Password should be at least 6 characters': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      'Unable to validate email address: invalid format': 'รูปแบบอีเมลไม่ถูกต้อง',
    }
    // Check exact match first
    if (map[msg]) return map[msg]
    // Check partial match
    const lower = msg.toLowerCase()
    if (lower.includes('rate limit')) return 'สมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
    if (lower.includes('already registered') || lower.includes('already been registered')) return 'อีเมลนี้ถูกใช้แล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ'
    if (lower.includes('email') && lower.includes('invalid')) return 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    if (lower.includes('password')) return 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    if (lower.includes('network') || lower.includes('fetch')) return 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต'
    return msg // fallback: show original
  }

  // ─── Agent Registration Logic ─────────────────────────

  const handleAgentRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentName.trim() || agentName.trim().length < 2) { setError('กรุณากรอกชื่อ (อย่างน้อย 2 ตัว)'); return }
    const phoneDigits = agentPhone.replace(/\D/g, '')
    if (!phoneDigits) { setError('กรุณากรอกเบอร์โทร'); return }
    if (phoneDigits.length !== 10) { setError('เบอร์โทรต้อง 10 หลัก'); return }
    if (!phoneDigits.startsWith('0')) { setError('เบอร์โทรต้องขึ้นต้นด้วย 0'); return }
    const prefix = phoneDigits.substring(0, 2)
    if (!['06', '08', '09'].includes(prefix)) { setError('เบอร์โทรต้องขึ้นต้นด้วย 06, 08 หรือ 09'); return }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const code = generateCode(agentName)

      const { error: insertErr } = await supabase.from('agents').insert({
        name: agentName.trim(),
        phone: phoneDigits,
        line_id: agentLine.trim() || null,
        code,
      })

      if (insertErr) {
        if (insertErr.message.includes('duplicate')) {
          const code2 = generateCode(agentName)
          const { error: retryErr } = await supabase.from('agents').insert({
            name: agentName.trim(),
            phone: phoneDigits,
            line_id: agentLine.trim() || null,
            code: code2,
          })
          if (retryErr) throw retryErr
          setAgentResult({ code: code2, link: `${window.location.origin}/register?ref=${code2}` })
        } else {
          throw insertErr
        }
      } else {
        setAgentResult({ code, link: `${window.location.origin}/register?ref=${code}` })
      }
    } catch (err: unknown) {
      setError(translateError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (type: 'code' | 'link', text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-teal-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-slate-100 dark:border-slate-700 p-8">

          {/* Icon + Title */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 ${mode === 'shop' ? 'bg-primary-500' : 'bg-amber-500'} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${mode === 'shop' ? 'shadow-primary-500/30' : 'shadow-amber-500/30'} transition-all`}>
              {mode === 'shop' ? <Coffee size={28} strokeWidth={2} className="text-white" /> : <Handshake size={28} strokeWidth={2} className="text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {mode === 'shop' ? t('register.shopTitle') : t('register.agentTitle')}
            </h1>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setMode('shop'); setError(''); setAgentResult(null) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'shop'
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-2 border-primary-400 dark:border-primary-600'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-stone-500 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              <Store size={15} />
              {t('register.shopTab')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('agent'); setError(''); setStep('account') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'agent'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-2 border-amber-400 dark:border-amber-600'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-stone-500 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              <Handshake size={15} />
              {t('register.agentTab')}
            </button>
          </div>

          {/* ═══════ SHOP REGISTRATION FORM ═══════ */}
          {mode === 'shop' && (
            <>
              <p className="text-muted text-sm text-center mb-4">
                {step === 'account' ? t('register.step1') : t('register.step2')}
              </p>
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 'account' || step === 'shop' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 'shop' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
              </div>

              {step === 'account' ? (
                <form onSubmit={handleAccountStep} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <User size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />{t('register.fullName')}
                    </label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={() => touch('fullName')} className="input" placeholder={t('register.fullName')} maxLength={100} required autoFocus />
                    {fieldError('fullName') && <p className="text-xs text-rose-500 mt-1">{fieldError('fullName')}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <Mail size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />{t('register.email')}
                    </label>
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setAsyncErrors((p) => ({ ...p, email: '' })) }} onBlur={() => { touch('email'); checkEmailAsync() }} className="input" placeholder="your@email.com" maxLength={100} required />
                    {asyncChecking.email && <p className="text-xs text-gray-400 mt-1">{t('register.checkingEmail')}</p>}
                    {fieldError('email') && <p className="text-xs text-rose-500 mt-1">{fieldError('email')}</p>}
                    {!fieldError('email') && asyncErrors.email && <p className="text-xs text-rose-500 mt-1">{asyncErrors.email}</p>}
                    {touched.email && !fieldError('email') && !asyncErrors.email && !asyncChecking.email && email && <p className="text-xs text-emerald-500 mt-1">{t('register.emailAvailable')}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <Lock size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />{t('register.password')}
                    </label>
                    <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); touch('password') }} onBlur={() => touch('password')} className="input" placeholder={t('register.passwordHint')} maxLength={100} required />
                    <div className="flex gap-3 mt-1.5">
                      <p className={`text-xs ${password.length >= 8 ? 'text-emerald-500' : 'text-gray-400 dark:text-slate-500'}`}>
                        {password.length >= 8 ? '✓' : '○'} {t('register.passwordMin8')}
                      </p>
                      <p className={`text-xs ${/[0-9]/.test(password) ? 'text-emerald-500' : 'text-gray-400 dark:text-slate-500'}`}>
                        {/[0-9]/.test(password) ? '✓' : '○'} {t('register.passwordHasNumber')}
                      </p>
                    </div>
                  </div>
                  {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">{error}</div>}
                  <button type="submit" disabled={!!fieldError('fullName') || !!fieldError('email') || !!fieldError('password') || !!asyncErrors.email || asyncChecking.email} className="btn-primary w-full py-3">{t('common.next')} <ArrowRight size={16} /></button>

                  {/* Divider */}
                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs text-muted">
                      <span className="bg-white dark:bg-slate-800 px-3">{t('common.or')}</span>
                    </div>
                  </div>

                  {/* Google OAuth */}
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true)
                      setError('')
                      try {
                        const supabase = createClient()
                        const { error: authError } = await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: { redirectTo: `${window.location.origin}/auth/callback` },
                        })
                        if (authError) throw authError
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : t('common.error'))
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="btn-secondary w-full py-3 text-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {t('register.googleSignup')}
                  </button>
                  <p className="text-xs text-muted text-center">{t('register.googleHint')}</p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <Store size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />{t('register.shopName')}
                    </label>
                    <input type="text" value={shopName} onChange={(e) => { setShopName(e.target.value); setAsyncErrors((p) => ({ ...p, shopName: '' })) }} onBlur={() => { touch('shopName'); checkShopNameAsync() }} className="input" placeholder="เช่น Coffee Corner" maxLength={100} required autoFocus />
                    {asyncChecking.shopName && <p className="text-xs text-gray-400 mt-1">{t('register.checkingShop')}</p>}
                    {fieldError('shopName') && <p className="text-xs text-rose-500 mt-1">{fieldError('shopName')}</p>}
                    {!fieldError('shopName') && asyncErrors.shopName && <p className="text-xs text-rose-500 mt-1">{asyncErrors.shopName}</p>}
                    {touched.shopName && !fieldError('shopName') && !asyncErrors.shopName && !asyncChecking.shopName && shopName.trim().length >= 2 && <p className="text-xs text-emerald-500 mt-1">{t('register.shopAvailable')}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('register.promptpayLabel')}</label>
                    <input type="text" value={promptpay} onChange={(e) => { setPromptpay(e.target.value.replace(/\D/g, '')); touch('promptpay') }} onBlur={() => touch('promptpay')} inputMode="numeric" maxLength={13} className="input" placeholder="0812345678" required />
                    {fieldError('promptpay') && <p className="text-xs text-rose-500 mt-1">{fieldError('promptpay')}</p>}
                    {touched.promptpay && !fieldError('promptpay') && promptpay && <p className="text-xs text-emerald-500 mt-1">{t('register.formatOk')}</p>}
                  </div>
                  {refCode ? (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800/40">
                      {t('register.referralBanner', { code: refCode })}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        <Handshake size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />
                        รหัสตัวแทน <span className="text-muted font-normal">(ไม่บังคับ)</span>
                      </label>
                      <input
                        type="text"
                        value={manualRef}
                        onChange={(e) => setManualRef(e.target.value.toUpperCase())}
                        className="input"
                        placeholder="เช่น AG-SOMCHAI-X4K2"
                        maxLength={30}
                      />
                      {manualRef && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">กรอกรหัสตัวแทนแล้ว — จะไม่ต้องชำระค่าแรกเข้า ฿1,399 (ถ้ารหัสถูกต้อง)</p>}
                    </div>
                  )}
                  {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">{error}</div>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setStep('account'); setError('') }} className="btn-secondary flex-1 py-3"><ArrowLeft size={15} /> {t('common.back')}</button>
                    <button type="submit" disabled={loading || !!asyncErrors.shopName || asyncChecking.shopName || !!fieldError('shopName') || !!fieldError('promptpay')} className="btn-primary flex-1 py-3">
                      {loading ? <><span className="spinner-sm" /> {t('register.registering')}</> : t('register.submit')}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ═══════ AGENT REGISTRATION FORM ═══════ */}
          {mode === 'agent' && !agentResult && (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-800/40">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">{t('register.agentEarn')}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t('register.agentEarnDesc')}</p>
              </div>

              <form onSubmit={handleAgentRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <User size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />{t('register.fullName')}
                  </label>
                  <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} onBlur={() => touch('agentName')} className="input" placeholder={t('register.fullName')} maxLength={100} required autoFocus />
                  {fieldError('agentName') && <p className="text-xs text-rose-500 mt-1">{fieldError('agentName')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <Phone size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />{t('register.phone')}
                  </label>
                  <input type="tel" value={agentPhone} onChange={(e) => { setAgentPhone(e.target.value.replace(/\D/g, '')); touch('agentPhone') }} onBlur={() => touch('agentPhone')} inputMode="numeric" maxLength={10} className="input" placeholder="0812345678" required />
                  {fieldError('agentPhone') && <p className="text-xs text-rose-500 mt-1">{fieldError('agentPhone')}</p>}
                  {touched.agentPhone && !fieldError('agentPhone') && agentPhone && <p className="text-xs text-emerald-500 mt-1">{t('register.phoneOk')}</p>}
                </div>
                {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 bg-amber-500 hover:bg-amber-600 shadow-amber-500/25">
                  {loading ? <><span className="spinner-sm" /> {t('register.registering')}</> : t('register.getCode')}
                </button>
              </form>
            </>
          )}

          {/* ═══════ AGENT SUCCESS ═══════ */}
          {mode === 'agent' && agentResult && (
            <>
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Check size={24} className="text-white" />
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('register.success')}</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800/40">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">{t('register.yourCode')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-amber-800 dark:text-amber-200 tracking-wider flex-1">{agentResult.code}</span>
                  <button onClick={() => handleCopy('code', agentResult.code)} className="p-2 bg-amber-200 dark:bg-amber-800 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition min-w-[40px] min-h-[40px] flex items-center justify-center">
                    {copied === 'code' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-amber-700 dark:text-amber-300" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-muted font-medium mb-2">{t('register.referralLink')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-700 dark:text-slate-300 break-all flex-1 font-mono">{agentResult.link}</p>
                  <button onClick={() => handleCopy('link', agentResult.link)} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition min-w-[40px] min-h-[40px] flex items-center justify-center">
                    {copied === 'link' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-500" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted text-center">{t('register.referralNote')}</p>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mt-4 border border-blue-200 dark:border-blue-800/40">
                <p className="text-xs text-blue-700 dark:text-blue-300 text-center font-medium">{t('register.screenshotHint')} <a href="/agent/lookup" className="underline font-bold">{t('register.lookupLater')}</a></p>
              </div>
            </>
          )}

          {/* Footer link */}
          <p className="text-center text-sm text-muted mt-6">
            {mode === 'agent' ? (
              <>{t('register.alreadyRegistered')} <a href="/agent/lookup" className="text-accent-600 dark:text-accent-400 font-medium hover:underline">{t('register.lookupCode')}</a></>
            ) : (
              <>{t('register.hasAccount')} <a href="/login" className="text-primary-500 dark:text-primary-400 font-medium hover:underline">{t('common.login')}</a></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
