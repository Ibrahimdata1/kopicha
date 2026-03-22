'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Coffee, Handshake, User, Phone, MessageCircle, ArrowRight, Copy, Check, ExternalLink } from 'lucide-react'

function generateCode(name: string) {
  const clean = name.trim().toUpperCase().replace(/\s+/g, '').slice(0, 8)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `AG-${clean}-${rand}`
}

export default function PartnerPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [lineId, setLineId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ code: string; link: string } | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name.trim().length < 2) { setError('กรุณากรอกชื่อ'); return }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) { setError('กรุณากรอกเบอร์โทร'); return }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const code = generateCode(name)

      const { error: insertErr } = await supabase.from('agents').insert({
        name: name.trim(),
        phone: phone.trim(),
        line_id: lineId.trim() || null,
        code,
      })

      if (insertErr) {
        if (insertErr.message.includes('duplicate')) {
          // Retry with different random suffix
          const code2 = generateCode(name)
          const { error: retryErr } = await supabase.from('agents').insert({
            name: name.trim(),
            phone: phone.trim(),
            line_id: lineId.trim() || null,
            code: code2,
          })
          if (retryErr) throw retryErr
          const link = `${window.location.origin}/register?ref=${code2}`
          setResult({ code: code2, link })
        } else {
          throw insertErr
        }
      } else {
        const link = `${window.location.origin}/register?ref=${code}`
        setResult({ code, link })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (type: 'code' | 'link', text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-slate-100 dark:border-slate-700 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <Check size={28} strokeWidth={2} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">สมัครสำเร็จ!</h1>
              <p className="text-muted text-sm mt-1">รหัสตัวแทนของคุณพร้อมใช้งานแล้ว</p>
            </div>

            {/* Agent Code */}
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800/40">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">รหัสตัวแทนของคุณ</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-800 dark:text-amber-200 tracking-wider flex-1">{result.code}</span>
                <button
                  onClick={() => handleCopy('code', result.code)}
                  className="p-2.5 bg-amber-200 dark:bg-amber-800 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {copied === 'code' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-amber-700 dark:text-amber-300" />}
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-muted font-medium mb-2">ลิงก์สมัครสำหรับแนะนำร้านค้า</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-300 break-all flex-1 font-mono">{result.link}</p>
                <button
                  onClick={() => handleCopy('link', result.link)}
                  className="p-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {copied === 'link' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
                </button>
              </div>
            </div>

            {/* How to use */}
            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">วิธีใช้งาน</h3>
              <div className="flex gap-3 text-sm">
                <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <p className="text-slate-600 dark:text-stone-500">ส่ง<strong>ลิงก์</strong>ให้ร้านค้า หรือช่วยสมัครให้</p>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <p className="text-slate-600 dark:text-stone-500">เก็บค่าเซ็ตอัพ <strong>฿999</strong> จากร้านค้าโดยตรง</p>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <p className="text-slate-600 dark:text-stone-500">ช่วยร้านตั้งเมนู ตั้งโต๊ะ สอนใช้ระบบ</p>
              </div>
            </div>

            <a
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition"
            >
              กลับหน้าหลัก
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-slate-100 dark:border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <Handshake size={28} strokeWidth={2} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">สมัครเป็นตัวแทนขาย</h1>
            <p className="text-muted text-sm mt-1">กรอกข้อมูล รับรหัสตัวแทนทันที</p>
          </div>

          {/* Benefits mini */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-800/40">
            <div className="flex items-center gap-3 text-sm text-amber-800 dark:text-amber-200">
              <span className="font-bold text-lg">฿999</span>
              <span>ต่อร้านที่แนะนำ — เก็บจากร้านค้าโดยตรง เป็นรายได้ของคุณ</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <User size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="ชื่อ นามสกุล"
                required
                autoFocus
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Phone size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />
                เบอร์โทร
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="input"
                placeholder="0812345678"
                required
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <MessageCircle size={13} className="inline mr-1.5 text-stone-400 dark:text-stone-500" />
                LINE ID <span className="text-muted font-normal">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="input"
                placeholder="@lineid"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-md shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="spinner-sm" /> กำลังสมัคร...</>
              ) : (
                <>
                  รับรหัสตัวแทน
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            เป็นเจ้าของร้าน?{' '}
            <a href="/register" className="text-primary-500 dark:text-primary-400 font-medium hover:underline">
              สมัครใช้ระบบ POS
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
