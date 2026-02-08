import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/profile'
  const type = searchParams.get('type') // 'signup', 'recovery', 'email_change', etc.

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const baseUrl = isLocalEnv
        ? origin
        : forwardedHost
          ? `https://${forwardedHost}`
          : origin

      // For email signup confirmation, redirect to login with confirmed param
      if (type === 'signup') {
        return NextResponse.redirect(`${baseUrl}/login?confirmed=true`)
      }

      // For other flows (OAuth, recovery, etc.), redirect to the intended page
      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  // If code exchange failed or no code present, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
