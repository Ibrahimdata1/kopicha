import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import SessionsView from '@/components/SessionsView'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!profile?.shop_id) {
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

  const { data: shop } = await supabase.from('shops').select('*').eq('id', profile.shop_id).single()
  if (!shop) redirect('/pos/settings')

  return <SessionsView shop={shop} profile={profile} />
}
