import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { transformPDRFields } from '@/lib/case-transform';
import { 
  getPDRPermissions, 
  validateStateTransition,
  validateTransitionRequirements,
  createPDRNotification 
} from '@/lib/pdr-state-machine';

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

    // Get PDR with all relations
    const { data: pdr, error } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
        period:pdr_periods(*),
        locked_by_user:profiles!pdrs_locked_by_fkey(id, first_name, last_name),
        goals(*),
        behaviors(*, value:company_values(*)),
        mid_year_review:mid_year_reviews(*),
        end_year_review:end_year_reviews(*)
      `)
      .eq('id', pdrId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
      }
      throw error;
    }

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check permissions
    const isOwner = pdr.user_id === user.id;
    const permissions = getPDRPermissions(pdr.status, user.role, isOwner);

    if (!permissions.canView) {
      return createApiError('Insufficient permissions to view this PDR', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Filter fields based on permissions
    const filteredPdr = {
      ...pdr,
      employee_fields: permissions.canViewEmployeeFields ? pdr.employee_fields : undefined,
      ceo_fields: permissions.canViewCeoFields ? pdr.ceo_fields : undefined,
      goals: permissions.canViewEmployeeFields ? pdr.goals : [],
      behaviors: permissions.canViewEmployeeFields ? pdr.behaviors : [],
    };

    // Transform PDR fields to camelCase
    const transformedPDR = transformPDRFields(filteredPdr);

    return createApiResponse(transformedPDR);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔧 PDR PATCH route called with ID:', params.id);
  
  try {
    // Authenticate user
    console.log('🔧 Starting authentication...');
    const authResult = await authenticateRequest(request);
    console.log('🔧 Authentication result:', authResult.success);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;
    
    console.log('🔧 Parsing request body...');
    let body;
    try {
      body = await request.json();
      console.log('🔧 Request body:', body);
    } catch (bodyError) {
      console.error('🔧 Error parsing request body:', bodyError);
      return createApiError('Invalid request body', 400, 'INVALID_BODY');
    }
    
    console.log('🔧 Creating Supabase client...');
    const supabase = await createClient();
    console.log('🔧 Supabase client created successfully');

    // Get current PDR
    const { data: pdr, error: fetchError } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(*),
        goals(*),
        behaviors(*)
      `)
      .eq('id', pdrId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
      }
      throw fetchError;
    }

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check permissions
    const isOwner = pdr.user_id === user.id;
    
    // Debug logging to identify the issue
    console.log('PDR Update Debug:', {
      pdrId,
      pdrStatus: pdr.status,
      userRole: user.role,
      isOwner,
      userId: user.id,
      pdrUserId: pdr.user_id
    });
    
    let permissions;
    try {
      permissions = getPDRPermissions(pdr.status, user.role, isOwner);
      console.log('PDR Permissions:', permissions);
    } catch (permissionError) {
      console.error('Error getting PDR permissions:', permissionError);
      return createApiError('Error checking permissions', 500, 'PERMISSION_ERROR');
    }

    if (!permissions.canEdit) {
      const reason = permissions.readOnlyReason || 'PDR is not editable in current state';
      return createApiError(reason, 403, 'PDR_READ_ONLY');
    }

    // Prepare update data based on user role and permissions
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Handle employee field updates
    if (permissions.canEditEmployeeFields && body.employeeFields) {
      updateData.employee_fields = body.employeeFields;
    }

    // Handle CEO field updates
    if (permissions.canEditCeoFields && body.ceoFields) {
      updateData.ceo_fields = body.ceoFields;
    }

    // Handle step progression
    if (body.currentStep && typeof body.currentStep === 'number') {
      updateData.current_step = body.currentStep;
    }

    console.log('PDR Update Data:', updateData);

    // Update PDR
    const { data: updatedPdr, error: updateError } = await supabase
      .from('pdrs')
      .update(updateData)
      .eq('id', pdrId)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
        period:pdr_periods(*),
        goals(*),
        behaviors(*, value:company_values(*)),
        mid_year_review:mid_year_reviews(*),
        end_year_review:end_year_reviews(*)
      `)
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw updateError;
    }

    // Transform PDR fields to camelCase
    let transformedPDR;
    try {
      transformedPDR = transformPDRFields(updatedPdr);
      console.log('PDR transformation successful');
    } catch (transformError) {
      console.error('Error transforming PDR fields:', transformError);
      return createApiError('Error processing PDR data', 500, 'TRANSFORM_ERROR');
    }
    
    return createApiResponse(transformedPDR);
  } catch (error) {
    console.error('🔧 PATCH route error:', error);
    console.error('🔧 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return handleApiError(error);
  }
}