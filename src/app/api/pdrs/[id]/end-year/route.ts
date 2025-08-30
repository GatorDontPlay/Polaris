import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { endYearReviewSchema } from '@/lib/validations';
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
        end_year_review:end_year_reviews!end_year_reviews_pdr_id_fkey(*)
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

    return createApiResponse(pdr.end_year_review);
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
    const validation = await validateRequestBody(request, endYearReviewSchema);
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
        end_year_review:end_year_reviews!end_year_reviews_pdr_id_fkey(*)
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

    // Check if end-year review already exists
    if (pdr.end_year_review && pdr.end_year_review.length > 0) {
      return createApiError('End-year review already exists', 400, 'REVIEW_EXISTS');
    }

    // Check if PDR is in the right status
    if (!['MID_YEAR_CHECK', 'END_YEAR_REVIEW'].includes(pdr.status)) {
      return createApiError('PDR status does not allow end-year review', 400, 'INVALID_STATUS');
    }

    // Create the end-year review
    const { data: endYearReview, error: reviewError } = await supabase
      .from('end_year_reviews')
      .insert({
        pdr_id: pdrId,
        achievements_summary: reviewData.achievementsSummary,
        learnings_growth: reviewData.learningsGrowth || null,
        challenges_faced: reviewData.challengesFaced || null,
        next_year_goals: reviewData.nextYearGoals || null,
        employee_overall_rating: reviewData.employeeOverallRating || null,
      })
      .select()
      .single();

    if (reviewError) {
      throw reviewError;
    }

    // Update PDR status to completed
    const { error: updateError } = await supabase
      .from('pdrs')
      .update({
        status: 'COMPLETED',
      })
      .eq('id', pdrId);

    if (updateError) {
      throw updateError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'end_year_reviews',
      recordId: endYearReview.id,
      action: 'INSERT',
      newValues: endYearReview,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(endYearReview, 201);
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
    const validation = await validateRequestBody(request, endYearReviewSchema);
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
        end_year_review:end_year_reviews!end_year_reviews_pdr_id_fkey(*)
      `)
      .eq('id', pdrId)
      .single();

    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    if (!pdr.end_year_review || pdr.end_year_review.length === 0) {
      return createApiError('End-year review not found', 404, 'REVIEW_NOT_FOUND');
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
      if (reviewData.achievementsSummary !== undefined) {updateData.achievements_summary = reviewData.achievementsSummary;}
      if (reviewData.learningsGrowth !== undefined) {updateData.learnings_growth = reviewData.learningsGrowth;}
      if (reviewData.challengesFaced !== undefined) {updateData.challenges_faced = reviewData.challengesFaced;}
      if (reviewData.nextYearGoals !== undefined) {updateData.next_year_goals = reviewData.nextYearGoals;}
      if (reviewData.employeeOverallRating !== undefined) {updateData.employee_overall_rating = reviewData.employeeOverallRating;}
      if (reviewData.ceoOverallRating !== undefined) {updateData.ceo_overall_rating = reviewData.ceoOverallRating;}
      if (reviewData.ceoFinalComments !== undefined) {updateData.ceo_final_comments = reviewData.ceoFinalComments;}
    } else {
      // Employee can only update their own fields (if not completed)
      if (pdr.status !== 'COMPLETED') {
        if (reviewData.achievementsSummary !== undefined) {updateData.achievements_summary = reviewData.achievementsSummary;}
        if (reviewData.learningsGrowth !== undefined) {updateData.learnings_growth = reviewData.learningsGrowth;}
        if (reviewData.challengesFaced !== undefined) {updateData.challenges_faced = reviewData.challengesFaced;}
        if (reviewData.nextYearGoals !== undefined) {updateData.next_year_goals = reviewData.nextYearGoals;}
        if (reviewData.employeeOverallRating !== undefined) {updateData.employee_overall_rating = reviewData.employeeOverallRating;}
      }
    }

    // Update the end-year review
    const { data: updatedReview, error: updateError } = await supabase
      .from('end_year_reviews')
      .update(updateData)
      .eq('id', pdr.end_year_review[0].id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'end_year_reviews',
      recordId: pdr.end_year_review[0].id,
      action: 'UPDATE',
      oldValues: pdr.end_year_review[0],
      newValues: updatedReview,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(updatedReview);
  } catch (error) {
    return handleApiError(error);
  }
}
