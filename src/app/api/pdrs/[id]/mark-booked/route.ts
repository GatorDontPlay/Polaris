import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    // Get PDR
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(
          id, first_name, last_name, email, role
        )
      `)
      .eq('id', pdrId)
      .single();

    if (pdrError || !pdr) {
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
    if (pdr.meeting_booked) {
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
    const { data: updatedPdr, error: updateError } = await supabase
      .from('pdrs')
      .update({
        status: 'PDR_Booked',
        meeting_booked: true,
        meeting_booked_at: (meetingDateTime || new Date()).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdrId)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(
          id, first_name, last_name, email, role
        ),
        period:pdr_periods!pdrs_period_id_fkey(*),
        locked_by_user:profiles!pdrs_locked_by_fkey(
          id, first_name, last_name
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    return createApiResponse(updatedPdr);
  } catch (error) {
    return handleApiError(error);
  }
}
