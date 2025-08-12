import { NextRequest } from 'next/server';
import { 
  validateRequestBody, 
  createApiResponse, 
  createApiError,
  handleApiError,
  getClientIp,
  getUserAgent,
  checkRateLimit 
} from '@/lib/api-helpers';
import { 
  authenticateUser, 
  generateAccessToken, 
  generateRefreshToken,
  createAuditLog 
} from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${clientIp}`, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
    
    if (!rateLimit.allowed) {
      return createApiError(
        'Too many login attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Validate request body
    const validation = await validateRequestBody(request, loginSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { email, password } = validation.data;

    // Authenticate user
    const authResult = await authenticateUser(email, password);
    if (!authResult.success) {
      // Create audit log for failed login
      await createAuditLog({
        tableName: 'users',
        recordId: 'unknown',
        action: 'UPDATE',
        newValues: { login_attempt: 'failed', email },
        ipAddress: clientIp,
        userAgent: getUserAgent(request),
      });

      return createApiError(authResult.error, 401, 'AUTHENTICATION_FAILED');
    }

    const { user } = authResult;

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // Create audit log for successful login
    await createAuditLog({
      tableName: 'users',
      recordId: user.id,
      action: 'UPDATE',
      newValues: { login_attempt: 'success' },
      userId: user.id,
      ipAddress: clientIp,
      userAgent: getUserAgent(request),
    });

    // Create response with tokens
    const response = createApiResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
    });

    // Set HTTP-only cookies for additional security
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
