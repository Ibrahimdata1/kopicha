'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, LogOut, ShieldOff, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

export default function PendingPage() {
  const router = useRouter()
  const [shopName, setShopName] = useState('')
  const [checking, setChecking] = useState(false)
  const [isDeactivated, setIsDeactivated] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase
        .from('profiles')
        .select('role, pending_shop_name, shop_id')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.role === 'super_admin') { router.push('/pos/admin'); return }
          if (profile?.role) { router.push('/pos/sessions'); return }

          // role is null — check if deactivated or new user
          if (profile?.pending_shop_name) {
            // New user still setting up
            setShopName(profile.pending_shop_name)
            setIsDeactivated(false)
          } else {
            // No pending_shop_name + no role = deactivated
            setIsDeactivated(true)
          }
        })
    })
  }, [router])

  const handleRetryLogin = async () => {
    setChecking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'super_admin') { router.push('/pos/admin'); return }
      if (profile?.role) { router.push('/pos/sessions'); return }
    }
    setChecking(false)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 p-8 text-center border border-gray-100 dark:border-slate-700">

          {isDeactivated ? (
            <>
              {/* ═══ ถูกยกเลิกสิทธิ์ ═══ */}
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldOff size={36} className="text-red-500 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2 tracking-tight">
                บัญชีถูกระงับ
              </h1>
              <p className="text-gray-500 dark:text-slate-400 leading-relaxed mb-6 text-sm">
                ร้านค้าของคุณถูกยกเลิกสิทธิ์การใช้งาน
                <br />
                กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานอีกครั้ง
              </p>

              <a
                href="mailto:contact.runawaytech@gmail.com"
                className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary-500/25 mb-3"
              >
                <Mail size={16} />
                ติดต่อ contact.runawaytech@gmail.com
              </a>

              <button
                onClick={handleRetryLogin}
                disabled={checking}
                className="w-full border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-medium py-2.5 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 mb-4 text-sm"
              >
                {checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}
              </button>
            </>
          ) : (
            <>
              {/* ═══ กำลังตั้งค่า (ผู้ใช้ใหม่) ═══ */}
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw size={36} className="text-primary-500 dark:text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2 tracking-tight">
                กำลังตั้งค่าบัญชี
              </h1>
              {shopName && (
                <p className="text-primary-600 dark:text-primary-400 font-semibold mb-3">
                  ร้าน: {shopName}
                </p>
              )}
              <p className="text-gray-500 dark:text-slate-400 leading-relaxed mb-6 text-sm">
                ระบบกำลังตั้งค่าบัญชีของคุณ
                <br />
                กรุณาลองเข้าสู่ระบบใหม่
              </p>
              <button
                onClick={handleRetryLogin}
                disabled={checking}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary-500/25 disabled:opacity-50 mb-4"
              >
                {checking ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังตรวจสอบ...
                  </span>
                ) : 'ลองเข้าสู่ระบบใหม่'}
              </button>
            </>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 mx-auto text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  )
}
