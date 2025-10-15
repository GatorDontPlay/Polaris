import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { goalSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';
import { transformGoalFields } from '@/lib/case-transform';
import { createAuditLog } from '@/lib/auth';
import { PDRStatus, EMPLOYEE_EDITABLE_STATUSES } from '@/types/pdr-status';

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
        user:profiles!pdrs_user_id_fkey(*)
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

    // Get goals for this PDR
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('pdr_id', pdrId)
      .order('priority', { ascending: true }) // HIGH first, then MEDIUM, then LOW
      .order('created_at', { ascending: true });

    if (goalsError) {
      throw goalsError;
    }

    // Transform goals to camelCase for frontend
    const transformedGoals = goals?.map(transformGoalFields) || [];
    return createApiResponse(transformedGoals);
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
    const validation = await validateRequestBody(request, goalSchema);
    if (!validation.success) {
      console.error('❌ Goal validation failed:', validation.response);
      return validation.response;
    }

    const goalData = validation.data;
    console.log('✅ Goal validation passed:', goalData);
    const supabase = await createClient();

    // Get PDR and verify access
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(*)
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

    // For employees, check if PDR status allows editing
    if (user.role !== 'CEO' && !EMPLOYEE_EDITABLE_STATUSES.includes(pdr.status as PDRStatus)) {
      return createApiError(
        `PDR status '${pdr.status}' does not allow editing`, 
        400, 
        'INVALID_STATUS'
      );
    }

    // Create the goal (including targetOutcome, weighting, and goalMapping)
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        pdr_id: pdrId,
        title: goalData.title,
        description: goalData.description || null,
        target_outcome: goalData.targetOutcome || null,
        success_criteria: goalData.successCriteria || null,
        priority: goalData.priority || 'MEDIUM',
        weighting: goalData.weighting || 0,
        goal_mapping: goalData.goalMapping || null,
      })
      .select()
      .single();

    if (goalError) {
      throw goalError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'goals',
      recordId: goal.id,
      action: 'INSERT',
      newValues: goal,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    // Transform goal fields to camelCase
    const transformedGoal = transformGoalFields(goal);
    return createApiResponse(transformedGoal, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
