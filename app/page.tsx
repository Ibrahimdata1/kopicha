import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Coffee, QrCode, MonitorSmartphone, CreditCard, Users, BarChart3, ArrowRight, Check, Handshake, Banknote, GraduationCap, Megaphone } from 'lucide-react'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/pos/sessions')
  }

  const features = [
    { icon: QrCode, title: 'QR สั่งอาหาร', desc: 'ลูกค้าสแกน QR สั่งเอง ไม่ต้องจ้างพนักงานเพิ่ม' },
    { icon: MonitorSmartphone, title: 'ใช้ได้ทุกเครื่อง', desc: 'มือถือ แท็บเล็ต คอม ไม่ต้องซื้อเครื่อง POS' },
    { icon: CreditCard, title: 'รับชำระเงิน', desc: 'เงินสด หรือ QR PromptPay อัตโนมัติ' },
    { icon: Users, title: 'จัดการโต๊ะ', desc: 'เปิดบิล ย้ายโต๊ะ ดูสถานะ realtime' },
    { icon: BarChart3, title: 'สรุปยอดขาย', desc: 'ดูรายได้วันนี้ เดือนนี้ แยกตามเมนู' },
  ]

  const pricingFeatures = [
    'QR สั่งอาหาร ไม่จำกัด',
    'จัดการโต๊ะ ไม่จำกัด',
    'เมนูไม่จำกัด',
    'รับชำระเงินสด + โอน',
    'ส่วนลด / โปรโมชั่น',
    'สรุปยอดขาย',
    'ใบเสร็จ 80mm',
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-sm shadow-primary-500/30">
              <Coffee size={16} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-slate-100">QRforPay</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/partner" className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition hidden sm:block">
              ตัวแทนขาย
            </Link>
            <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition">
              เข้าสู่ระบบ
            </Link>
            <Link href="/register" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl transition shadow-sm shadow-primary-500/25">
              สมัครเลย
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full mb-6 border border-primary-100 dark:border-primary-900/50">
          <Coffee size={14} />
          ระบบ POS สำหรับร้านอาหารและคาเฟ่
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight leading-tight mb-5">
          ลูกค้าสแกน QR<br />
          <span className="text-primary-500">สั่งอาหารเอง</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
          ไม่ต้องซื้อเครื่อง POS ไม่ต้องจ้างพนักงานเพิ่ม ใช้มือถือหรือแท็บเล็ตที่มีอยู่ เริ่มใช้ได้ทันที
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition shadow-lg shadow-primary-500/25 text-base"
          >
            ทดลองฟรี 7 วัน
            <ArrowRight size={18} />
          </Link>
          <a
            href="#pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-xl transition text-base"
          >
            ดูราคา
          </a>
          <a
            href="#partner"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-amber-600 dark:text-amber-400 font-bold rounded-xl transition text-base hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            <Handshake size={18} />
            สนใจเป็นตัวแทนขาย
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-slate-900 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 text-center mb-10">ฟีเจอร์ครบ จบในแอปเดียว</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/30 rounded-xl flex items-center justify-center mb-3">
                  <f.icon size={20} className="text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 text-center mb-3">ราคา</h2>
          <p className="text-gray-600 dark:text-slate-400 text-center mb-10">ถูกกว่าคู่แข่ง 3-6 เท่า ไม่ต้องลงทุน hardware</p>

          <div className="max-w-sm mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary-500 p-8 shadow-lg shadow-primary-500/10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 text-white text-xs font-bold rounded-full">
                แนะนำ
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-1">Pro</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-slate-100">฿199</span>
                  <span className="text-gray-500 dark:text-slate-400">/เดือน</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">แรกเข้า ฿999 (ครั้งเดียว)</p>
              </div>

              <ul className="space-y-3 mb-8">
                {pricingFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-slate-300">
                    <Check size={16} className="text-primary-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition shadow-md shadow-primary-500/25"
              >
                สมัครเลย
                <ArrowRight size={16} />
              </Link>
              <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-3">เริ่มใช้ได้ทันที ไม่ต้องรอ approve</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reseller / Partner */}
      <section id="partner" className="bg-gray-50 dark:bg-slate-900 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-full mb-4 border border-amber-200 dark:border-amber-900/50">
              <Handshake size={14} />
              โปรแกรมตัวแทนขาย
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-3">หารายได้เสริม เป็นตัวแทนขาย QRforPay</h2>
            <p className="text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">แนะนำร้านอาหาร/คาเฟ่ให้ใช้ QRforPay รับเงิน ฿999 ต่อร้านทันที ไม่ต้องสมัคร ไม่ต้องลงทุน</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 text-center">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Banknote size={22} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">รับ ฿999 ทันที</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">เก็บค่าแรกเข้าจากร้านค้าโดยตรง เป็นรายได้ของคุณเต็มจำนวน</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 text-center">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <GraduationCap size={22} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">เซ็ตอัพ + สอนใช้</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">ช่วยร้านตั้งเมนู ตั้งโต๊ะ สอนใช้ระบบ ลูกค้าได้ประโยชน์ทันที</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 text-center">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Megaphone size={22} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">ไม่จำกัดร้าน</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">ยิ่งแนะนำมาก ยิ่งได้มาก ไม่มีเพดานรายได้</p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 max-w-2xl mx-auto">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-4 text-center">วิธีการทำงาน</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">เดินเข้าร้าน หรือติดต่อเจ้าของร้าน</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">แนะนำ QRforPay ให้ร้านอาหาร/คาเฟ่ที่สนใจ</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">เก็บค่าเซ็ตอัพ ฿999 จากร้านค้า</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">เงินนี้เป็นของคุณทั้งหมด ร้านได้ระบบพร้อมใช้ทันที</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">ช่วยร้านสมัคร + ตั้งค่าระบบ</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">ตั้งเมนู ตั้งโต๊ะ ตั้ง PromptPay สอนใช้งาน</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">4</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">ร้านจ่าย ฿199/เดือน ต่อเอง</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">คุณไม่ต้องดูแลต่อ ระบบทำงานอัตโนมัติ</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
              <p className="text-center text-sm text-amber-800 dark:text-amber-300">
                <span className="font-bold">ตัวอย่าง:</span> แนะนำ 10 ร้าน = รายได้ <span className="font-bold">฿9,990</span> ไม่ต้องลงทุนสักบาท
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/partner"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-lg shadow-amber-500/25 text-base"
              >
                สมัครเป็นตัวแทน — ฟรี
                <ArrowRight size={18} />
              </Link>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">กรอกข้อมูล 30 วินาที รับรหัสตัวแทนทันที</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-500 py-14">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">พร้อมเริ่มใช้ QRforPay?</h2>
          <p className="text-primary-100 mb-6">สมัครวันนี้ เริ่มรับออเดอร์ได้ทันที</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white hover:bg-gray-50 text-primary-600 font-bold rounded-xl transition shadow-lg text-base"
            >
              เจ้าของร้าน — สมัครเลย
              <ArrowRight size={18} />
            </Link>
            <a
              href="#partner"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition text-base border border-primary-400"
            >
              สนใจเป็นตัวแทน
              <Handshake size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 bg-primary-500 rounded-lg flex items-center justify-center">
              <Coffee size={12} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-slate-100">QRforPay</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">ระบบ POS สำหรับร้านอาหารและคาเฟ่</p>
        </div>
      </footer>
    </div>
  )
}
