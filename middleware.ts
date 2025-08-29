import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  const { pathname } = request.nextUrl
  
  // Allow public routes
  const publicRoutes = ['/login', '/auth/confirm', '/auth/error', '/auth/reset-password', '/api/health']
  if (publicRoutes.includes(pathname) || pathname.startsWith('/api/')) {
    // Still need to refresh the session for public routes
    await supabase.auth.getUser()
    return supabaseResponse
  }

  // Check authentication for protected routes
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role

  // Role-based route protection
  if (pathname.startsWith('/admin') || pathname.startsWith('/(ceo)')) {
    if (userRole !== 'CEO') {
      // Redirect non-CEO users to employee dashboard
      const redirectUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/(employee)')) {
    if (userRole === 'CEO') {
      // Redirect CEO users to admin dashboard
      const redirectUrl = new URL('/admin', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect root path based on role
  if (pathname === '/') {
    const redirectUrl = new URL(userRole === 'CEO' ? '/admin' : '/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/health (health check endpoint)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
