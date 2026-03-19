'use client'

import Link from 'next/link'
import { useState } from 'react'
import { QrCode, MonitorSmartphone, CreditCard, Users, BarChart3, ArrowRight, Check, Handshake, Banknote, GraduationCap, Megaphone, Zap, Search, Copy, Store } from 'lucide-react'
import Logo from '@/components/Logo'
import PublicNav from '@/components/PublicNav'
import { useI18n } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase-browser'

interface AgentResult { code: string; name: string; link: string; shopCount: number }

export default function LandingContent() {
  const { t } = useI18n()
  const [lookupPhone, setLookupPhone] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [lookupResult, setLookupResult] = useState<AgentResult | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = lookupPhone.replace(/\D/g, '')
    if (digits.length !== 10) { setLookupError('กรอกเบอร์โทร 10 หลัก'); return }
    setLookupLoading(true); setLookupError(''); setLookupResult(null)
    try {
      const supabase = createClient()
      const { data: agent } = await supabase.from('agents').select('code, name').eq('phone', digits).eq('active', true).order('created_at', { ascending: false }).limit(1).single()
      if (!agent) { setLookupError('ไม่พบข้อมูลตัวแทน กรุณาตรวจสอบเบอร์โทร'); return }
      const { count } = await supabase.from('shops').select('id', { count: 'exact', head: true }).eq('referral_code', agent.code)
      setLookupResult({ code: agent.code, name: agent.name, link: `${window.location.origin}/register?ref=${agent.code}`, shopCount: count ?? 0 })
    } catch { setLookupError('เกิดข้อผิดพลาด กรุณาลองใหม่') }
    finally { setLookupLoading(false) }
  }

  const handleCopy = async (type: 'code' | 'link', text: string) => {
    await navigator.clipboard.writeText(text); setCopied(type); setTimeout(() => setCopied(null), 2000)
  }

  const features = [
    { icon: QrCode, titleKey: 'landing.feat1Title', descKey: 'landing.feat1Desc' },
    { icon: MonitorSmartphone, titleKey: 'landing.feat2Title', descKey: 'landing.feat2Desc' },
    { icon: CreditCard, titleKey: 'landing.feat3Title', descKey: 'landing.feat3Desc' },
    { icon: Users, titleKey: 'landing.feat4Title', descKey: 'landing.feat4Desc' },
    { icon: BarChart3, titleKey: 'landing.feat5Title', descKey: 'landing.feat5Desc' },
    { icon: Zap, titleKey: 'landing.feat6Title', descKey: 'landing.feat6Desc' },
  ]

  const pricingFeatures = [
    'landing.priceFeat1', 'landing.priceFeat2', 'landing.priceFeat3',
    'landing.priceFeat4', 'landing.priceFeat5', 'landing.priceFeat6', 'landing.priceFeat7',
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <PublicNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-24 pb-20 text-center">
        <p className="text-base font-medium text-primary-600 dark:text-primary-400 mb-5">{t('landing.tagline')}</p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-tight mb-6">
          {t('landing.heroTitle1')}
          <br />
          <span className="text-primary-600 dark:text-primary-400">{t('landing.heroTitle2')}</span>
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 max-w-xl mx-auto mb-10 leading-relaxed">
          {t('landing.heroDesc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-sm">
            {t('landing.trialBtn')} <ArrowRight size={16} />
          </Link>
          <a href="#pricing" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium rounded-lg transition-colors text-sm">
            {t('landing.pricingBtn')}
          </a>
          <a href="#partner" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-amber-600 dark:text-amber-400 font-medium rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-sm">
            <Handshake size={16} /> {t('landing.resellerBtn')}
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-stone-100 dark:border-stone-900">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-3 text-center">Features</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 text-center mb-12">{t('landing.featuresTitle')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden border border-stone-100 dark:border-stone-800">
            {features.map((f, i) => (
              <div key={i} className="bg-white dark:bg-stone-900 p-6">
                <f.icon size={20} className="text-primary-600 dark:text-primary-400 mb-3" />
                <h3 className="font-display font-semibold text-stone-900 dark:text-stone-100 mb-1 text-lg">{t(f.titleKey)}</h3>
                <p className="text-stone-500 dark:text-stone-400 leading-relaxed">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-stone-100 dark:border-stone-900">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-3 text-center">Pricing</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 text-center mb-3">{t('landing.pricingTitle')}</h2>
          <p className="text-lg text-stone-500 dark:text-stone-400 text-center mb-12">{t('landing.pricingDesc')}</p>

          <div className="max-w-sm mx-auto">
            <div className="bg-white dark:bg-stone-900 rounded-lg border-2 border-primary-600 dark:border-primary-400 p-8">
              <div className="text-center mb-6">
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-md">{t('landing.recommended')}</span>
                <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100 mt-3">Pro</h3>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="font-display text-4xl font-bold text-stone-900 dark:text-stone-100">฿199</span>
                  <span className="text-stone-400 text-sm">{t('landing.perMonth')}</span>
                </div>
                <p className="text-xs text-stone-400 mt-1">{t('landing.setupFee')}</p>
              </div>
              <div className="h-px bg-stone-100 dark:bg-stone-800 mb-6" />
              <ul className="space-y-3 mb-6">
                {pricingFeatures.map((key, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                    <Check size={14} className="text-primary-600 dark:text-primary-400 shrink-0" /> {t(key)}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-sm">
                {t('common.register')} <ArrowRight size={14} />
              </Link>
              <p className="text-center text-xs text-stone-400 mt-3">{t('landing.startNow')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner */}
      <section id="partner" className="border-t border-stone-100 dark:border-stone-900">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-md">{t('landing.resellerTag')}</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 mt-5 mb-3">{t('landing.resellerTitle')}</h2>
            <p className="text-lg text-stone-500 dark:text-stone-400">{t('landing.resellerDesc')}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-px bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden border border-stone-100 dark:border-stone-800 mb-12">
            {[
              { icon: Banknote, titleKey: 'landing.earn999', descKey: 'landing.earn999Desc' },
              { icon: GraduationCap, titleKey: 'landing.setupTraining', descKey: 'landing.setupTrainingDesc' },
              { icon: Megaphone, titleKey: 'landing.unlimited', descKey: 'landing.unlimitedDesc' },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-stone-900 p-6 text-center">
                <item.icon size={20} className="text-amber-500 mx-auto mb-3" />
                <h3 className="font-display font-semibold text-stone-900 dark:text-stone-100 mb-1.5 text-lg">{t(item.titleKey)}</h3>
                <p className="text-stone-500 dark:text-stone-400">{t(item.descKey)}</p>
              </div>
            ))}
          </div>

          <div className="max-w-xl mx-auto bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 p-8">
            <h3 className="font-display font-semibold text-stone-900 dark:text-stone-100 mb-6 text-center text-xl">{t('landing.howItWorks')}</h3>
            <div className="space-y-4">
              {[
                { n: '1', titleKey: 'landing.step1', descKey: 'landing.step1Desc' },
                { n: '2', titleKey: 'landing.step2', descKey: 'landing.step2Desc' },
                { n: '3', titleKey: 'landing.step3', descKey: 'landing.step3Desc' },
                { n: '4', titleKey: 'landing.step4', descKey: 'landing.step4Desc' },
              ].map((step) => (
                <div key={step.n} className="flex gap-3">
                  <span className="w-7 h-7 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md flex items-center justify-center text-xs font-bold shrink-0">{step.n}</span>
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-100">{t(step.titleKey)}</p>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{t(step.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <p className="text-center text-sm text-amber-700 dark:text-amber-300">
                {t('landing.example')} <span className="font-semibold">฿9,990</span>
              </p>
            </div>
            <div className="mt-6 text-center">
              <Link href="/register?mode=agent" className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm">
                {t('landing.registerReseller')} <ArrowRight size={14} />
              </Link>
            </div>

            {/* Lookup box */}
            <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800">
              <p className="text-center text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">เป็นตัวแทนอยู่แล้ว? ค้นหารหัสของคุณ</p>
              {!lookupResult ? (
                <form onSubmit={handleLookup} className="flex gap-2">
                  <input
                    type="tel"
                    value={lookupPhone}
                    onChange={(e) => { setLookupPhone(e.target.value.replace(/\D/g, '')); setLookupError('') }}
                    inputMode="numeric"
                    maxLength={10}
                    className="input flex-1 text-sm"
                    placeholder="เบอร์โทร 10 หลัก"
                  />
                  <button type="submit" disabled={lookupLoading} className="px-4 py-2 bg-stone-800 dark:bg-stone-700 hover:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-lg text-sm font-medium transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50">
                    <Search size={14} />
                    {lookupLoading ? '...' : 'ค้นหา'}
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  <p className="text-center text-sm text-stone-500">สวัสดี <strong className="text-stone-900 dark:text-stone-100">{lookupResult.name}</strong></p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">รหัสตัวแทน — ให้ร้านค้ากรอกตอนสมัคร เพื่อยืนยันว่าคุณเป็นคนแนะนำ</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-800 dark:text-amber-200 flex-1 text-sm">{lookupResult.code}</span>
                      <button type="button" onClick={() => handleCopy('code', lookupResult.code)} className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition">
                        {copied === 'code' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-amber-600 dark:text-amber-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2">
                    <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">ลิงก์สมัคร — ส่งให้ร้านค้า กดลิงก์นี้แล้วรหัสจะถูกกรอกให้อัตโนมัติ</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-stone-600 dark:text-stone-300 flex-1 break-all">{lookupResult.link}</span>
                      <button type="button" onClick={() => handleCopy('link', lookupResult.link)} className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition shrink-0">
                        {copied === 'link' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-stone-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 justify-center">
                    <Store size={12} /> แนะนำไปแล้ว {lookupResult.shopCount} ร้าน
                  </div>
                  <button type="button" onClick={() => { setLookupResult(null); setLookupPhone('') }} className="w-full text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 py-1 transition">
                    ค้นหาใหม่
                  </button>
                </div>
              )}
              {lookupError && <p className="text-xs text-red-500 mt-2 text-center">{lookupError}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 dark:bg-primary-700">
        <div className="max-w-5xl mx-auto px-5 py-16 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-3">{t('landing.ctaTitle')}</h2>
          <p className="text-primary-100 mb-8">{t('landing.ctaDesc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white hover:bg-stone-50 text-primary-700 font-medium rounded-lg transition-colors text-sm">
              {t('landing.ctaOwner')} <ArrowRight size={14} />
            </Link>
            <a href="#partner" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white font-medium rounded-lg transition-colors text-sm border border-white/25 hover:bg-white/10">
              {t('landing.ctaReseller')} <Handshake size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 dark:border-stone-900 py-8">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo size={24} />
            <span className="font-display font-semibold text-stone-900 dark:text-stone-100">QRforPay</span>
          </div>
          <p className="text-xs text-stone-400">{t('landing.footerDesc')}</p>
        </div>
      </footer>
    </div>
  )
}
