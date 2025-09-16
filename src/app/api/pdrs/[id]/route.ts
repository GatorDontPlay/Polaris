import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { transformPDRFields } from '@/lib/case-transform';
import { 
  getPDRPermissions
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🗑️ PDR DELETE route called with ID:', params.id);
  
  try {
    // Authenticate user
    console.log('🗑️ Starting authentication...');
    const authResult = await authenticateRequest(request);
    console.log('🗑️ Authentication result:', authResult.success);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;
    
    console.log('🗑️ Creating Supabase client...');
    const supabase = await createClient();
    console.log('🗑️ Supabase client created successfully');

    // Get current PDR to check permissions
    const { data: pdr, error: fetchError } = await supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
        goals(id),
        behaviors(id)
      `)
      .eq('id', pdrId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('🗑️ PDR not found');
        return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
      }
      throw fetchError;
    }

    if (!pdr) {
      console.log('🗑️ PDR not found (null)');
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check permissions
    const isOwner = pdr.user_id === user.id;
    const isCEO = user.role === 'CEO';
    
    console.log('🗑️ PDR Delete Debug:', {
      pdrId,
      pdrStatus: pdr.status,
      userRole: user.role,
      isOwner,
      isCEO,
      userId: user.id,
      pdrUserId: pdr.user_id
    });

    // Only allow deletion by:
    // 1. The PDR owner (employee) if the PDR is in DRAFT status
    // 2. The PDR owner (employee) if the PDR is in OPEN_FOR_REVIEW status AND not locked by CEO
    // 3. CEO (can delete any PDR in DRAFT status)
    const canDelete = (isOwner && pdr.status === 'DRAFT') || 
                      (isOwner && pdr.status === 'OPEN_FOR_REVIEW' && !pdr.is_locked) ||
                      (isCEO && pdr.status === 'DRAFT');

    if (!canDelete) {
      let reason;
      if (pdr.status === 'OPEN_FOR_REVIEW' && pdr.is_locked) {
        reason = 'PDR is locked by CEO and cannot be deleted';
      } else if (!['DRAFT', 'OPEN_FOR_REVIEW'].includes(pdr.status)) {
        reason = 'PDR can only be deleted when in DRAFT or OPEN_FOR_REVIEW status';
      } else if (!isOwner && !isCEO) {
        reason = 'You do not have permission to delete this PDR';
      } else {
        reason = 'PDR deletion not allowed in current state';
      }
      console.log('🗑️ Delete not allowed:', reason);
      return createApiError(reason, 403, 'DELETE_NOT_ALLOWED');
    }

    console.log('🗑️ Permission granted, proceeding with deletion');

    // Start transaction-like deletion
    // Note: Supabase should handle cascading deletes if configured properly,
    // but we'll be explicit for safety

    try {
      // Delete related records first (if cascade delete isn't configured)
      
      // Delete behavior entries if they exist
      console.log('🗑️ Deleting behavior entries...');
      await supabase
        .from('behavior_entries')
        .delete()
        .eq('pdr_id', pdrId);

      // Delete behaviors
      console.log('🗑️ Deleting behaviors...');
      await supabase
        .from('behaviors')
        .delete()
        .eq('pdr_id', pdrId);

      // Delete goals
      console.log('🗑️ Deleting goals...');
      await supabase
        .from('goals')
        .delete()
        .eq('pdr_id', pdrId);

      // Delete mid-year reviews
      console.log('🗑️ Deleting mid-year reviews...');
      await supabase
        .from('mid_year_reviews')
        .delete()
        .eq('pdr_id', pdrId);

      // Delete end-year reviews
      console.log('🗑️ Deleting end-year reviews...');
      await supabase
        .from('end_year_reviews')
        .delete()
        .eq('pdr_id', pdrId);

      // Delete notifications related to this PDR
      console.log('🗑️ Deleting notifications...');
      await supabase
        .from('notifications')
        .delete()
        .eq('pdr_id', pdrId);

      // Finally, delete the PDR itself
      console.log('🗑️ Deleting PDR...');
      const { error: deleteError } = await supabase
        .from('pdrs')
        .delete()
        .eq('id', pdrId);

      if (deleteError) {
        console.error('🗑️ PDR deletion error:', deleteError);
        throw deleteError;
      }

      console.log('🗑️ PDR successfully deleted');
      
      // Return success response
      return createApiResponse({
        message: 'PDR deleted successfully',
        deletedId: pdrId
      });

    } catch (deletionError) {
      console.error('🗑️ Error during PDR deletion process:', deletionError);
      throw deletionError;
    }

  } catch (error) {
    console.error('🗑️ DELETE route error:', error);
    console.error('🗑️ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return handleApiError(error);
  }
}