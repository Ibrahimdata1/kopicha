'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Coffee,
  Grid3X3,
  LogOut,
  Moon,
  Package,
  QrCode,
  Receipt,
  Settings,
  Shield,
  Sun,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useTheme } from '@/lib/theme-provider'

interface Props {
  profile: { role: string | null; shop_id: string | null; full_name: string } | null
}

const NAV_ITEMS = [
  { href: '/pos/sessions', label: 'QR Sessions', Icon: QrCode },
  { href: '/pos/tables', label: 'โต๊ะ', Icon: Grid3X3 },
  { href: '/pos/orders', label: 'บิล', Icon: Receipt },
  { href: '/pos/products', label: 'สินค้า', Icon: Package },
  { href: '/pos/dashboard', label: 'สรุป', Icon: BarChart3 },
  { href: '/pos/settings', label: 'ตั้งค่า', Icon: Settings },
]

export default function PosNav({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isSuperAdmin = profile?.role === 'super_admin'

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-0.5">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-4 select-none">
              <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center shadow-sm shadow-primary-500/30">
                <Coffee size={14} strokeWidth={2.5} className="text-white" />
              </div>
              <span className="font-bold text-sm hidden sm:block tracking-tight text-gray-900 dark:text-slate-100">
                Kopicha
              </span>
            </div>

            {/* Nav items */}
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
                      : 'text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.5 : 2}
                    className={active ? 'text-primary-600 dark:text-primary-400' : ''}
                  />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}

            {isSuperAdmin && (
              <Link
                href="/pos/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  pathname.startsWith('/pos/admin')
                    ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
                    : 'text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                <Shield
                  size={15}
                  strokeWidth={pathname.startsWith('/pos/admin') ? 2.5 : 2}
                  className={pathname.startsWith('/pos/admin') ? 'text-primary-600 dark:text-primary-400' : ''}
                />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
          </div>

          {/* Right: Theme toggle + name + logout */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-300 transition-all duration-150"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {profile?.full_name && (
              <span className="text-xs text-slate-500 dark:text-slate-300 hidden sm:block px-2">
                {profile.full_name.length > 20
                  ? profile.full_name.slice(0, 20) + '…'
                  : profile.full_name}
              </span>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-300 transition-all duration-150"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
