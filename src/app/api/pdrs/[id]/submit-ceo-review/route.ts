import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { 
  validateStateTransition,
  validateTransitionRequirements,
  createPDRNotification,
  STATE_TRANSITIONS
} from '@/lib/pdr-state-machine';

export async function POST(
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

    // Only CEOs can submit reviews
    if (user.role !== 'CEO') {
      return createApiError('Only CEOs can submit reviews', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get PDR with all relations for validation
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: {
        user: true,
        goals: true,
        behaviors: {
          include: {
            value: true,
          },
        },
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Validate state transition
    const transitionValidation = validateStateTransition(
      pdr.status,
      'PLAN_LOCKED',
      'submitCeoReview',
      user.role
    );

    if (!transitionValidation.isValid) {
      return createApiError(
        transitionValidation.errors[0],
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    // Find the transition definition for validation requirements
    const transition = STATE_TRANSITIONS.find(
      t => t.action === 'submitCeoReview'
    );

    if (transition) {
      // Validate required fields
      const requirementsValidation = validateTransitionRequirements(pdr, transition);
      
      if (!requirementsValidation.isValid) {
        return createApiError(
          'Validation failed: ' + requirementsValidation.errors.join(', '),
          400,
          'VALIDATION_FAILED',
          requirementsValidation.errors
        );
      }
    }

    // Update PDR status and lock it
    const updatedPdr = await prisma.pDR.update({
      where: { id: pdrId },
      data: {
        status: 'PLAN_LOCKED',
        lockedAt: new Date(),
        lockedBy: user.id,
        isLocked: true,
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
        goals: true,
        behaviors: {
          include: {
            value: true,
          },
        },
        lockedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create notification for employee
    const notificationData = createPDRNotification(
      pdrId,
      pdr.userId,
      'PDR_LOCKED',
      `${user.firstName} ${user.lastName}`
    );

    await prisma.notification.create({
      data: notificationData,
    });

    return createApiResponse(updatedPdr);
  } catch (error) {
    return handleApiError(error);
  }
}
