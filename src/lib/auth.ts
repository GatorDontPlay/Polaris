import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma } from './db';
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
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is disabled' };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Return user without password hash
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
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
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = verifyToken(token);
    if (!payload) {return null;}

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {return null;}

    return user;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get user from token error:', error);
    }
    return null;
  }
}

/**
 * Get user from request headers/cookies
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Try to get token from Authorization header
    let token = request.headers.get('authorization')?.replace('Bearer ', '');

    // If not in header, try cookies
    if (!token) {
      token = request.cookies.get('access_token')?.value;
    }

    if (!token) {return null;}

    return getUserFromToken(token);
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
    const logData: Record<string, unknown> = {
      tableName,
      recordId,
      action,
    };
    
    if (oldValues) {logData.oldValues = oldValues;}
    if (newValues) {logData.newValues = newValues;}
    if (userId) {logData.changedBy = userId;}
    if (ipAddress) {logData.ipAddress = ipAddress;}
    if (userAgent) {logData.userAgent = userAgent;}
    
    await prisma.auditLog.create({ data: logData as any });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to create audit log:', error);
    }
  }
}
