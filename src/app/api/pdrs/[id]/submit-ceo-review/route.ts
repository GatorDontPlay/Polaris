import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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
  console.log('🚀 API ROUTE HIT: submit-ceo-review called with PDR ID:', params.id);
  
  try {
    // Authenticate user
    console.log('🔐 Authenticating request...');
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('❌ Authentication failed');
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;
    console.log('✅ Authentication successful, user role:', user.role, 'PDR ID:', pdrId);

    // Only CEOs can submit reviews
    if (user.role !== 'CEO') {
      return createApiError('Only CEOs can submit reviews', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const supabase = await createClient();
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get PDR with all relations for validation using service role to bypass RLS
    const { data: pdr, error: pdrError } = await supabaseAdmin
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

    console.log('🔍 DATABASE QUERY DEBUG:', {
      pdrError,
      pdrExists: !!pdr,
      rawBehaviorsFromDB: pdr?.behaviors,
      behaviorsCount: pdr?.behaviors?.length || 0
    });

    // Let's also check if behaviors exist separately
    const { data: directBehaviors, error: behaviorError } = await supabaseAdmin
      .from('behaviors')
      .select('*')
      .eq('pdr_id', pdrId);

    console.log('🔍 DIRECT BEHAVIORS QUERY:', {
      behaviorError,
      directBehaviorsCount: directBehaviors?.length || 0,
      directBehaviors: directBehaviors
    });

    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Add debugging to see what data we have
    console.log('🔍 API DEBUG: PDR data for validation:', {
      pdrId: pdr.id,
      status: pdr.status,
      behaviorsCount: pdr.behaviors?.length || 0,
      behaviors: pdr.behaviors?.map(b => ({
        id: b.id,
        value_id: b.value_id,
        ceo_comments: b.ceo_comments,
        hasCeoComments: !!b.ceo_comments?.trim()
      })) || []
    });

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
      
      console.log('🔍 API DEBUG: Validation result:', {
        isValid: requirementsValidation.isValid,
        errors: requirementsValidation.errors,
        validationFields: transition.requirementFields
      });
      
      if (!requirementsValidation.isValid) {
        return createApiError(
          'Validation failed: ' + requirementsValidation.errors.join(', '),
          400,
          'VALIDATION_FAILED'
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

    // Transform notification data to match database schema (snake_case)
    const dbNotificationData = {
      user_id: notificationData.userId,
      pdr_id: notificationData.pdrId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
    };

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(dbNotificationData);

    if (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    return createApiResponse(updatedPdr);
  } catch (error) {
    console.error('💥 CRITICAL ERROR in submit-ceo-review API:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      pdrId: params.id
    });
    return handleApiError(error);
  }
}