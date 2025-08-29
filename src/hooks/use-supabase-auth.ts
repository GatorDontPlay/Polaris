'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User, type Session, type AuthError } from '@supabase/supabase-js'

export interface SupabaseUser extends User {
  role?: 'EMPLOYEE' | 'CEO'
  first_name?: string
  last_name?: string
  avatar_url?: string
}

interface SupabaseAuthState {
  user: SupabaseUser | null
  session: Session | null
  isLoading: boolean
  error: AuthError | null
}

export function useSupabaseAuth() {
  const [state, setState] = useState<SupabaseAuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
  })

  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setState(prev => ({ ...prev, error, isLoading: false }))
        return
      }

      // Fetch user profile if session exists
      let userWithProfile = session?.user || null
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, first_name, last_name, avatar_url')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          userWithProfile = { ...session.user, ...profile } as SupabaseUser
        }
      }

      setState({
        user: userWithProfile,
        session,
        isLoading: false,
        error: null,
      })
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          })
          // Redirect to login page on sign out
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return
        }

        // Fetch user profile for sign in/token refresh
        let userWithProfile = session?.user || null
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, first_name, last_name, avatar_url')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            userWithProfile = { ...session.user, ...profile } as SupabaseUser
          }
        }

        setState({
          user: userWithProfile,
          session,
          isLoading: false,
          error: null,
        })

        // Handle successful sign in redirect
        if (event === 'SIGNED_IN' && userWithProfile && typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          // Only redirect if user is on auth pages
          if (currentPath === '/login' || currentPath === '/' || currentPath.startsWith('/auth/')) {
            const targetPath = (userWithProfile as SupabaseUser).role === 'CEO' ? '/admin' : '/dashboard'
            setTimeout(() => {
              window.location.href = targetPath
            }, 500) // Small delay to allow toast to show
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string; role?: 'EMPLOYEE' | 'CEO' }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      setState(prev => ({ ...prev, error, isLoading: false }))
      return { data: null, error }
    }

    // If user is immediately confirmed, create profile
    if (data.user && !data.user.email_confirmed_at) {
      // User needs to confirm email
      setState(prev => ({ ...prev, isLoading: false }))
    }

    return { data, error: null }
  }

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState(prev => ({ ...prev, error, isLoading: false }))
      return { data: null, error }
    }

    return { data, error: null }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      setState(prev => ({ ...prev, error, isLoading: false }))
      return { error }
    }

    return { error: null }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  const updateProfile = async (updates: Partial<{ first_name: string; last_name: string; avatar_url: string }>) => {
    if (!state.user) return { error: new Error('No user logged in') }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)

    if (!error && state.user) {
      // Update local state
      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...updates } : null
      }))
    }

    return { error }
  }

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    supabase,
  }
}
