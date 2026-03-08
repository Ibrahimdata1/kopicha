'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

export default function RegisterShopPage() {
  const router = useRouter()
  const [shopName, setShopName] = useState('')
  const [promptpay, setPromptpay] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')
      supabase.from('profiles').select('role, pending_shop_name').eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (profile?.role) router.push('/pos/sessions')
          else if (profile?.pending_shop_name) router.push('/pending')
        })
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopName.trim() || !promptpay.trim()) {
      setError('กรุณากรอกชื่อร้านและหมายเลข PromptPay')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: rpcErr } = await supabase.rpc('submit_owner_info', {
        p_shop_name: shopName.trim(),
        p_promptpay: promptpay.trim(),
      })
      if (rpcErr) throw rpcErr
      router.push('/pending')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 p-8 border border-gray-100 dark:border-slate-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
              <Coffee size={28} strokeWidth={2} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              ลงทะเบียนร้านค้า
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{userEmail}</p>
            <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">
              กรอกข้อมูลร้านเพื่อส่งขออนุมัติ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                <Store size={14} className="inline mr-1.5 text-gray-400" />
                ชื่อร้านค้า
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="เช่น Coffee Corner, ร้านข้าวแม่ต้อย"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                หมายเลข PromptPay
              </label>
              <input
                type="text"
                value={promptpay}
                onChange={(e) => setPromptpay(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="เบอร์โทรหรือเลขประจำตัวผู้เสียภาษี"
                required
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                ใช้รับชำระเงินจากลูกค้าผ่าน QR PromptPay
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary-500/25 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังส่งคำขอ...
                </span>
              ) : 'ส่งคำขออนุมัติ'}
            </button>
          </form>

          <div className="mt-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
            <p className="font-medium mb-1">ขั้นตอนถัดไป</p>
            <p className="text-blue-600 dark:text-blue-400 text-xs">
              ผู้ดูแลระบบจะตรวจสอบและอนุมัติบัญชีของคุณ ปกติใช้เวลาไม่นาน
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
