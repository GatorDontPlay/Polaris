import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pdrId = params.id;
    
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const user = authResult.user;

    // Get PDR to verify access
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: { user: true },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Get company values and behavior entries from database
    const companyValues = await prisma.companyValue.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const behaviorEntries = await prisma.behavior.findMany({
      where: { pdrId },
      include: { value: true },
    });

    // Organize behaviors by company value
    const organizedBehaviors = companyValues.map(value => {
      const behaviors = behaviorEntries.filter(entry => entry.valueId === value.id);
      
      return {
        companyValue: value,
        behaviors: behaviors.map(behavior => ({
          id: behavior.id,
          description: behavior.description,
          examples: behavior.examples,
          employeeRating: behavior.employeeRating,
          ceoRating: behavior.ceoRating,
          employeeNotes: behavior.employeeNotes,
          ceoNotes: behavior.ceoNotes,
          createdAt: behavior.createdAt,
          updatedAt: behavior.updatedAt,
        })),
      };
    });

    return createApiResponse(organizedBehaviors);
  } catch (error) {
    return handleApiError(error);
  }
}
