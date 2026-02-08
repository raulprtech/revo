import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/tournaments/create',
  '/events/create',
]

// Routes that minors without verified parental consent can access
const MINOR_ALLOWED_ROUTES = [
  '/pending-consent',
  '/auth/parental-consent',
  '/api/parental-consent',
  '/clear-data',
]

// Check if the current path starts with any protected route
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

// Check if the route is allowed for unverified minors
function isMinorAllowedRoute(pathname: string): boolean {
  return MINOR_ALLOWED_ROUTES.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() here.
  // getUser() talks to the Supabase Auth server and validates the token.
  // getSession() only reads from cookies and can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If the route is protected and there's no authenticated user, redirect to login
  if (isProtectedRoute(request.nextUrl.pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // COPPA: If user is a minor without verified parental consent, 
  // redirect to pending-consent page (except for allowed routes)
  if (user && !isMinorAllowedRoute(request.nextUrl.pathname)) {
    const isMinor = user.user_metadata?.is_minor === true
    const consentVerified = user.user_metadata?.parental_consent_verified === true
    
    if (isMinor && !consentVerified) {
      // Only redirect if not already on the pending-consent page
      if (request.nextUrl.pathname !== '/pending-consent') {
        const url = request.nextUrl.clone()
        url.pathname = '/pending-consent'
        return NextResponse.redirect(url)
      }
    }
  }

  // If user is already logged in and trying to access login/signup, redirect to dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (images, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
