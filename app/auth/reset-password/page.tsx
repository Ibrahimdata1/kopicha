'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase-browser'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase embeds the token in the URL hash — wait for it to be exchanged
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
  }, [])

  const validate = (): string | null => {
    if (!password) return 'กรุณากรอกรหัสผ่านใหม่'
    if (/[^\x20-\x7E]/.test(password)) return 'รหัสผ่านใช้ได้เฉพาะตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น'
    if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    if (password.length > 100) return 'รหัสผ่านยาวเกินไป'
    if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'
    if (password !== confirm) return 'รหัสผ่านไม่ตรงกัน'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      setDone(true)
      setTimeout(() => router.push('/pos/sessions'), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-fit"><Logo size={48} /></div>
            <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">ตั้งรหัสผ่านใหม่</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">QRforPay</p>
          </div>

          {done ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="font-semibold text-stone-800 dark:text-stone-100">เปลี่ยนรหัสผ่านสำเร็จ</p>
              <p className="text-sm text-stone-400">กำลังพาไปหน้าหลัก...</p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center space-y-3">
              <div className="text-3xl">🔗</div>
              <p className="text-sm text-stone-500 dark:text-stone-400">กำลังตรวจสอบลิงก์รีเซ็ต...</p>
              <p className="text-xs text-stone-400">ถ้าหน้านี้ค้างนาน ลิงก์อาจหมดอายุแล้ว<br/>กรุณาขอลิงก์ใหม่ที่หน้า Login</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                    className="input pl-9 pr-10"
                    placeholder="อย่างน้อย 8 ตัว + ตัวเลข"
                    maxLength={100}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Strength indicators */}
                <div className="flex gap-4 mt-1.5">
                  <span className={`text-xs ${password.length >= 8 ? 'text-emerald-500' : 'text-stone-400'}`}>
                    {password.length >= 8 ? '✓' : '○'} อย่างน้อย 8 ตัว
                  </span>
                  <span className={`text-xs ${/[0-9]/.test(password) ? 'text-emerald-500' : 'text-stone-400'}`}>
                    {/[0-9]/.test(password) ? '✓' : '○'} มีตัวเลข
                  </span>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                    className="input pl-9 pr-10"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    maxLength={100}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirm && (
                  <p className={`text-xs mt-1 ${password === confirm ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {password === confirm ? '✓ รหัสผ่านตรงกัน' : '✗ รหัสผ่านไม่ตรงกัน'}
                  </p>
                )}
              </div>

              {error && (
                <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/15 px-3 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading
                  ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'ตั้งรหัสผ่านใหม่'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
