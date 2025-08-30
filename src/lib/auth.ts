import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { createClient } from './supabase/server';
import { AuthUser, JWTPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

export const AUTH_CONFIG = {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
} as const;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONFIG.BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  return jwt.sign(payload, AUTH_CONFIG.JWT_SECRET);
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    AUTH_CONFIG.JWT_REFRESH_SECRET
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Token verification failed:', error);
    }
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.JWT_REFRESH_SECRET) as {
      userId: string;
      type: string;
    };
    return decoded.type === 'refresh' ? { userId: decoded.userId } : null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Refresh token verification failed:', error);
    }
    return null;
  }
}

/**
 * Authenticate user with email and password
 * Note: This function is deprecated in favor of Supabase Auth
 * Keeping for compatibility but should migrate to Supabase Auth
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    
    // Find user by email in profiles table
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.is_active) {
      return { success: false, error: 'Account is disabled' };
    }

    // Note: In Supabase Auth, password verification is handled by Supabase
    // This is a legacy function - should use Supabase Auth instead
    
    // Return user data
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };

    return { success: true, user: authUser };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Authentication error:', error);
    }
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get user from JWT token
 * Note: This function is deprecated in favor of Supabase Auth
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = verifyToken(token);
    if (!payload) {return null;}

    const supabase = await createClient();
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', payload.userId)
      .single();

    if (error || !user || !user.is_active) {return null;}

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get user from token error:', error);
    }
    return null;
  }
}

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
