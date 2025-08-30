import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    // Get PDR with all relations for validation
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(*),
        goals(*),
        behaviors(
          *,
          value:company_values!behaviors_value_id_fkey(*)
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
    const { data: updatedPdr, error: updateError } = await supabase
      .from('pdrs')
      .update({
        status: 'PLAN_LOCKED',
        locked_at: new Date().toISOString(),
        locked_by: user.id,
        is_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdrId)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(
          id, first_name, last_name, email, role
        ),
        period:pdr_periods!pdrs_period_id_fkey(*),
        goals(*),
        behaviors(
          *,
          value:company_values!behaviors_value_id_fkey(*)
        ),
        locked_by_user:profiles!pdrs_locked_by_fkey(
          id, first_name, last_name
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create notification for employee
    const notificationData = createPDRNotification(
      pdrId,
      pdr.user_id,
      'PDR_LOCKED',
      `${user.firstName} ${user.lastName}`
    );

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notificationData);

    if (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    return createApiResponse(updatedPdr);
  } catch (error) {
    return handleApiError(error);
  }
}
