import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { behaviorUpdateSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/auth';
import { PDRStatus, EMPLOYEE_EDITABLE_STATUSES } from '@/types/pdr-status';
import { transformBehaviorFields } from '@/lib/case-transform';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔧 Behavior PATCH route called with ID:', params.id);
  try {
    // Authenticate user
    console.log('🔧 Authenticating user for behavior update...');
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('🔧 Authentication failed for behavior update');
      return authResult.response;
    }
    console.log('🔧 User authenticated for behavior update:', authResult.user.id);

    const { user } = authResult;
    const behaviorId = params.id;

    // Validate request body
    console.log('🔧 Validating behavior update request body...');
    
    // First, let's see what the raw request body looks like
    const rawBody = await request.text();
    console.log('🔧 Raw request body:', rawBody);
    
    // Parse it manually to see the structure
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      console.log('🔧 Parsed request body:', parsedBody);
      console.log('🔧 Request body keys:', Object.keys(parsedBody));
    } catch (parseError) {
      console.error('🔧 Failed to parse request body:', parseError);
      return createApiError('Invalid JSON in request body', 400, 'INVALID_JSON');
    }
    
    // Now validate with schema
    const validation = behaviorUpdateSchema.safeParse(parsedBody);
    if (!validation.success) {
      console.log('🔧 Behavior update validation failed:', validation.error.errors);
      return createApiError(`Validation failed: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const behaviorData = validation.data;
    console.log('🔧 Behavior update data validated:', behaviorData);
    const supabase = await createClient();

    // Get behavior with PDR and verify access
    const { data: behavior, error: behaviorError } = await supabase
      .from('behaviors')
      .select(`
        *,
        pdr:pdrs!behaviors_pdr_id_fkey(
          *,
          user:profiles!pdrs_user_id_fkey(*)
        ),
        value:company_values(*)
      `)
      .eq('id', behaviorId)
      .single();

    if (behaviorError || !behavior) {
      return createApiError('Behavior not found', 404, 'BEHAVIOR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && behavior.pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (behavior.pdr.is_locked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Define allowed statuses for employee editing
    // For employees, check if PDR status allows editing
    if (user.role !== 'CEO' && !EMPLOYEE_EDITABLE_STATUSES.includes(behavior.pdr.status as PDRStatus)) {
      return createApiError(
        `PDR status '${behavior.pdr.status}' does not allow editing`, 
        400, 
        'INVALID_STATUS'
      );
    }

    // If valueId is being changed, verify the new company value
    if (behaviorData.valueId && behaviorData.valueId !== behavior.value_id) {
      const { data: companyValue, error: valueError } = await supabase
        .from('company_values')
        .select('*')
        .eq('id', behaviorData.valueId)
        .single();

      if (valueError || !companyValue || !companyValue.is_active) {
        return createApiError('Invalid or inactive company value', 400, 'INVALID_COMPANY_VALUE');
      }

      // Check if behavior already exists for this value in the same PDR
      const { data: existingBehavior, error: checkError } = await supabase
        .from('behaviors')
        .select('id')
        .eq('pdr_id', behavior.pdr_id)
        .eq('value_id', behaviorData.valueId)
        .neq('id', behaviorId) // Exclude current behavior
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingBehavior) {
        return createApiError('Behavior already exists for this company value', 400, 'BEHAVIOR_EXISTS');
      }
    }

    // Prepare update data based on user role (using snake_case for Supabase)
    const updateData: any = {};
    
    if (user.role === 'CEO') {
      // CEO can update any field
      if (behaviorData.valueId !== undefined) {updateData.value_id = behaviorData.valueId;}
      if (behaviorData.description !== undefined) {updateData.description = behaviorData.description;}
      if (behaviorData.examples !== undefined) {updateData.examples = behaviorData.examples;}
      if (behaviorData.employeeSelfAssessment !== undefined) {updateData.employee_self_assessment = behaviorData.employeeSelfAssessment;}
      if (behaviorData.employeeRating !== undefined) {updateData.employee_rating = behaviorData.employeeRating;}
      if (behaviorData.ceoComments !== undefined) {updateData.ceo_comments = behaviorData.ceoComments;}
      if (behaviorData.ceoRating !== undefined) {updateData.ceo_rating = behaviorData.ceoRating;}
    } else {
      // Employee can only update basic fields and self-assessment
      if (behaviorData.valueId !== undefined) {updateData.value_id = behaviorData.valueId;}
      if (behaviorData.description !== undefined) {updateData.description = behaviorData.description;}
      if (behaviorData.examples !== undefined) {updateData.examples = behaviorData.examples;}
      if (behaviorData.employeeSelfAssessment !== undefined) {updateData.employee_self_assessment = behaviorData.employeeSelfAssessment;}
      if (behaviorData.employeeRating !== undefined) {updateData.employee_rating = behaviorData.employeeRating;}
    }

    // Update the behavior
    const { data: updatedBehavior, error: updateError } = await supabase
      .from('behaviors')
      .update(updateData)
      .eq('id', behaviorId)
      .select(`
        *,
        value:company_values(*)
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'behaviors',
      recordId: behaviorId,
      action: 'UPDATE',
      oldValues: behavior,
      newValues: updatedBehavior,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    // Transform behavior to camelCase
    const transformedBehavior = transformBehaviorFields(updatedBehavior);

    return createApiResponse(transformedBehavior);
  } catch (error) {
    console.error('🔧 Behavior PATCH route error:', error);
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
    const behaviorId = params.id;

    const supabase = await createClient();

    // Get behavior with PDR and verify access
    const { data: behavior, error: behaviorError } = await supabase
      .from('behaviors')
      .select(`
        *,
        pdr:pdrs!behaviors_pdr_id_fkey(
          *,
          user:profiles!pdrs_user_id_fkey(*)
        ),
        value:company_values(*)
      `)
      .eq('id', behaviorId)
      .single();

    if (behaviorError || !behavior) {
      return createApiError('Behavior not found', 404, 'BEHAVIOR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && behavior.pdr.user_id !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (behavior.pdr.is_locked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Define allowed statuses for employee editing
    // For employees, check if PDR status allows editing
    if (user.role !== 'CEO' && !EMPLOYEE_EDITABLE_STATUSES.includes(behavior.pdr.status as PDRStatus)) {
      return createApiError(
        `PDR status '${behavior.pdr.status}' does not allow editing`, 
        400, 
        'INVALID_STATUS'
      );
    }

    // Delete the behavior
    const { error: deleteError } = await supabase
      .from('behaviors')
      .delete()
      .eq('id', behaviorId);

    if (deleteError) {
      throw deleteError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'behaviors',
      recordId: behaviorId,
      action: 'DELETE',
      oldValues: behavior,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
