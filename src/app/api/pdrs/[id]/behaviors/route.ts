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

    return createApiResponse(behaviors);
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
    const validation = await validateRequestBody(request, behaviorSchema);
    if (!validation.success) {
      return validation.response;
    }

    const behaviorData = validation.data;
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

    // Check if PDR allows editing (Created, DRAFT and SUBMITTED)
    if (!['Created', 'DRAFT', 'SUBMITTED'].includes(pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
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
      .select('id')
      .eq('pdr_id', pdrId)
      .eq('value_id', behaviorData.valueId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingBehavior) {
      return createApiError('Behavior already exists for this company value', 400, 'BEHAVIOR_EXISTS');
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

    return createApiResponse(behavior, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
