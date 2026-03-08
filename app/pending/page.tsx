'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

export default function PendingPage() {
  const router = useRouter()
  const [shopName, setShopName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase
        .from('profiles')
        .select('role, pending_shop_name')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.role) router.push('/pos/sessions')
          else setShopName(profile?.pending_shop_name ?? '')
        })
    })
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 p-8 text-center border border-gray-100 dark:border-slate-700">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={36} className="text-amber-500 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2 tracking-tight">
            รอการอนุมัติ
          </h1>
          {shopName && (
            <p className="text-primary-600 dark:text-primary-400 font-semibold mb-3">
              ร้าน: {shopName}
            </p>
          )}
          <p className="text-gray-500 dark:text-slate-400 leading-relaxed mb-8 text-sm">
            ระบบได้รับข้อมูลร้านค้าของคุณแล้ว
            <br />
            กรุณารอผู้ดูแลระบบอนุมัติบัญชี
            <br />
            ปกติใช้เวลา 1–24 ชั่วโมง
          </p>
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
