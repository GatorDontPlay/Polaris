import { createClient } from '@/lib/supabase/server'
import { type NextRequest } from 'next/server'
import { UserRole, hasPermission, Permission } from '@/lib/permissions'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  first_name?: string
  last_name?: string
  avatar_url?: string
}

/**
 * Get the authenticated user from the request
 * Returns null if user is not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    console.log('Auth Server: Getting authenticated user...');
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth Server: Supabase auth response:', { user: user?.id || 'null', error: authError });
    if (!user) {
      console.log('Auth Server: No user found');
      return null;
    }

    // Get user profile with role information
    console.log('Auth Server: Fetching profile for user:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single()

    console.log('Auth Server: Profile response:', { profile, error: profileError });
    if (!profile) {
      console.log('Auth Server: No profile found for user:', user.id);
      return null;
    }

    const authenticatedUser = {
      id: user.id,
      email: user.email || '',
      role: profile.role as UserRole,
      first_name: profile.first_name || undefined,
      last_name: profile.last_name || undefined,
      avatar_url: profile.avatar_url || undefined,
    };
    
    console.log('Auth Server: Returning authenticated user:', { id: authenticatedUser.id, email: authenticatedUser.email, role: authenticatedUser.role });
    return authenticatedUser;
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

/**
 * Check if the authenticated user has a specific permission
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const user = await getAuthenticatedUser()
  if (!user) return false
  
  return hasPermission(user.role, permission)
}

/**
 * Require authentication and return the user
 * Throws an error if user is not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Require a specific permission
 * Throws an error if user doesn't have the permission
 */
export async function requirePermission(permission: Permission): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Permission '${permission.name}' required`)
  }
  
  return user
}

/**
 * Require CEO role
 * Throws an error if user is not a CEO
 */
export async function requireCEO(): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  
  if (user.role !== 'CEO') {
    throw new Error('CEO role required')
  }
  
  return user
}

/**
 * Check if user can access a specific PDR
 */
export async function canUserAccessPDR(pdrUserId: string): Promise<boolean> {
  const user = await getAuthenticatedUser()
  if (!user) return false
  
  // CEO can access all PDRs
  if (user.role === 'CEO') return true
  
  // Employees can only access their own PDRs
  return user.id === pdrUserId
}

/**
 * API response helpers
 */
export const ApiError = {
  Unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { 
    status: 401, 
    headers: { 'Content-Type': 'application/json' } 
  }),
  Forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { 
    status: 403, 
    headers: { 'Content-Type': 'application/json' } 
  }),
  NotFound: () => new Response(JSON.stringify({ error: 'Not found' }), { 
    status: 404, 
    headers: { 'Content-Type': 'application/json' } 
  }),
  BadRequest: (message?: string) => new Response(JSON.stringify({ 
    error: message || 'Bad request' 
  }), { 
    status: 400, 
    headers: { 'Content-Type': 'application/json' } 
  }),
  InternalError: (message?: string) => new Response(JSON.stringify({ 
    error: message || 'Internal server error' 
  }), { 
    status: 500, 
    headers: { 'Content-Type': 'application/json' } 
  }),
}

/**
 * API middleware to handle authentication errors
 */
export async function withAuth<T>(
  handler: (user: AuthenticatedUser) => Promise<T>
): Promise<T | Response> {
  try {
    const user = await requireAuth()
    return await handler(user)
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return ApiError.Unauthorized()
    }
    throw error
  }
}

/**
 * API middleware to handle permission errors
 */
export async function withPermission<T>(
  permission: Permission,
  handler: (user: AuthenticatedUser) => Promise<T>
): Promise<T | Response> {
  try {
    const user = await requirePermission(permission)
    return await handler(user)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return ApiError.Unauthorized()
      }
      if (error.message.startsWith('Permission')) {
        return ApiError.Forbidden()
      }
    }
    throw error
  }
}
