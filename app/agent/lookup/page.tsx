'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Search, Handshake, Copy, Check, Store, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'

interface AgentInfo {
  code: string
  name: string
  link: string
  shopCount: number
}

export default function AgentLookupPage() {
  const { t } = useI18n()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AgentInfo | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) { setError(t('agentLookup.phone10Digits')); return }
    if (!digits.startsWith('0')) { setError(t('agentLookup.phoneStartWith0')); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const supabase = createClient()

      // Find agent by phone
      const { data: agent, error: agentErr } = await supabase
        .from('agents')
        .select('code, name')
        .eq('phone', digits)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (agentErr || !agent) {
        setError(t('agentLookup.notFound'))
        return
      }

      // Count referred shops
      const { count } = await supabase
        .from('shops')
        .select('id', { count: 'exact', head: true })
        .eq('referral_code', agent.code)

      const link = `${window.location.origin}/register?ref=${agent.code}`

      setResult({
        code: agent.code,
        name: agent.name,
        link,
        shopCount: count ?? 0,
      })
    } catch {
      setError(t('agentLookup.retryError'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (type: 'code' | 'link', text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />

      <div className="w-full max-w-sm relative animate-fade-in-up">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card-xl border border-gray-100 dark:border-slate-800 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-accent-500/25">
              <Handshake size={26} className="text-white" />
            </div>
            <h1 className="font-display text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {t('agentLookup.title')}
            </h1>
            <p className="text-muted text-sm mt-1.5">{t('agentLookup.subtitle')}</p>
          </div>

          {!result ? (
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  {t('register.phone')}
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    maxLength={10}
                    className="input pl-10"
                    placeholder="0812345678"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm px-4 py-3 rounded-xl border border-rose-100 dark:border-rose-800/40">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm bg-accent-500 hover:bg-accent-600 shadow-accent-500/20 hover:shadow-accent-500/25">
                {loading ? (
                  <><span className="spinner-sm border-white border-t-transparent" /> {t('common.searching')}</>
                ) : (
                  <><Search size={16} /> {t('common.search')}</>
                )}
              </button>
            </form>
          ) : (
            <>
              {/* Agent name */}
              <div className="text-center mb-4">
                <p className="text-sm text-muted">{t('agentLookup.hello')}</p>
                <p className="font-display font-bold text-lg text-gray-900 dark:text-slate-100">{result.name}</p>
              </div>

              {/* Code */}
              <div className="bg-amber-50 dark:bg-amber-900/15 rounded-xl p-4 mb-3 border border-amber-200/60 dark:border-amber-700/30">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">{t('agentLookup.yourCode')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-amber-800 dark:text-amber-200 tracking-wider flex-1">{result.code}</span>
                  <button onClick={() => handleCopy('code', result.code)} className="p-2.5 bg-amber-200 dark:bg-amber-800 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                    {copied === 'code' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-amber-700 dark:text-amber-300" />}
                  </button>
                </div>
              </div>

              {/* Link */}
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-slate-700">
                <p className="text-xs text-muted font-medium mb-2">{t('agentLookup.referralLink')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-700 dark:text-slate-300 break-all flex-1 font-mono">{result.link}</p>
                  <button onClick={() => handleCopy('link', result.link)} className="p-2.5 bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                    {copied === 'link' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-gray-500" />}
                  </button>
                </div>
              </div>

              {/* Shop count */}
              <div className="bg-primary-50 dark:bg-primary-900/15 rounded-xl p-4 mb-4 border border-primary-200/60 dark:border-primary-700/30 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
                  <Store size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-gray-900 dark:text-slate-100">{result.shopCount} {t('common.shop')}</p>
                  <p className="text-xs text-muted">{t('agentLookup.shopCount')}</p>
                </div>
              </div>

              <button onClick={() => { setResult(null); setPhone('') }} className="btn-secondary w-full py-2.5 text-sm">
                <ArrowLeft size={15} /> {t('agentLookup.searchOther')}
              </button>
            </>
          )}

          <p className="text-center text-sm text-muted mt-6">
            {t('agentLookup.notRegistered')}{' '}
            <Link href="/register?mode=agent" className="text-accent-600 dark:text-accent-400 font-medium hover:underline">{t('agentLookup.registerAgent')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
