import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { 
  getPDRPermissions, 
  validateStateTransition,
  validateTransitionRequirements,
  createPDRNotification 
} from '@/lib/pdr-state-machine';

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

    // Get PDR with all relations
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
        lockedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        goals: {
          include: {
            pdr: false, // Avoid circular reference
          },
        },
        behaviors: {
          include: {
            value: true,
            pdr: false, // Avoid circular reference
          },
        },
        midYearReview: true,
        endYearReview: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check permissions
    const isOwner = pdr.userId === user.id;
    const permissions = getPDRPermissions(pdr.status, user.role, isOwner);

    if (!permissions.canView) {
      return createApiError('Insufficient permissions to view this PDR', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Filter fields based on permissions
    const filteredPdr = {
      ...pdr,
      employeeFields: permissions.canViewEmployeeFields ? pdr.employeeFields : undefined,
      ceoFields: permissions.canViewCeoFields ? pdr.ceoFields : undefined,
      goals: permissions.canViewEmployeeFields ? pdr.goals : [],
      behaviors: permissions.canViewEmployeeFields ? pdr.behaviors : [],
    };

    return createApiResponse(filteredPdr);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
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
    const body = await request.json();

    // Get current PDR
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: {
        user: true,
        goals: true,
        behaviors: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check permissions
    const isOwner = pdr.userId === user.id;
    const permissions = getPDRPermissions(pdr.status, user.role, isOwner);

    if (!permissions.canEdit) {
      const reason = permissions.readOnlyReason || 'PDR is not editable in current state';
      return createApiError(reason, 403, 'PDR_READ_ONLY');
    }

    // Prepare update data based on user role and permissions
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Handle employee field updates
    if (permissions.canEditEmployeeFields && body.employeeFields) {
      updateData.employeeFields = body.employeeFields;
    }

    // Handle CEO field updates
    if (permissions.canEditCeoFields && body.ceoFields) {
      updateData.ceoFields = body.ceoFields;
    }

    // Handle step progression
    if (body.currentStep && typeof body.currentStep === 'number') {
      updateData.currentStep = body.currentStep;
    }

    // Update PDR
    const updatedPdr = await prisma.pDR.update({
      where: { id: pdrId },
      data: updateData,
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
        goals: true,
        behaviors: {
          include: {
            value: true,
          },
        },
        midYearReview: true,
        endYearReview: true,
      },
    });

    return createApiResponse(updatedPdr);
  } catch (error) {
    return handleApiError(error);
  }
}