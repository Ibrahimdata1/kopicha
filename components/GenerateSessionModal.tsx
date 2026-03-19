'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import type { CustomerSession, Profile, Shop } from '@/lib/types'
import { useI18n } from '@/lib/i18n/context'

interface Props {
  shop: Shop
  profile: Profile | null
  defaultTable?: string
  onClose: () => void
  onCreated: (session: CustomerSession) => void
}

export default function GenerateSessionModal({ shop, profile, defaultTable, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tableLabel, setTableLabel] = useState(defaultTable ?? '')

  const tableCount = shop.table_count ?? 0

  const handleCreate = async () => {
    if (!tableLabel.trim()) {
      setError(t('generate.tableRequired'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: insertError } = await supabase
        .from('customer_sessions')
        .insert({
          shop_id: shop.id,
          table_label: tableLabel.trim(),
          status: 'active',
          created_by: profile?.id ?? null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      onCreated(data as CustomerSession)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('generate.title')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 dark:text-stone-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Table selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('generate.tableNumber')}
          </label>
          {tableCount > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: tableCount }, (_, i) => String(i + 1)).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTableLabel(num)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    tableLabel === num
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
              placeholder={t('generate.tablePlaceholder')}
              maxLength={20}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}
        </div>

        <div className="text-center py-2 mb-4">
          <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/60 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <QrCode size={22} className="text-primary-500" strokeWidth={1.5} />
          </div>
          <p className="text-slate-600 dark:text-stone-500 text-xs">
            {t('generate.qrDesc')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !tableLabel.trim()}
            className="btn-primary flex-1 py-3"
          >
            {loading ? <span className="spinner-sm" /> : tableLabel ? t('generate.createBillTable', { table: tableLabel }) : t('generate.createBill')}
          </button>
        </div>
      </div>
    </div>
  )
}
