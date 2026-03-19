'use client'

import { usePosContext } from '@/lib/pos-context'
import SessionsView from '@/components/SessionsView'
import { useI18n } from '@/lib/i18n/context'

export default function SessionsPage() {
  const { profile, shop } = usePosContext()
  const { t } = useI18n()

  if (!shop) {
    const isSuperAdmin = profile?.role === 'super_admin'
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isSuperAdmin ? 'Super Admin' : t('sessions.noShop')}
          </p>
          <p className="text-sm text-muted">
            {isSuperAdmin ? t('sessions.goAdmin') : t('sessions.setupShop')}
          </p>
          {isSuperAdmin && (
            <a href="/pos/admin" className="btn-primary inline-flex px-4 py-2 text-sm">{t('sessions.goAdminBtn')}</a>
          )}
        </div>
      </div>
    )
  }

  return <SessionsView shop={shop} profile={profile} />
}
