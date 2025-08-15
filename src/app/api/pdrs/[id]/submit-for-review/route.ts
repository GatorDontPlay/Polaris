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

    // Only employees can submit PDRs for review
    if (user.role !== 'EMPLOYEE') {
      return createApiError('Only employees can submit PDRs for review', 403, 'INSUFFICIENT_PERMISSIONS');
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

    // Check if user owns this PDR
    if (pdr.userId !== user.id) {
      return createApiError('You can only submit your own PDR', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Validate state transition
    const transitionValidation = validateStateTransition(
      pdr.status,
      'OPEN_FOR_REVIEW',
      'submitForReview',
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
      t => t.action === 'submitForReview'
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

    // Update PDR status
    const updatedPdr = await prisma.pDR.update({
      where: { id: pdrId },
      data: {
        status: 'OPEN_FOR_REVIEW',
        submittedAt: new Date(),
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
      },
    });

    // TODO: Create notification for CEO users about new PDR submission
    // This would be implemented when the notification system is added

    return createApiResponse(updatedPdr);
  } catch (error) {
    return handleApiError(error);
  }
}
