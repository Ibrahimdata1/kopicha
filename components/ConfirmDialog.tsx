'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const { t } = useI18n()
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...opts, resolve })
    })
  }, [])

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const d = dialog
    setDialog(null)
    // Resolve after dialog is removed to prevent click from reaching elements behind
    requestAnimationFrame(() => d?.resolve(true))
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const d = dialog
    setDialog(null)
    requestAnimationFrame(() => d?.resolve(false))
  }

  const ConfirmDialogUI = dialog ? (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xs p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
            dialog.danger
              ? 'bg-rose-50 dark:bg-rose-900/20'
              : 'bg-primary-50 dark:bg-primary-950/40'
          }`}>
            {dialog.danger
              ? <AlertTriangle size={22} className="text-rose-500" />
              : <HelpCircle size={22} className="text-primary-500" />
            }
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{dialog.title}</h3>
          {dialog.message && (
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{dialog.message}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="btn-secondary flex-1 py-2.5 text-sm"
          >
            {dialog.cancelLabel ?? t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              dialog.danger
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/25'
                : 'btn-primary'
            }`}
          >
            {dialog.confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmDialogUI }
}
