'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ShieldOff, Mail, Store, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useI18n } from '@/lib/i18n/context'

export default function PendingPage() {
  const router = useRouter()
  const [isDeactivated, setIsDeactivated] = useState(false)
  const { t } = useI18n()
  const [loaded, setLoaded] = useState(false)

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

          if (profile?.pending_shop_name) {
            // ยังกรอกข้อมูลร้านไม่เสร็จ → ส่งไปกรอกต่อเลย
            router.push('/register/shop')
            return
          }

          // ถูก admin ลบร้าน
          setIsDeactivated(true)
          setLoaded(true)
        })
    })
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="spinner w-8 h-8 border-[3px]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />

      <div className="w-full max-w-sm relative animate-fade-in-up">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card-xl border border-gray-100 dark:border-slate-800 p-8 text-center">

          {isDeactivated && (
            <>
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldOff size={36} className="text-rose-500 dark:text-rose-400" />
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2 tracking-tight">
                {t('pending.suspended')}
              </h1>
              <p className="text-gray-500 dark:text-stone-500 leading-relaxed mb-6 text-sm">
                {t('pending.suspendedDesc')}
                <br />
                {t('pending.contactAdmin')}
              </p>

              <a
                href="mailto:contact.runawaytech@gmail.com"
                className="btn-primary w-full py-3 text-sm mb-4"
              >
                <Mail size={16} />
                {t('pending.contactBtn')}
              </a>
            </>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 mx-auto text-sm text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            <LogOut size={14} />
            {t('common.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
