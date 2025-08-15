import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { 
  validateStateTransition
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

    // Parse request body to get meeting date
    let meetingDate: string | undefined;
    try {
      const body = await request.json();
      meetingDate = body.meetingDate;
    } catch {
      // If no body or invalid JSON, continue without meetingDate
    }

    // Only CEOs can mark meetings as booked
    if (user.role !== 'CEO') {
      return createApiError('Only CEOs can mark meetings as booked', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get PDR
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
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Validate state transition
    const transitionValidation = validateStateTransition(
      pdr.status,
      'PDR_Booked',
      'markBooked',
      user.role
    );

    if (!transitionValidation.isValid) {
      return createApiError(
        transitionValidation.errors[0],
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    // Check if already booked (idempotent operation)
    if (pdr.meetingBooked) {
      return createApiResponse(pdr); // Return current state, no-op
    }

    // Parse meeting date if provided (Australian format dd/mm/yyyy)
    let meetingDateTime: Date | undefined;
    if (meetingDate) {
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = meetingDate.match(dateRegex);
      if (match) {
        const [, day, month, year] = match;
        meetingDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    // Update PDR to mark meeting as booked
    const updatedPdr = await prisma.pDR.update({
      where: { id: pdrId },
      data: {
        status: 'PDR_Booked',
        meetingBooked: true,
        meetingBookedAt: meetingDateTime || new Date(), // Use provided date or current date
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
        lockedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return createApiResponse(updatedPdr);
  } catch (error) {
    return handleApiError(error);
  }
}
