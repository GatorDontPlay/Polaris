'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSupabaseAuth, type SupabaseUser } from '@/hooks/use-supabase-auth'
import { type Session, type AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface SupabaseAuthContextType {
  user: SupabaseUser | null
  session: Session | null
  isLoading: boolean
  error: AuthError | null
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; role?: 'EMPLOYEE' | 'CEO' }) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
  updateProfile: (updates: Partial<{ first_name: string; last_name: string; avatar_url: string }>) => Promise<{ error: any }>
  supabase: ReturnType<typeof createClient>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

interface SupabaseAuthProviderProps {
  children: ReactNode
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const auth = useSupabaseAuth()

  return (
    <SupabaseAuthContext.Provider value={auth}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

// Helper hook for role-based access control
export function useRole() {
  const { user } = useAuth()
  
  const isEmployee = user?.role === 'EMPLOYEE'
  const isCEO = user?.role === 'CEO'
  const hasRole = (role: 'EMPLOYEE' | 'CEO') => user?.role === role
  
  return {
    role: user?.role || null,
    isEmployee,
    isCEO,
    hasRole,
  }
}
