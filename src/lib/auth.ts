import { NextRequest } from 'next/server';
import { createClient } from './supabase/server';
import { AuthUser } from '@/types';

/**
 * Get user from request headers/cookies using Supabase auth
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const { createClient } = await import('./supabase/server');
    const supabase = await createClient();

    // Get user from Supabase session
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No authenticated user found in request');
      }
      return null;
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to get user profile:', profileError);
      }
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: profile.role as 'EMPLOYEE' | 'CEO',
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get user from request error:', error);
    }
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, requiredRole: 'EMPLOYEE' | 'CEO'): boolean {
  if (requiredRole === 'EMPLOYEE') {
    return user.role === 'EMPLOYEE' || user.role === 'CEO'; // CEO can access employee routes
  }
  return user.role === requiredRole;
}

/**
 * Check if user can access resource
 */
export function canAccessResource(
  user: AuthUser,
  resourceUserId?: string
): boolean {
  // CEO can access any resource
  if (user.role === 'CEO') {return true;}
  
  // Employee can only access their own resources
  return !resourceUserId || user.id === resourceUserId;
}

/**
 * Create audit log entry
 */
export async function createAuditLog({
  tableName,
  recordId,
  action,
  oldValues,
  newValues,
  userId,
  ipAddress,
  userAgent,
}: {
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    
    const logData: any = {
      table_name: tableName,
      record_id: recordId,
      action,
    };
    
    if (oldValues) logData.old_values = oldValues;
    if (newValues) logData.new_values = newValues;
    if (userId) logData.user_id = userId;
    if (ipAddress) logData.ip_address = ipAddress;
    if (userAgent) logData.user_agent = userAgent;
    
    await supabase.from('audit_logs').insert(logData);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to create audit log:', error);
    }
  }
}
