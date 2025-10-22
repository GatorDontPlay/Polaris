import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createAuditLog } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for CEO behavior feedback
const ceoFeedbackSchema = z.object({
  ceoNotes: z.string().optional(),
  ceoAdjustedInitiative: z.string().optional(),
  ceoRating: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const behaviorId = params.id;
    
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const user = authResult.user;

    // Only CEO can provide feedback
    if (user.role !== 'CEO') {
      return createApiError('Only CEO can provide behavior feedback', 403, 'ACCESS_DENIED');
    }

    // Validate request body
    const validation = await validateRequestBody(request, ceoFeedbackSchema);
    if (!validation.success) {
      return validation.response;
    }

    const feedbackData = validation.data;

    // Use service role client to bypass RLS
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the behavior entry first to verify it exists
    const { data: behavior, error: fetchError } = await supabaseAdmin
      .from('behaviors')
      .select(`
        *,
        pdr:pdrs!behaviors_pdr_id_fkey(id, status, is_locked, user_id)
      `)
      .eq('id', behaviorId)
      .single();

    if (fetchError || !behavior) {
      return createApiError('Behavior entry not found', 404, 'BEHAVIOR_NOT_FOUND');
    }

    // Store old values for audit log
    const oldValues = {
      ceo_comments: behavior.ceo_comments,
      ceo_adjusted_initiative: behavior.ceo_adjusted_initiative,
      ceo_rating: behavior.ceo_rating,
    };

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (feedbackData.ceoNotes !== undefined) {
      updateData.ceo_comments = feedbackData.ceoNotes;
    }
    if (feedbackData.ceoAdjustedInitiative !== undefined) {
      updateData.ceo_adjusted_initiative = feedbackData.ceoAdjustedInitiative;
    }
    if (feedbackData.ceoRating !== undefined) {
      updateData.ceo_rating = feedbackData.ceoRating;
    }

    // Update the behavior with CEO feedback
    const { data: updatedBehavior, error: updateError } = await supabaseAdmin
      .from('behaviors')
      .update(updateData)
      .eq('id', behaviorId)
      .select(`
        *,
        value:company_values!behaviors_value_id_fkey(*),
        pdr:pdrs!behaviors_pdr_id_fkey(id, status, is_locked)
      `)
      .single();

    if (updateError) {
      console.error('Error updating behavior with CEO feedback:', updateError);
      throw updateError;
    }

    // Create audit log
    try {
      await createAuditLog({
        tableName: 'behaviors',
        recordId: behaviorId,
        action: 'UPDATE',
        oldValues,
        newValues: updateData,
        userId: user.id,
        ipAddress: request.ip || 'Unknown',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      });
    } catch (auditError) {
      console.error('Failed to create audit log for CEO feedback:', auditError);
      // Don't fail the request if audit logging fails
    }

    return createApiResponse(updatedBehavior);

  } catch (error) {
    return handleApiError(error);
  }
}
