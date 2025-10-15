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

// Schema for CEO final review completion
const ceoFinalReviewSchema = z.object({
  ceoOverallRating: z.number().min(1).max(5),
  ceoFinalComments: z.string().min(1, 'Final comments are required'),
  behaviorReviews: z.record(z.object({
    rating: z.number().min(1).max(5),
    comments: z.string().optional(),
  })).optional(), // Optional for backwards compatibility
  goalReviews: z.record(z.object({
    rating: z.number().min(1).max(5),
    comments: z.string().optional(),
  })).optional(), // Optional for backwards compatibility
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

    // Only CEOs can complete final reviews
    if (user.role !== 'CEO') {
      return createApiError('Only CEOs can complete final reviews', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Validate request body
    const validation = await validateRequestBody(request, ceoFinalReviewSchema);
    if (!validation.success) {
      return validation.response;
    }

    const finalReviewData = validation.data;
    const supabase = await createClient();

    // Get PDR and verify it's in the correct status
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(*),
        end_year_review:end_year_reviews!end_year_reviews_pdr_id_fkey(*)
      `)
      .eq('id', pdrId)
      .single();

    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check if PDR is in the correct status for final review completion
    if (pdr.status !== 'END_YEAR_SUBMITTED') {
      return createApiError(
        `PDR status must be END_YEAR_SUBMITTED for completion. Current status: ${pdr.status}`,
        400,
        'INVALID_STATUS'
      );
    }

    // Check if end-year review exists
    const endYearReview = Array.isArray(pdr.end_year_review) 
      ? pdr.end_year_review[0] 
      : pdr.end_year_review;

    if (!endYearReview) {
      return createApiError('End-year review not found', 404, 'REVIEW_NOT_FOUND');
    }

    // Save individual behavior reviews if provided
    if (finalReviewData.behaviorReviews) {
      console.log('💾 Saving behavior reviews:', Object.keys(finalReviewData.behaviorReviews).length);
      
      for (const [behaviorId, review] of Object.entries(finalReviewData.behaviorReviews)) {
        try {
          const { error: behaviorUpdateError } = await supabase
            .from('behaviors')
            .update({
              ceo_rating: review.rating,
              ceo_comments: review.comments || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', behaviorId)
            .eq('pdr_id', pdrId); // Extra safety check

          if (behaviorUpdateError) {
            console.error(`Failed to update behavior ${behaviorId}:`, behaviorUpdateError);
            // Continue with other behaviors even if one fails
          } else {
            console.log(`✅ Updated behavior ${behaviorId} with rating ${review.rating}`);
          }
        } catch (error) {
          console.error(`Error updating behavior ${behaviorId}:`, error);
          // Continue with other behaviors
        }
      }
    }

    // Save individual goal reviews if provided
    if (finalReviewData.goalReviews) {
      console.log('💾 Saving goal reviews:', Object.keys(finalReviewData.goalReviews).length);
      
      for (const [goalId, review] of Object.entries(finalReviewData.goalReviews)) {
        try {
          const { error: goalUpdateError } = await supabase
            .from('goals')
            .update({
              ceo_rating: review.rating,
              ceo_comments: review.comments || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', goalId)
            .eq('pdr_id', pdrId); // Extra safety check

          if (goalUpdateError) {
            console.error(`Failed to update goal ${goalId}:`, goalUpdateError);
            // Continue with other goals even if one fails
          } else {
            console.log(`✅ Updated goal ${goalId} with rating ${review.rating}`);
          }
        } catch (error) {
          console.error(`Error updating goal ${goalId}:`, error);
          // Continue with other goals
        }
      }
    }

    // Update end-year review with CEO final feedback
    const { data: updatedReview, error: reviewUpdateError } = await supabase
      .from('end_year_reviews')
      .update({
        ceo_overall_rating: finalReviewData.ceoOverallRating,
        ceo_final_comments: finalReviewData.ceoFinalComments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', endYearReview.id)
      .select()
      .single();

    if (reviewUpdateError) {
      throw reviewUpdateError;
    }

    // Update PDR status to completed - this locks the entire PDR
    const { data: updatedPdr, error: pdrUpdateError } = await supabase
      .from('pdrs')
      .update({
        status: 'COMPLETED',
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdrId)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(
          id, first_name, last_name, email, role
        ),
        locked_by_user:profiles!pdrs_locked_by_fkey(
          id, first_name, last_name
        )
      `)
      .single();

    if (pdrUpdateError) {
      throw pdrUpdateError;
    }

    // Create audit log for final review completion
    await createAuditLog({
      tableName: 'end_year_reviews',
      recordId: endYearReview.id,
      action: 'UPDATE',
      oldValues: endYearReview,
      newValues: updatedReview,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    // Create audit log for PDR completion
    await createAuditLog({
      tableName: 'pdrs',
      recordId: pdrId,
      action: 'UPDATE',
      oldValues: { status: 'END_YEAR_SUBMITTED', is_locked: false },
      newValues: { status: 'COMPLETED', is_locked: true },
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse({
      pdr: updatedPdr,
      endYearReview: updatedReview,
      message: 'Final review completed successfully. PDR is now locked and completed.',
    });

  } catch (error) {
    return handleApiError(error);
  }
}
