import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  handleApiError,
  getClientIp,
  getUserAgent,
  authenticateRequest 
} from '@/lib/api-helpers';
import { createAuditLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get user for audit logging (optional, logout should work even if token is invalid)
    let userId: string | undefined;
    try {
      const authResult = await authenticateRequest(request);
      if (authResult.success) {
        userId = authResult.user.id;
      }
    } catch {
      // Ignore authentication errors during logout
    }

    // Create audit log for logout
    if (userId) {
      await createAuditLog({
        tableName: 'users',
        recordId: userId,
        action: 'UPDATE',
        newValues: { logout: 'success' },
        userId,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });
    }

    // Create response and clear cookies
    const response = createApiResponse({ message: 'Logged out successfully' });

    // Clear authentication cookies
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
