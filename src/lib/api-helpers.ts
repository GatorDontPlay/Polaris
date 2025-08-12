import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { getUserFromRequest } from './auth';
import { AuthUser, ApiResponse } from '@/types';

/**
 * Create API response with consistent format
 */
export function createApiResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create API error response
 */
export function createApiError(
  error: string,
  status: number = 400,
  code?: string,
  details?: Array<{ field: string; message: string }>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
      code: code || 'API_ERROR',
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: ZodError): NextResponse<ApiResponse<never>> {
  const details = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return createApiError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    details
  );
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, response: handleValidationError(error) };
    }
    return {
      success: false,
      response: createApiError('Invalid request body', 400),
    };
  }
}

/**
 * Authenticate user from request
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ success: true; user: AuthUser } | { success: false; response: NextResponse }> {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return {
        success: false,
        response: createApiError('Authentication required', 401, 'UNAUTHORIZED'),
      };
    }
    return { success: true, user };
  } catch {
    return {
      success: false,
      response: createApiError('Authentication failed', 401, 'UNAUTHORIZED'),
    };
  }
}

/**
 * Check user role authorization
 */
export function authorizeRole(
  user: AuthUser,
  requiredRole: 'EMPLOYEE' | 'CEO'
): { success: true } | { success: false; response: NextResponse } {
  if (requiredRole === 'EMPLOYEE') {
    // Both EMPLOYEE and CEO can access employee routes
    return { success: true };
  }
  
  if (user.role !== requiredRole) {
    return {
      success: false,
      response: createApiError('Insufficient permissions', 403, 'FORBIDDEN'),
    };
  }
  
  return { success: true };
}

/**
 * Check resource access authorization
 */
export function authorizeResourceAccess(
  user: AuthUser,
  resourceUserId?: string
): { success: true } | { success: false; response: NextResponse } {
  // CEO can access any resource
  if (user.role === 'CEO') {
    return { success: true };
  }
  
  // Employee can only access their own resources
  if (resourceUserId && user.id !== resourceUserId) {
    return {
      success: false,
      response: createApiError('Access denied', 403, 'FORBIDDEN'),
    };
  }
  
  return { success: true };
}

/**
 * Extract pagination parameters from URL
 */
export function extractPagination(url: URL): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): ApiResponse<{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  return {
    success: true,
    data: {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }
  
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }
  
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error';
    
    return createApiError(message, 500, 'INTERNAL_ERROR');
  }
  
  return createApiError('Internal server error', 500, 'INTERNAL_ERROR');
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  return 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Rate limiting helper (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}
