'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useRole } from '@/providers/supabase-auth-provider'

interface AuthRedirectProps {
  children: React.ReactNode
}

export default function AuthRedirect({ children }: AuthRedirectProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { isCEO, isEmployee } = useRole()

  useEffect(() => {
    if (!isLoading && user) {
      // If user is authenticated and on auth page, redirect to appropriate dashboard
      const currentPath = window.location.pathname
      
      if (currentPath === '/login' || currentPath === '/') {
        if (isCEO) {
          router.push('/admin')
        } else if (isEmployee) {
          router.push('/dashboard')
        }
      }
    }
  }, [user, isLoading, router, isCEO, isEmployee])

  return <>{children}</>
}
