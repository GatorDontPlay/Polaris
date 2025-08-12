import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  handleApiError,
  authenticateRequest 
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get all active company values
    const values = await prisma.companyValue.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return createApiResponse(values);
  } catch (error) {
    return handleApiError(error);
  }
}
