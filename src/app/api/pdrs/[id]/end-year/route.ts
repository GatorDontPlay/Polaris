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
import { createClient as createServiceClient } from '@supabase/supabase-js';
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
    
    // Create service role client to bypass RLS for status updates
    // This is necessary because employees may not have direct permission 
    // to update PDR status even when the PDR is unlocked
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Check if end-year review already exists
    if (pdr.end_year_review && Array.isArray(pdr.end_year_review) && pdr.end_year_review.length > 0) {
      return createApiError('End-year review already exists', 400, 'REVIEW_EXISTS');
    }

    // Check if PDR is in the right status
    // End-year review can be submitted from PLAN_LOCKED (skip mid-year) or after mid-year approval
    console.log('🔧 End-Year API: PDR status check:', {
      pdrId,
      currentStatus: pdr.status,
      allowedStatuses: ['PLAN_LOCKED', 'MID_YEAR_APPROVED', 'END_YEAR_SUBMITTED'],
      isAllowed: ['PLAN_LOCKED', 'MID_YEAR_APPROVED', 'END_YEAR_SUBMITTED'].includes(pdr.status)
    });
    
    if (!['PLAN_LOCKED', 'MID_YEAR_APPROVED', 'END_YEAR_SUBMITTED'].includes(pdr.status)) {
      return createApiError(`PDR status does not allow end-year review. Current status: ${pdr.status}`, 400, 'INVALID_STATUS');
    }

    // Create the end-year review
    console.log('🔧 End-Year API: Creating end-year review...', { pdrId });
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
      console.error('🚨 End-Year API: Failed to create end-year review:', reviewError);
      throw reviewError;
    }
    console.log('✅ End-Year API: End-year review created successfully');

    // Update PDR status to submitted for final CEO review
    // Use service role client to bypass RLS policies
    console.log('🔧 End-Year API: Current PDR status:', pdr.status);
    console.log('🔧 End-Year API: Updating PDR status to END_YEAR_SUBMITTED...');
    const { data: updatedPDR, error: updateError } = await supabaseAdmin
      .from('pdrs')
      .update({
        status: 'END_YEAR_SUBMITTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdrId)
      .select()
      .single();

    if (updateError) {
      console.error('🚨 End-Year API: Failed to update PDR status:', updateError);
      console.error('🚨 End-Year API: Error details:', JSON.stringify(updateError, null, 2));
      console.error('🚨 End-Year API: Rolling back - deleting end_year_review...');
      
      // Rollback: Delete the end_year_review we just created
      await supabase.from('end_year_reviews').delete().eq('id', endYearReview.id);
      
      return createApiError(
        `Failed to update PDR status: ${updateError.message}. Please check RLS policies and try again.`,
        500,
        'STATUS_UPDATE_FAILED',
        { originalError: updateError.message, pdrId, currentStatus: pdr.status }
      );
    }

    if (!updatedPDR) {
      console.error('🚨 End-Year API: Status update returned no data');
      // Rollback
      await supabase.from('end_year_reviews').delete().eq('id', endYearReview.id);
      return createApiError('Failed to verify PDR status update', 500, 'STATUS_UPDATE_VERIFICATION_FAILED');
    }

    console.log('✅ End-Year API: PDR status updated successfully from', pdr.status, 'to', updatedPDR.status);

    // Create audit logs for both the end_year_review creation and PDR status change
    await Promise.all([
      // Log end_year_review creation
      createAuditLog({
        tableName: 'end_year_reviews',
        recordId: endYearReview.id,
        action: 'INSERT',
        newValues: endYearReview,
        userId: user.id,
        ipAddress: request.ip || 'Unknown',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      }),
      // Log PDR status change
      createAuditLog({
        tableName: 'pdrs',
        recordId: pdrId,
        action: 'UPDATE',
        oldValues: { status: pdr.status },
        newValues: { status: updatedPDR.status },
        userId: user.id,
        ipAddress: request.ip || 'Unknown',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      }),
    ]);

    return createApiResponse(endYearReview, 201);
  } catch (error) {
    console.error('🚨 End-Year API: Unhandled error in POST:', error);
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

    // Handle both array and single object cases for end_year_review
    const endYearReview = Array.isArray(pdr.end_year_review) 
      ? pdr.end_year_review[0] 
      : pdr.end_year_review;

    if (!endYearReview) {
      return createApiError('End-year review not found', 404, 'REVIEW_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is in an editable status
    if (!['PLAN_LOCKED', 'MID_YEAR_APPROVED', 'END_YEAR_SUBMITTED'].includes(pdr.status)) {
      return createApiError('PDR status does not allow end-year review edits', 400, 'INVALID_STATUS');
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
      .eq('id', endYearReview.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit log
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

    return createApiResponse(updatedReview);
  } catch (error) {
    return handleApiError(error);
  }
}
