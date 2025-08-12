import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  handleApiError,
  authenticateRequest 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;

    return createApiResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
