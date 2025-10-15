import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/auth';
import { z } from 'zod';

// Schema for CEO mid-year approval
const ceoMidYearApprovalSchema = z.object({
  ceoFeedback: z.string().min(1, 'CEO feedback is required'),
  ceoRating: z.number().min(1).max(5).optional(),
});

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

    // Only CEOs can approve mid-year reviews
    if (user.role !== 'CEO') {
      return createApiError('Only CEOs can approve mid-year reviews', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Validate request body
    const validation = await validateRequestBody(request, ceoMidYearApprovalSchema);
    if (!validation.success) {
      return validation.response;
    }

    const approvalData = validation.data;
    const supabase = await createClient();

    // Get PDR and verify it's in the correct status
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(*),
        mid_year_review:mid_year_reviews!mid_year_reviews_pdr_id_fkey(*)
      `)
      .eq('id', pdrId)
      .single();

    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check if PDR is in the correct status for mid-year approval
    if (!['MID_YEAR_SUBMITTED', 'PLAN_LOCKED'].includes(pdr.status)) {
      return createApiError(
        `PDR status must be MID_YEAR_SUBMITTED or PLAN_LOCKED for approval. Current status: ${pdr.status}`,
        400,
        'INVALID_STATUS'
      );
    }

    // Check if mid-year review exists, create one if it doesn't (for PLAN_LOCKED direct approval)
    let midYearReview = Array.isArray(pdr.mid_year_review) 
      ? pdr.mid_year_review[0] 
      : pdr.mid_year_review;

    let updatedReview;

    if (!midYearReview) {
      // Create a new mid-year review for direct CEO approval from PLAN_LOCKED
      const { data: newReview, error: createError } = await supabase
        .from('mid_year_reviews')
        .insert({
          pdr_id: pdrId,
          progress_summary: 'Mid-year review approved directly by CEO',
          ceo_feedback: approvalData.ceoFeedback,
          ...(approvalData.ceoRating && { ceo_rating: approvalData.ceoRating }),
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      updatedReview = newReview;
    } else {
      // Update existing mid-year review with CEO feedback
      const { data: updateResult, error: reviewUpdateError } = await supabase
        .from('mid_year_reviews')
        .update({
          ceo_feedback: approvalData.ceoFeedback,
          ...(approvalData.ceoRating && { ceo_rating: approvalData.ceoRating }),
        })
        .eq('id', midYearReview.id)
        .select()
        .single();

      if (reviewUpdateError) {
        throw reviewUpdateError;
      }

      updatedReview = updateResult;
    }

    // Update PDR status to approved - this enables Final Year access
    const { data: updatedPdr, error: pdrUpdateError } = await supabase
      .from('pdrs')
      .update({
        status: 'MID_YEAR_APPROVED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdrId)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(
          id, first_name, last_name, email, role
        )
      `)
      .single();

    if (pdrUpdateError) {
      throw pdrUpdateError;
    }

    // Create audit log for mid-year approval
    await createAuditLog({
      tableName: 'mid_year_reviews',
      recordId: updatedReview.id,
      action: midYearReview ? 'UPDATE' : 'INSERT',
      oldValues: midYearReview || null,
      newValues: updatedReview,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    // Create audit log for PDR status change
    await createAuditLog({
      tableName: 'pdrs',
      recordId: pdrId,
      action: 'UPDATE',
      oldValues: { status: pdr.status },
      newValues: { status: 'MID_YEAR_APPROVED' },
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse({
      pdr: updatedPdr,
      midYearReview: updatedReview,
      message: 'Mid-year review approved successfully. Final year review is now available.',
    });

  } catch (error) {
    return handleApiError(error);
  }
}
