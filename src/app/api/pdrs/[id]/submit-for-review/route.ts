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

    // Check if user owns this PDR
    if (pdr.user_id !== user.id) {
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
          // Debug: Log the PDR data being validated
    console.log('🔧 Submit validation - PDR data:', {
      pdrId: pdr.id,
      status: pdr.status,
      goalsCount: pdr.goals?.length || 0,
      behaviorsCount: pdr.behaviors?.length || 0,
      behaviorsSample: pdr.behaviors?.map(b => ({
        id: b.id,
        description: b.description?.substring(0, 20) + '...',
        hasEmployeeSelfAssessment: !!b.employee_self_assessment,
        employeeSelfAssessmentLength: b.employee_self_assessment?.length || 0,
        hasCamelCaseField: !!b.employeeSelfAssessment,
        camelCaseFieldLength: b.employeeSelfAssessment?.length || 0
      }))
    });

    // Validate required fields
    const requirementsValidation = validateTransitionRequirements(pdr, transition);
    
    console.log('🔧 Submit validation result:', {
      isValid: requirementsValidation.isValid,
      errors: requirementsValidation.errors
    });
    
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
    const { data: updatedPdr, error: updateError } = await supabase
      .from('pdrs')
      .update({
        status: 'OPEN_FOR_REVIEW',
        submitted_at: new Date().toISOString(),
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
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // TODO: Create notification for CEO users about new PDR submission
    // This would be implemented when the notification system is added

    return createApiResponse(updatedPdr);
  } catch (error) {
    return handleApiError(error);
  }
}
