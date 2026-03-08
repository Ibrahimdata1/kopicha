'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import type { CustomerSession, Profile, Shop } from '@/lib/types'

interface Props {
  shop: Shop
  profile: Profile | null
  onClose: () => void
  onCreated: (session: CustomerSession) => void
}

export default function GenerateSessionModal({ shop, profile, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: insertError } = await supabase
        .from('customer_sessions')
        .insert({
          shop_id: shop.id,
          table_label: null,
          status: 'active',
          created_by: profile?.id ?? null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      onCreated(data as CustomerSession)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">สร้างบิลใหม่</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        <div className="text-center py-4 mb-6">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <QrCode size={28} className="text-primary-500" strokeWidth={1.5} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            สร้าง QR Code สำหรับลูกค้าสแกนสั่งและชำระเงิน
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
            ยกเลิก
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="btn-primary flex-1 py-3"
          >
            {loading ? <span className="spinner-sm" /> : 'สร้างบิล'}
          </button>
        </div>
      </div>
    </div>
  )
}
