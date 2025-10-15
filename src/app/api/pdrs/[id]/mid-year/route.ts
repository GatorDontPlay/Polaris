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

    // Extract mid-year review from PDR (handle array or single object)
    const midYearReview = Array.isArray(pdr.mid_year_review) 
      ? pdr.mid_year_review[0] 
      : pdr.mid_year_review;

    if (!midYearReview) {
      return createApiError('Mid-year review not found', 404, 'REVIEW_NOT_FOUND');
    }

    return createApiResponse(midYearReview);
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
    
    // Create service role client to bypass RLS for status updates
    // This is necessary because the PDR is locked after CEO approval, 
    // but we still need to update its status when employee submits mid-year review
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get PDR with minimal fields for permission check
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select(`
        id,
        user_id,
        status,
        user:profiles!pdrs_user_id_fkey(id, role)
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

    // Check if mid-year review already exists
    const { data: existingReview } = await supabase
      .from('mid_year_reviews')
      .select('id')
      .eq('pdr_id', pdrId)
      .maybeSingle();
    
    if (existingReview) {
      return createApiError('Mid-year review already exists', 400, 'REVIEW_EXISTS');
    }

    // Check if PDR is in the right status
    // Mid-year review should only be allowed after CEO has approved the plan
    if (!['PLAN_LOCKED', 'MID_YEAR_APPROVED'].includes(pdr.status)) {
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

    // Update PDR status to indicate mid-year review is submitted for CEO review
    // Use service role client to bypass RLS since PDR is locked
    console.log('🔧 Mid-Year API: Attempting to update PDR status to MID_YEAR_SUBMITTED for PDR:', pdrId);
    
    const { data: updatedPdr, error: updateError } = await supabaseAdmin
      .from('pdrs')
      .update({
        status: 'MID_YEAR_SUBMITTED',
        current_step: 5, // Move to end-year step
      })
      .eq('id', pdrId)
      .select('id, status, current_step');

    console.log('🔧 Mid-Year API: PDR update result:', { 
      updatedPdr, 
      updateError,
      targetStatus: 'MID_YEAR_SUBMITTED'
    });

    if (updateError) {
      console.error('🚨 Mid-Year API: PDR update failed:', updateError);
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
    
    // Create service role client to bypass RLS for status updates
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get PDR with minimal fields for permission check
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select(`
        id,
        user_id,
        status,
        user:profiles!pdrs_user_id_fkey(id, role)
      `)
      .eq('id', pdrId)
      .single();

    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Get mid-year review directly
    const { data: midYearReview, error: reviewError } = await supabase
      .from('mid_year_reviews')
      .select('*')
      .eq('pdr_id', pdrId)
      .single();
    
    if (reviewError || !midYearReview) {
      return createApiError('Mid-year review not found', 404, 'REVIEW_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is in an editable status
    if (!['PLAN_LOCKED', 'MID_YEAR_SUBMITTED', 'MID_YEAR_APPROVED'].includes(pdr.status)) {
      return createApiError('PDR status does not allow mid-year review edits', 400, 'INVALID_STATUS');
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
    const midYearReviewId = midYearReview.id;
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

    // If employee is updating and PDR status is still PLAN_LOCKED, 
    // update it to MID_YEAR_SUBMITTED (handles case where initial POST failed to update status)
    if (user.role !== 'CEO' && pdr.status === 'PLAN_LOCKED') {
      console.log('🔧 Mid-Year API (PUT): Updating PDR status from PLAN_LOCKED to MID_YEAR_SUBMITTED');
      
      const { error: statusUpdateError } = await supabaseAdmin
        .from('pdrs')
        .update({
          status: 'MID_YEAR_SUBMITTED',
          current_step: 5,
        })
        .eq('id', pdrId);

      if (statusUpdateError) {
        console.error('🚨 Mid-Year API (PUT): PDR status update failed:', statusUpdateError);
        // Don't throw error - the review update was successful
      } else {
        console.log('✅ Mid-Year API (PUT): PDR status updated successfully');
      }
    }

    // Create audit log
    if (midYearReview) {
      await createAuditLog({
        tableName: 'mid_year_reviews',
        recordId: midYearReviewId,
        action: 'UPDATE',
        oldValues: midYearReview,
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
