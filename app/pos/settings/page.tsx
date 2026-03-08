'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { PendingUser, Profile, Shop, TeamMember } from '@/lib/types'
import { useConfirm } from '@/components/ConfirmDialog'
import {
  Check,
  Clock,
  Save,
  Settings2,
  ShieldAlert,
  Store,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const { confirm, ConfirmDialogUI } = useConfirm()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)

  const [shopName, setShopName] = useState('')
  const [promptpay, setPromptpay] = useState('')
  const [tableCount, setTableCount] = useState('')
  const [isSavingShop, setIsSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  const [cashierName, setCashierName] = useState('')
  const [cashierEmail, setCashierEmail] = useState('')
  const [cashierPassword, setCashierPassword] = useState('')
  const [isCreatingCashier, setIsCreatingCashier] = useState(false)
  const [cashierMsg, setCashierMsg] = useState('')

  const [error, setError] = useState('')

  const isSuperAdmin = profile?.role === 'super_admin'
  const isOwner = profile?.role === 'owner'

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      if (p?.shop_id) {
        const { data: s } = await supabase.from('shops').select('*').eq('id', p.shop_id).single()
        setShop(s)
        setShopName(s?.name ?? '')
        setPromptpay(s?.promptpay_id ?? '')
        setTableCount(s?.table_count != null ? String(s.table_count) : '')

        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('shop_id', p.shop_id)
          .order('created_at')
        setTeam((teamData ?? []) as TeamMember[])
      }

      if (p?.role === 'super_admin') {
        const { data: pending } = await supabase.rpc('get_pending_users')
        setPendingUsers((pending ?? []) as PendingUser[])
      }

      setLoading(false)
    })
  }, [])

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop?.id) return
    const name = shopName.trim()
    const pp = promptpay.trim()
    if (!name || name.length < 2) { setError('ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร'); return }
    if (name.length > 100) { setError('ชื่อร้านยาวเกินไป'); return }
    if (!pp) { setError('กรุณากรอกหมายเลข PromptPay'); return }
    const ppDigits = pp.replace(/\D/g, '')
    if (ppDigits.length !== 10 && ppDigits.length !== 13) {
      setError('PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขนิติบุคคล 13 หลัก')
      return
    }
    const tc = tableCount.trim() ? parseInt(tableCount.trim(), 10) : 0
    if (isNaN(tc) || tc < 0 || tc > 200) {
      setError('จำนวนโต๊ะต้องเป็นตัวเลข 0-200')
      return
    }
    setIsSavingShop(true)
    setError('')
    try {
      const { error: updateErr } = await supabase
        .from('shops')
        .update({ name, promptpay_id: pp, table_count: tc })
        .eq('id', shop.id)
      if (updateErr) throw updateErr
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setIsSavingShop(false)
    }
  }

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = cashierName.trim()
    const em = cashierEmail.trim().toLowerCase()
    const pw = cashierPassword
    if (!name || name.length < 2) { setError('กรุณากรอกชื่อพนักงาน (อย่างน้อย 2 ตัว)'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError('รูปแบบอีเมลไม่ถูกต้อง'); return }
    if (pw.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    if (!/[0-9]/.test(pw)) { setError('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'); return }
    setIsCreatingCashier(true)
    setCashierMsg('')
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-cashier', {
        body: { full_name: name, email: em, password: pw },
      })
      if (fnErr || data?.error) throw new Error(fnErr?.message ?? data?.error ?? 'เกิดข้อผิดพลาด')
      setCashierMsg('สร้างบัญชีพนักงานสำเร็จ')
      setCashierName('')
      setCashierEmail('')
      setCashierPassword('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setIsCreatingCashier(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const ok = await confirm({ title: 'ลบสมาชิกออกจากทีม?', confirmLabel: 'ลบ', danger: true })
    if (!ok) return
    try {
      const { error: rpcErr } = await supabase.rpc('remove_team_member', { p_profile_id: memberId })
      if (rpcErr) throw rpcErr
      setTeam((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  const handleApproveOwner = async (userId: string, shopNameApprove: string, ppApprove: string) => {
    try {
      const { error: rpcErr } = await supabase.rpc('approve_owner_signup', {
        p_user_id: userId,
        p_shop_name: shopNameApprove,
        p_promptpay: ppApprove,
      })
      if (rpcErr) throw rpcErr
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  const ROLE_LABEL: Record<string, string> = {
    super_admin: 'Super Admin',
    owner: 'เจ้าของ',
    cashier: 'พนักงาน',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 border-[3px]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {ConfirmDialogUI}
      <h1 className="page-title flex items-center gap-2">
        <Settings2 size={20} className="text-subtle" />
        ตั้งค่า
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/40">
          {error}
        </div>
      )}

      {/* Shop Settings */}
      {(isOwner || isSuperAdmin) && shop && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} className="text-gray-400 dark:text-slate-500" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">ข้อมูลร้านค้า</h2>
          </div>
          <form onSubmit={handleSaveShop} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">ชื่อร้าน</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">หมายเลข PromptPay</label>
              <input
                type="text"
                value={promptpay}
                onChange={(e) => setPromptpay(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">จำนวนโต๊ะ</label>
              <input
                type="number"
                min="0"
                max="200"
                value={tableCount}
                onChange={(e) => setTableCount(e.target.value)}
                placeholder="เช่น 10, 20"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">ตั้งจำนวนโต๊ะเพื่อให้เลือกเลขโต๊ะจากปุ่มตอนสร้างบิล</p>
            </div>
            <button
              type="submit"
              disabled={isSavingShop}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {shopSaved ? (
                <><Check size={16} /> บันทึกแล้ว</>
              ) : (
                <><Save size={16} /> {isSavingShop ? 'กำลังบันทึก...' : 'บันทึก'}</>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Team */}
      {(isOwner || isSuperAdmin) && shop && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-gray-400 dark:text-slate-500" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">ทีมงาน</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700 mb-5 -mx-6">
            {team.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {member.full_name ?? member.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {ROLE_LABEL[member.role ?? ''] ?? member.role} · {member.email}
                  </p>
                </div>
                {member.id !== profile?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-slate-600 hover:border-red-300 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={15} className="text-gray-400 dark:text-slate-500" />
            <h3 className="font-semibold text-gray-700 dark:text-slate-300 text-sm">เพิ่มพนักงาน</h3>
          </div>
          <form onSubmit={handleCreateCashier} className="space-y-3">
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="ชื่อ-นามสกุล"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <input
              type="email"
              value={cashierEmail}
              onChange={(e) => setCashierEmail(e.target.value)}
              placeholder="อีเมล"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <input
              type="password"
              value={cashierPassword}
              onChange={(e) => setCashierPassword(e.target.value)}
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              minLength={6}
            />
            {cashierMsg && (
              <p className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1.5">
                <Check size={14} /> {cashierMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={isCreatingCashier}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
            >
              <UserPlus size={15} />
              {isCreatingCashier ? 'กำลังสร้าง...' : 'เพิ่มพนักงาน'}
            </button>
          </form>
        </section>
      )}

      {/* Pending Users — super admin shortcut */}
      {isSuperAdmin && pendingUsers.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-700/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <h2 className="font-bold text-gray-900 dark:text-slate-100">
                รออนุมัติ ({pendingUsers.length})
              </h2>
            </div>
            <a
              href="/pos/admin"
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              ดูทั้งหมด →
            </a>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div key={user.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {user.full_name ?? user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                  {user.pending_shop_name && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-0.5">
                      {user.pending_shop_name}
                      {user.pending_promptpay && ` · ${user.pending_promptpay}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleApproveOwner(
                    user.id,
                    user.pending_shop_name ?? 'New Shop',
                    user.pending_promptpay ?? ''
                  )}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  <Check size={13} />
                  อนุมัติ
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Super admin — link to full admin panel */}
      {isSuperAdmin && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-primary-500" />
              <h2 className="font-bold text-gray-900 dark:text-slate-100">Admin Panel</h2>
            </div>
            <a
              href="/pos/admin"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              จัดการร้านค้า →
            </a>
          </div>
        </section>
      )}

      {/* Account info */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3">บัญชีของคุณ</h2>
        <p className="text-gray-900 dark:text-slate-100 font-medium">{profile?.full_name}</p>
        <p className="text-gray-500 dark:text-slate-400 text-sm">
          {ROLE_LABEL[profile?.role ?? ''] ?? profile?.role}
        </p>
      </section>
    </div>
  )
}
