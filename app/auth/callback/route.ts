import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Whitelist safe redirect paths — prevent open redirect attacks
  const SAFE_PATHS = ['/pos/sessions', '/pos/admin', '/pos/dashboard', '/pos/orders', '/pos/products', '/pos/tables', '/pos/settings', '/pending', '/register/shop']
  const rawNext = searchParams.get('next')
  const next = rawNext && SAFE_PATHS.includes(rawNext) ? rawNext : '/pos/sessions'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user has a role — if not, send to shop registration
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (!profile?.role) {
          return NextResponse.redirect(`${origin}/register/shop`)
        }
        if (profile.role === 'super_admin') {
          return NextResponse.redirect(`${origin}/pos/admin`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
