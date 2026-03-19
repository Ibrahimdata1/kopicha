'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Moon, Sun, User } from 'lucide-react'
import Logo from '@/components/Logo'
import LangSwitch from '@/components/LangSwitch'
import { useI18n } from '@/lib/i18n/context'
import { useTheme } from '@/lib/theme-provider'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const input = identifier.trim()

      let email = input
      if (!input.includes('@')) {
        const res = await fetch('/api/resolve-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: input }),
        })
        if (!res.ok) {
          throw new Error('ไม่พบชื่อผู้ใช้นี้ในระบบ')
        }
        const data = await res.json()
        email = data.email
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, pending_shop_name')
        .eq('id', user.id)
        .single()

      if (!profile?.role) {
        router.push('/pending')
      } else if (profile.role === 'super_admin') {
        router.push('/pos/admin')
      } else {
        router.push('/pos/sessions')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      const lower = msg.toLowerCase()
      if (lower.includes('invalid login')) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      else if (lower.includes('rate limit')) setError('เข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่')
      else if (lower.includes('email not confirmed')) setError('อีเมลยังไม่ได้ยืนยัน กรุณาเช็คกล่องจดหมาย')
      else if (lower.includes('network') || lower.includes('fetch')) setError('ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = forgotEmail.trim().toLowerCase()
    if (!email) { setForgotError('กรุณากรอกอีเมล'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setForgotError('รูปแบบอีเมลไม่ถูกต้อง'); return }

    setForgotLoading(true)
    setForgotError('')
    try {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      // Always show success — don't reveal if email exists (security)
      setForgotSent(true)
    } catch {
      setForgotError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
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
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4 relative">
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LangSwitch />
        <button onClick={toggleTheme} className="p-2 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-fit">
              <Logo size={48} />
            </div>
            <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
              QRforPay
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
              {t('login.title')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {t('login.emailOrUsername')}
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="input pl-9"
                  placeholder={t('login.emailPlaceholder')}
                  required
                  autoComplete="username"
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">{t('login.emailHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/15 px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? (
                <><span className="spinner-sm border-white border-t-transparent" /> {t('login.loggingIn')}</>
              ) : (
                t('common.login')
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowForgot(v => !v); setForgotSent(false); setForgotError(''); setForgotEmail('') }}
                className="text-xs text-stone-400 hover:text-primary-500 transition-colors"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>
          </form>

          {/* Forgot password panel */}
          {showForgot && (
            <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700">
              {forgotSent ? (
                <div className="text-center space-y-2">
                  <div className="text-2xl">📧</div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">กรุณาเช็คอีเมล <strong>{forgotEmail}</strong><br/>แล้วคลิกลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่</p>
                  <p className="text-xs text-stone-400">ไม่เห็นอีเมล? เช็คใน Spam/Junk</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">รีเซ็ตรหัสผ่าน</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์รีเซ็ตให้</p>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="อีเมลของคุณ"
                      className="input pl-9 text-sm"
                      required
                      autoComplete="email"
                    />
                  </div>
                  {forgotError && <p className="text-xs text-rose-500">{forgotError}</p>}
                  <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-2 text-sm">
                    {forgotLoading ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'ส่งลิงก์รีเซ็ต'}
                  </button>
                  <p className="text-xs text-stone-400 dark:text-stone-500 text-center">
                    จำอีเมลไม่ได้? ลอง <strong>Google Login</strong> ด้านล่าง หรือติดต่อฝ่ายสนับสนุน
                  </p>
                </form>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100 dark:border-stone-800" />
            </div>
            <div className="relative flex justify-center text-xs text-stone-400">
              <span className="bg-white dark:bg-stone-900 px-2">หรือ</span>
            </div>
          </div>

          <button onClick={handleGoogleLogin} disabled={loading} className="btn-secondary w-full py-2.5">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('login.google')}
          </button>
          <p className="text-xs text-stone-400 text-center mt-2">{t('login.googleHint')}</p>

          <p className="text-center text-xs text-stone-400 mt-6">
            {t('login.noAccount')}{' '}
            <a href="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              {t('login.registerShop')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
