import type { Metadata, Viewport } from 'next'
import { Kanit, Sarabun } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-provider'
import { I18nProvider } from '@/lib/i18n/context'

const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-kanit',
})

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sarabun',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export const metadata: Metadata = {
  title: 'QRforPay',
  description: 'QR-based ordering and payment system for modern cafés',
  metadataBase: new URL('https://qrforpaytest.vercel.app'),
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'QRforPay' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${kanit.variable} ${sarabun.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://nooljfpynicvckfbsaba.supabase.co" />
        <link rel="dns-prefetch" href="https://nooljfpynicvckfbsaba.supabase.co" />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <ThemeProvider><I18nProvider>{children}</I18nProvider></ThemeProvider>
      </body>
    </html>
  )
}
