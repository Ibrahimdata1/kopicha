'use client'

import { usePosContext } from '@/lib/pos-context'
import SessionsView from '@/components/SessionsView'

export default function SessionsPage() {
  const { profile, shop } = usePosContext()

  if (!shop) {
    const isSuperAdmin = profile?.role === 'super_admin'
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isSuperAdmin ? 'Super Admin' : 'ไม่พบข้อมูลร้านค้า'}
          </p>
          <p className="text-sm text-muted">
            {isSuperAdmin ? 'ไปที่หน้า Admin เพื่อจัดการร้านค้าทั้งหมด' : 'กรุณาตั้งค่าร้านค้าที่เมนู ตั้งค่า'}
          </p>
          {isSuperAdmin && (
            <a href="/pos/admin" className="btn-primary inline-flex px-4 py-2 text-sm">ไปหน้า Admin</a>
          )}
        </div>
      </div>
    )
  }

  return <SessionsView shop={shop} profile={profile} />
}
