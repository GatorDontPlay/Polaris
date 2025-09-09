import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { midYearReviewSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/auth';

export async function GET(
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

    const supabase = await createClient();

    // Get PDR and verify access
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

    // Check access permissions
    if (user.role !== 'CEO' && pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    return createApiResponse(pdr.mid_year_review);
  } catch (error) {
    return handleApiError(error);
  }
}

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

    // Validate request body
    const validation = await validateRequestBody(request, midYearReviewSchema);
    if (!validation.success) {
      return validation.response;
    }

    const reviewData = validation.data;

    const supabase = await createClient();

    // Get PDR and verify access
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

    // Check access permissions
    if (user.role !== 'CEO' && pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (pdr.is_locked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if mid-year review already exists
    if (pdr.mid_year_review && Array.isArray(pdr.mid_year_review) && pdr.mid_year_review.length > 0) {
      return createApiError('Mid-year review already exists', 400, 'REVIEW_EXISTS');
    }

    // Check if PDR is in the right status
    // Mid-year review should only be allowed after CEO has approved and locked the plan
    if (!['PLAN_LOCKED', 'PDR_BOOKED', 'MID_YEAR_CHECK'].includes(pdr.status)) {
      return createApiError('PDR status does not allow mid-year review', 400, 'INVALID_STATUS');
    }

    // Create the mid-year review
    const { data: midYearReview, error: reviewError } = await supabase
      .from('mid_year_reviews')
      .insert({
        pdr_id: pdrId,
        progress_summary: reviewData.progressSummary,
        blockers_challenges: reviewData.blockersChallenges || null,
        support_needed: reviewData.supportNeeded || null,
        employee_comments: reviewData.employeeComments || null,
      })
      .select()
      .single();

    if (reviewError) {
      throw reviewError;
    }

    // Update PDR status to indicate mid-year review is completed
    const { error: updateError } = await supabase
      .from('pdrs')
      .update({
        status: 'MID_YEAR_CHECK',
        current_step: 5, // Move to end-year step
      })
      .eq('id', pdrId);

    if (updateError) {
      throw updateError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'mid_year_reviews',
      recordId: midYearReview.id,
      action: 'INSERT',
      newValues: midYearReview,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(midYearReview, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
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

    // Validate request body
    const validation = await validateRequestBody(request, midYearReviewSchema);
    if (!validation.success) {
      return validation.response;
    }

    const reviewData = validation.data;

    const supabase = await createClient();

    // Get PDR and verify access
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

    if (!pdr.mid_year_review || !Array.isArray(pdr.mid_year_review) || pdr.mid_year_review.length === 0) {
      return createApiError('Mid-year review not found', 404, 'REVIEW_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (pdr.is_locked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Prepare update data based on user role
    const updateData: any = {};
    
    if (user.role === 'CEO') {
      // CEO can update any field
      if (reviewData.progressSummary !== undefined) {updateData.progress_summary = reviewData.progressSummary;}
      if (reviewData.blockersChallenges !== undefined) {updateData.blockers_challenges = reviewData.blockersChallenges;}
      if (reviewData.supportNeeded !== undefined) {updateData.support_needed = reviewData.supportNeeded;}
      if (reviewData.employeeComments !== undefined) {updateData.employee_comments = reviewData.employeeComments;}
      if (reviewData.ceoFeedback !== undefined) {updateData.ceo_feedback = reviewData.ceoFeedback;}
    } else {
      // Employee can only update their own fields
      if (reviewData.progressSummary !== undefined) {updateData.progress_summary = reviewData.progressSummary;}
      if (reviewData.blockersChallenges !== undefined) {updateData.blockers_challenges = reviewData.blockersChallenges;}
      if (reviewData.supportNeeded !== undefined) {updateData.support_needed = reviewData.supportNeeded;}
      if (reviewData.employeeComments !== undefined) {updateData.employee_comments = reviewData.employeeComments;}
    }

    // Update the mid-year review
    const midYearReviewId = Array.isArray(pdr.mid_year_review) ? pdr.mid_year_review[0]?.id : null;
    if (!midYearReviewId) {
      return createApiError('Mid-year review ID not found', 400, 'INVALID_DATA');
    }

    const { data: updatedReview, error: updateError } = await supabase
      .from('mid_year_reviews')
      .update(updateData)
      .eq('id', midYearReviewId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit log
    const oldMidYearReview = Array.isArray(pdr.mid_year_review) ? pdr.mid_year_review[0] : null;
    if (oldMidYearReview) {
      await createAuditLog({
        tableName: 'mid_year_reviews',
        recordId: midYearReviewId,
        action: 'UPDATE',
        oldValues: oldMidYearReview,
        newValues: updatedReview,
        userId: user.id,
        ipAddress: request.ip || 'Unknown',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      });
    }

    return createApiResponse(updatedReview);
  } catch (error) {
    return handleApiError(error);
  }
}
