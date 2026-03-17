'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Coffee, Store, User, Mail, Lock, ArrowRight, ArrowLeft, Handshake, Phone, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react'
import { validatePromptPay } from '@/lib/validate-promptpay'

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

  const [mode, setMode] = useState<'shop' | 'agent'>('shop')

  // Shop registration state
  const [step, setStep] = useState<'account' | 'shop'>('account')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [promptpay, setPromptpay] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

      const { data: result, error: rpcError } = await supabase.rpc('self_register_shop', {
        p_shop_name: shopName.trim(),
        p_promptpay: promptpay.trim().replace(/\D/g, ''),
        p_referral_code: refCode || null,
      })
      if (rpcError) throw rpcError
      if (result?.error) throw new Error(result.error)

      router.push('/pos/sessions')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
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
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
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
              {mode === 'shop' ? 'ลงทะเบียนร้านค้า' : 'สมัครเป็นตัวแทนขาย'}
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
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              <Store size={15} />
              สมัครร้านค้า
            </button>
            <button
              type="button"
              onClick={() => { setMode('agent'); setError(''); setStep('account') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'agent'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-2 border-amber-400 dark:border-amber-600'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              <Handshake size={15} />
              สมัครตัวแทนขาย
            </button>
          </div>

          {/* ═══════ SHOP REGISTRATION FORM ═══════ */}
          {mode === 'shop' && (
            <>
              <p className="text-muted text-sm text-center mb-4">
                {step === 'account' ? 'ขั้นตอน 1/2: ข้อมูลบัญชี' : 'ขั้นตอน 2/2: ข้อมูลร้านค้า'}
              </p>
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 'account' || step === 'shop' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 'shop' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
              </div>

              {step === 'account' ? (
                <form onSubmit={handleAccountStep} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <User size={13} className="inline mr-1.5 text-slate-400" />ชื่อ-นามสกุล
                    </label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="ชื่อ นามสกุล" required autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <Mail size={13} className="inline mr-1.5 text-slate-400" />อีเมล
                    </label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="your@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <Lock size={13} className="inline mr-1.5 text-slate-400" />รหัสผ่าน
                    </label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย" required />
                  </div>
                  {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">{error}</div>}
                  <button type="submit" className="btn-primary w-full py-3">ถัดไป <ArrowRight size={16} /></button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <Store size={13} className="inline mr-1.5 text-slate-400" />ชื่อร้านค้า
                    </label>
                    <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="input" placeholder="เช่น Coffee Corner" required autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">หมายเลข PromptPay (เบอร์โทร หรือ เลขประจำตัวผู้เสียภาษี)</label>
                    <input type="text" value={promptpay} onChange={(e) => setPromptpay(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={13} className="input" placeholder="0812345678" required />
                  </div>
                  {refCode && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800/40">
                      รหัสตัวแทน: <strong>{refCode}</strong> — ไม่ต้องเสียค่าแรกเข้า ฿999
                    </div>
                  )}
                  {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">{error}</div>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setStep('account'); setError('') }} className="btn-secondary flex-1 py-3"><ArrowLeft size={15} /> ย้อนกลับ</button>
                    <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                      {loading ? <><span className="spinner-sm" /> กำลังสมัคร...</> : 'สมัครสมาชิก'}
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
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">รับ ฿999 ทุกร้านที่แนะนำสำเร็จ</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">แนะนำร้านอาหาร/คาเฟ่ เก็บค่าแนะนำโดยตรง</p>
              </div>

              <form onSubmit={handleAgentRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <User size={13} className="inline mr-1.5 text-slate-400" />ชื่อ-นามสกุล
                  </label>
                  <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="input" placeholder="ชื่อ นามสกุล" required autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <Phone size={13} className="inline mr-1.5 text-slate-400" />เบอร์โทร
                  </label>
                  <input type="tel" value={agentPhone} onChange={(e) => setAgentPhone(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={10} className="input" placeholder="0812345678" required />
                </div>
                {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 bg-amber-500 hover:bg-amber-600 shadow-amber-500/25">
                  {loading ? <><span className="spinner-sm" /> กำลังสมัคร...</> : 'รับรหัสตัวแทน'}
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
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">สมัครสำเร็จ!</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800/40">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">รหัสตัวแทนของคุณ</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-amber-800 dark:text-amber-200 tracking-wider flex-1">{agentResult.code}</span>
                  <button onClick={() => handleCopy('code', agentResult.code)} className="p-2 bg-amber-200 dark:bg-amber-800 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition min-w-[40px] min-h-[40px] flex items-center justify-center">
                    {copied === 'code' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-amber-700 dark:text-amber-300" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-muted font-medium mb-2">ลิงก์สมัครสำหรับแนะนำร้านค้า</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-700 dark:text-slate-300 break-all flex-1 font-mono">{agentResult.link}</p>
                  <button onClick={() => handleCopy('link', agentResult.link)} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition min-w-[40px] min-h-[40px] flex items-center justify-center">
                    {copied === 'link' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-500" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted text-center">ร้านค้าที่สมัครผ่านลิงก์นี้ ไม่ต้องเสียค่าแรกเข้า ฿999</p>
            </>
          )}

          {/* Footer link */}
          <p className="text-center text-sm text-muted mt-6">
            มีบัญชีแล้ว?{' '}
            <a href="/login" className="text-primary-500 dark:text-primary-400 font-medium hover:underline">เข้าสู่ระบบ</a>
          </p>
        </div>
      </div>
    </div>
  )
}
