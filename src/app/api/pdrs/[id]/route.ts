import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest,
  authorizeResourceAccess,
  validateRequestBody 
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { pdrUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;

    // Get PDR with full details
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        period: true,
        goals: {
          orderBy: { createdAt: 'asc' },
        },
        behaviors: {
          include: {
            value: true,
          },
          orderBy: { value: { sortOrder: 'asc' } },
        },
        midYearReview: true,
        endYearReview: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check authorization
    const authCheck = authorizeResourceAccess(user, pdr.userId);
    if (!authCheck.success) {
      return authCheck.response;
    }

    return createApiResponse(pdr);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;

    // Get existing PDR
    const existingPDR = await prisma.pDR.findUnique({
      where: { id: pdrId },
    });

    if (!existingPDR) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check authorization - employees can only edit their own unlocked PDRs
    if (user.role === 'EMPLOYEE') {
      if (existingPDR.userId !== user.id) {
        return createApiError('Access denied', 403, 'FORBIDDEN');
      }
      if (existingPDR.isLocked) {
        return createApiError('PDR is locked and cannot be edited', 400, 'PDR_LOCKED');
      }
    }

    // Validate request body
    const validation = await validateRequestBody(request, pdrUpdateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const updateData = validation.data;

    // Update PDR
    const updatedPDR = await prisma.pDR.update({
      where: { id: pdrId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        period: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'pdrs',
      recordId: pdrId,
      action: 'UPDATE',
      oldValues: existingPDR as Record<string, unknown>,
      newValues: updatedPDR as Record<string, unknown>,
      userId: user.id,
    });

    return createApiResponse(updatedPDR);
  } catch (error) {
    return handleApiError(error);
  }
}
