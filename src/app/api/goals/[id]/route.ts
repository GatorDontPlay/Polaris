import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { goalUpdateSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';
import { transformGoalFields } from '@/lib/case-transform';
import { createAuditLog } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Goal PUT: Starting update for goal ID:', params.id);
    
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const goalId = params.id;

    // Validate request body
    const validation = await validateRequestBody(request, goalUpdateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const goalData = validation.data;
    const supabase = await createClient();

    // Get goal with PDR and verify access
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select(`
        *,
        pdr:pdrs(*, user:profiles!pdrs_user_id_fkey(*))
      `)
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return createApiError('Goal not found', 404, 'GOAL_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && goal.pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (goal.pdr.is_locked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // For employees, only allow editing basic fields in Created/DRAFT/SUBMITTED/OPEN_FOR_REVIEW status
    if (user.role !== 'CEO' && !['Created', 'DRAFT', 'SUBMITTED', 'OPEN_FOR_REVIEW'].includes(goal.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Prepare update data based on user role
    const updateData: any = {};
    
    if (user.role === 'CEO') {
      // CEO can update any field
      if (goalData.title !== undefined) updateData.title = goalData.title;
      if (goalData.description !== undefined) updateData.description = goalData.description;
      if (goalData.targetOutcome !== undefined) updateData.target_outcome = goalData.targetOutcome;
      if (goalData.successCriteria !== undefined) updateData.success_criteria = goalData.successCriteria;
      if (goalData.priority !== undefined) updateData.priority = goalData.priority;
      if (goalData.weighting !== undefined) updateData.weighting = goalData.weighting;
      if (goalData.goalMapping !== undefined) updateData.goal_mapping = goalData.goalMapping;
      if (goalData.employeeProgress !== undefined) updateData.employee_progress = goalData.employeeProgress;
      if (goalData.employeeRating !== undefined) updateData.employee_rating = goalData.employeeRating;
      if (goalData.ceoComments !== undefined) updateData.ceo_comments = goalData.ceoComments;
      if (goalData.ceoRating !== undefined) updateData.ceo_rating = goalData.ceoRating;
    } else {
      // Employee can only update basic fields and self-assessment
      if (goalData.title !== undefined) updateData.title = goalData.title;
      if (goalData.description !== undefined) updateData.description = goalData.description;
      if (goalData.targetOutcome !== undefined) updateData.target_outcome = goalData.targetOutcome;
      if (goalData.successCriteria !== undefined) updateData.success_criteria = goalData.successCriteria;
      if (goalData.priority !== undefined) updateData.priority = goalData.priority;
      if (goalData.weighting !== undefined) updateData.weighting = goalData.weighting;
      if (goalData.goalMapping !== undefined) updateData.goal_mapping = goalData.goalMapping;
      if (goalData.employeeProgress !== undefined) updateData.employee_progress = goalData.employeeProgress;
      if (goalData.employeeRating !== undefined) updateData.employee_rating = goalData.employeeRating;
    }

    // Update the goal
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .select()
      .single();

    if (updateError) {
      console.error('Goal PUT: Database update error:', updateError);
      throw updateError;
    }

    console.log('Goal PUT: Update successful, creating audit log...');

    // Create audit log
    try {
      await createAuditLog({
        tableName: 'goals',
        recordId: goalId,
        action: 'UPDATE',
        oldValues: goal,
        newValues: updatedGoal,
        userId: user.id,
        ipAddress: request.ip || 'Unknown',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      });
      console.log('Goal PUT: Audit log created successfully');
    } catch (auditError) {
      console.error('Goal PUT: Audit log failed:', auditError);
      // Continue anyway - audit log failure shouldn't block the update
    }

    console.log('Goal PUT: Returning success response');
    // Transform goal fields to camelCase
    const transformedGoal = transformGoalFields(updatedGoal);
    return createApiResponse(transformedGoal);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
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
    const goalId = params.id;

    const supabase = await createClient();

    // Get goal with PDR and verify access
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select(`
        *,
        pdr:pdrs(*, user:profiles!pdrs_user_id_fkey(*))
      `)
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return createApiError('Goal not found', 404, 'GOAL_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && goal.pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (goal.pdr.is_locked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing (Created, DRAFT and SUBMITTED for employees)
    if (user.role !== 'CEO' && !['Created', 'DRAFT', 'SUBMITTED'].includes(goal.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Delete the goal
    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (deleteError) {
      throw deleteError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'goals',
      recordId: goalId,
      action: 'DELETE',
      oldValues: goal,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
