import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { behaviorSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/auth';
import { PDRStatus, EMPLOYEE_EDITABLE_STATUSES } from '@/types/pdr-status';
import { transformBehaviorFields } from '@/lib/case-transform';

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

    // Get behaviors for this PDR with company values
    const { data: behaviors, error: behaviorsError } = await supabase
      .from('behaviors')
      .select(`
        *,
        value:company_values(*)
      `)
      .eq('pdr_id', pdrId)
      .order('value(sort_order)', { ascending: true })
      .order('created_at', { ascending: true });

    if (behaviorsError) {
      throw behaviorsError;
    }

    // Transform behaviors to camelCase
    const transformedBehaviors = behaviors?.map(transformBehaviorFields) || [];

    return createApiResponse(transformedBehaviors);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔧 Behavior POST route called with PDR ID:', params.id);
  try {
    // Authenticate user
    console.log('🔧 Authenticating user for behavior creation...');
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('🔧 Authentication failed for behavior creation');
      return authResult.response;
    }
    console.log('🔧 User authenticated for behavior creation:', authResult.user.id);

    const { user } = authResult;
    const pdrId = params.id;

    // Validate request body
    console.log('🔧 Validating behavior request body...');
    const validation = await validateRequestBody(request, behaviorSchema);
    if (!validation.success) {
      console.log('🔧 Behavior validation failed:', validation.response);
      return validation.response;
    }

    const behaviorData = validation.data;
    console.log('🔧 Behavior data validated:', behaviorData);
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

    // Define allowed statuses for employee editing
    // For employees, check if PDR status allows editing
    if (user.role !== 'CEO' && !EMPLOYEE_EDITABLE_STATUSES.includes(pdr.status as PDRStatus)) {
      return createApiError(
        `PDR status '${pdr.status}' does not allow editing`, 
        400, 
        'INVALID_STATUS'
      );
    }

    // Verify the company value exists and is active
    const { data: companyValue, error: valueError } = await supabase
      .from('company_values')
      .select('*')
      .eq('id', behaviorData.valueId)
      .single();

    if (valueError || !companyValue || !companyValue.is_active) {
      return createApiError('Invalid or inactive company value', 400, 'INVALID_COMPANY_VALUE');
    }

    // Check if behavior already exists for this value
    const { data: existingBehavior, error: checkError } = await supabase
      .from('behaviors')
      .select(`
        *,
        value:company_values(*)
      `)
      .eq('pdr_id', pdrId)
      .eq('value_id', behaviorData.valueId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // If behavior already exists, return it instead of error (idempotent behavior)
    if (existingBehavior) {
      console.log('🔧 Behavior already exists, returning existing behavior:', existingBehavior.id);
      const transformedBehavior = transformBehaviorFields(existingBehavior);
      return createApiResponse(transformedBehavior, 200);
    }

    // Create the behavior
    const { data: behavior, error: behaviorError } = await supabase
      .from('behaviors')
      .insert({
        pdr_id: pdrId,
        value_id: behaviorData.valueId,
        description: behaviorData.description,
        examples: behaviorData.examples || null,
      })
      .select(`
        *,
        value:company_values(*)
      `)
      .single();

    if (behaviorError) {
      throw behaviorError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'behaviors',
      recordId: behavior.id,
      action: 'INSERT',
      newValues: behavior,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    // Transform behavior to camelCase
    const transformedBehavior = transformBehaviorFields(behavior);

    return createApiResponse(transformedBehavior, 201);
  } catch (error) {
    console.error('🔧 Behavior POST route error:', error);
    return handleApiError(error);
  }
}
