'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import type { PendingUser, TeamMember } from '@/lib/types'
import { useConfirm } from '@/components/ConfirmDialog'
import {
  Camera,
  Check,
  Clock,
  CreditCard,
  Save,
  Settings2,
  ShieldAlert,
  Smartphone,
  Store,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import Image from 'next/image'

export default function SettingsPage() {
  const supabase = createClient()
  const { confirm, ConfirmDialogUI } = useConfirm()
  const { profile, shop, refreshShop } = usePosContext()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)

  const [shopName, setShopName] = useState(shop?.name ?? '')
  const [promptpay, setPromptpay] = useState(shop?.promptpay_id ?? '')
  const [tableCount, setTableCount] = useState(shop?.table_count != null ? String(shop.table_count) : '')
  const [paymentMode, setPaymentMode] = useState<'auto' | 'counter'>(shop?.payment_mode ?? 'counter')
  const [isSavingShop, setIsSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  const [cashierName, setCashierName] = useState('')
  const [cashierEmail, setCashierEmail] = useState('')
  const [cashierPassword, setCashierPassword] = useState('')
  const [isCreatingCashier, setIsCreatingCashier] = useState(false)
  const [cashierMsg, setCashierMsg] = useState('')

  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const [error, setError] = useState('')

  const isSuperAdmin = profile?.role === 'super_admin'
  const isOwner = profile?.role === 'owner'

  useEffect(() => {
    const load = async () => {
      if (profile?.shop_id) {
        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('shop_id', profile.shop_id)
          .order('created_at')
        setTeam((teamData ?? []) as TeamMember[])
      }

      if (profile?.role === 'super_admin') {
        const { data: pending } = await supabase.rpc('get_pending_users')
        setPendingUsers((pending ?? []) as PendingUser[])
      }

      setLoading(false)
    }
    load()
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
        .update({ name, promptpay_id: pp, table_count: tc, payment_mode: paymentMode })
        .eq('id', shop.id)
      if (updateErr) throw updateErr
      await refreshShop()
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !shop?.id) return
    if (!file.type.startsWith('image/')) { setError('กรุณาเลือกไฟล์รูปภาพ'); return }
    if (file.size > 2 * 1024 * 1024) { setError('ขนาดไฟล์ต้องไม่เกิน 2MB'); return }

    setIsUploadingLogo(true)
    setError('')
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const filePath = `${shop.id}/logo.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('shop-logos')
        .upload(filePath, file, { upsert: true })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('shop-logos')
        .getPublicUrl(filePath)

      const logoUrl = urlData.publicUrl + '?t=' + Date.now()

      const { error: updateErr } = await supabase
        .from('shops')
        .update({ logo_url: logoUrl })
        .eq('id', shop.id)
      if (updateErr) throw updateErr

      await refreshShop()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'อัพโหลดไม่สำเร็จ')
    } finally {
      setIsUploadingLogo(false)
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

      {/* Subscription Status */}
      {isOwner && shop && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-gray-400 dark:text-slate-500" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">สถานะการใช้งาน</h2>
          </div>
          {(() => {
            const now = new Date()
            const firstProduct = shop.first_product_at ? new Date(shop.first_product_at) : null
            const trialEnd = firstProduct ? new Date(firstProduct.getTime() + 7 * 24 * 60 * 60 * 1000) : null
            const isInTrial = !shop.setup_fee_paid && trialEnd && trialEnd > now
            const subDate = shop.subscription_paid_until ? new Date(shop.subscription_paid_until) : null
            const subExpired = subDate && subDate < now

            return (
              <div className="space-y-2">
                {/* Trial status */}
                {!shop.setup_fee_paid && !firstProduct && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <span className="text-sm text-blue-700 dark:text-blue-300">ทดลองใช้ฟรี 7 วัน — เริ่มนับหลังสร้างสินค้าชิ้นแรก</span>
                  </div>
                )}
                {isInTrial && trialEnd && (
                  <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <span className="text-sm text-amber-700 dark:text-amber-300">ทดลองใช้ฟรี</span>
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      หมดอายุ {trialEnd.toLocaleDateString('en-GB')} (เหลือ {Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} วัน)
                    </span>
                  </div>
                )}
                {/* Subscription status */}
                {shop.setup_fee_paid && subDate && (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${subExpired ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                    <span className={`text-sm ${subExpired ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                      {subExpired ? 'หมดอายุแล้ว' : 'สมาชิก'}
                    </span>
                    <span className={`text-sm font-semibold ${subExpired ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                      ถึง {subDate.toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
                {shop.setup_fee_paid && !subDate && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                    <span className="text-sm text-gray-600 dark:text-slate-300">ยังไม่ได้ตั้งวันหมดอายุ</span>
                  </div>
                )}
              </div>
            )
          })()}
        </section>
      )}

      {/* Shop Settings */}
      {(isOwner || isSuperAdmin) && shop && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} className="text-gray-400 dark:text-slate-500" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">ข้อมูลร้านค้า</h2>
          </div>
          {/* Shop Logo — owner only */}
          {isOwner && (
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100 dark:border-slate-700">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shrink-0 flex items-center justify-center">
                {shop.logo_url ? (
                  <Image src={shop.logo_url} alt="Logo" width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <Store size={24} className="text-gray-300 dark:text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-1">โลโก้ร้าน</p>
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  isUploadingLogo
                    ? 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                    : 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-950/50'
                }`}>
                  <Camera size={13} />
                  {isUploadingLogo ? 'กำลังอัพโหลด...' : 'เปลี่ยนรูป'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">สูงสุด 2MB</p>
              </div>
            </div>
          )}

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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">ระบบชำระเงิน</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('counter')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMode === 'counter'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <CreditCard size={22} className={paymentMode === 'counter' ? 'text-primary-500' : 'text-gray-400 dark:text-slate-500'} />
                  <span className={`text-sm font-semibold ${paymentMode === 'counter' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-slate-400'}`}>จ่ายที่เคาน์เตอร์</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400 text-center leading-snug">ลูกค้าสั่งแล้วมาจ่ายกับพนักงาน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('auto')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMode === 'auto'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <Smartphone size={22} className={paymentMode === 'auto' ? 'text-primary-500' : 'text-gray-400 dark:text-slate-500'} />
                  <span className={`text-sm font-semibold ${paymentMode === 'auto' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-slate-400'}`}>จ่ายเองอัตโนมัติ</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400 text-center leading-snug">ลูกค้าสแกนจ่าย QR PromptPay เอง</span>
                </button>
              </div>
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

      {/* Team — owner and super_admin can manage team */}
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
