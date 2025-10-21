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
import { PDRStatus } from '@/types/pdr-status';

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

    // Parse query parameters for data selection
    const url = new URL(request.url);
    const includeGoals = url.searchParams.get('goals') !== 'false'; // default true
    const includeBehaviors = url.searchParams.get('behaviors') !== 'false'; // default true
    const includeReviews = url.searchParams.get('reviews') !== 'false'; // default true
    const minimal = url.searchParams.get('minimal') === 'true'; // default false
    
    // Minimal mode: only core PDR fields, no nested data
    if (minimal) {
      const { data: pdr, error } = await supabase
        .from('pdrs')
        .select(`
          id,
          user_id,
          status,
          current_step,
          fy_label,
          fy_start_date,
          fy_end_date,
          is_locked,
          locked_by,
          locked_at,
          meeting_booked,
          created_at,
          updated_at,
          user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
          locked_by_user:profiles!pdrs_locked_by_fkey(id, first_name, last_name)
        `)
        .eq('id', pdrId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
        }
        throw error;
      }

      if (!pdr) {
        return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
      }

      // Check permissions for field visibility
      const isOwner = pdr.user_id === user.id;
      const permissions = getPDRPermissions(pdr.status, user.role, isOwner);

      const transformedPDR = transformPDRFields(pdr);
      return createApiResponse(transformedPDR);
    }

    // Build dynamic select query based on parameters
    let selectFields = `
      id,
      user_id,
      status,
      current_step,
      fy_label,
      fy_start_date,
      fy_end_date,
      is_locked,
      locked_by,
      locked_at,
      meeting_booked,
      created_at,
      updated_at,
      user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
      locked_by_user:profiles!pdrs_locked_by_fkey(id, first_name, last_name),
      employee_fields,
      ceo_fields
    `;

    if (includeGoals) {
      selectFields += `,
        goals(id, title, description, target_outcome, success_criteria, priority, weighting, goal_mapping, employee_progress, employee_rating, ceo_comments, ceo_rating)`;
    }

    if (includeBehaviors) {
      // Optimize: fetch behaviors WITHOUT nested company_values to reduce size
      // Company values are fetched separately via useCompanyValues hook
      selectFields += `,
        behaviors(id, value_id, description, examples, employee_self_assessment, employee_rating, ceo_comments, ceo_rating)`;
    }

    if (includeReviews) {
      selectFields += `,
        mid_year_review:mid_year_reviews(id, progress_summary, blockers_challenges, support_needed, employee_comments, ceo_feedback, created_at),
        end_year_review:end_year_reviews(id, achievements_summary, learnings_growth, challenges_faced, next_year_goals, employee_overall_rating, ceo_overall_rating, ceo_final_comments, created_at)`;
    }

    // Get PDR with dynamic field selection
    const { data: pdr, error } = await supabase
      .from('pdrs')
      .select(selectFields)
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

    // Check permissions for field visibility
    // Note: RLS policies already enforce view access at database level
    // If we got this far, user has permission to view the PDR
    const isOwner = pdr.user_id === user.id;
    const permissions = getPDRPermissions(pdr.status, user.role, isOwner);

    // Filter fields based on permissions
    const filteredPdr = {
      ...pdr,
      goals: permissions.canViewEmployeeFields && includeGoals ? pdr.goals : [],
      behaviors: permissions.canViewEmployeeFields && includeBehaviors ? pdr.behaviors : [],
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

    // Get current PDR with minimal fields for permission check
    const { data: pdr, error: fetchError } = await supabase
      .from('pdrs')
      .select(`
        id,
        user_id,
        status,
        current_step,
        is_locked,
        locked_by,
        user:profiles!pdrs_user_id_fkey(id, role),
        goals(id),
        behaviors(id)
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

    // Handle CEO field updates (support both ceoFields and ceo_fields)
    if (permissions.canEditCeoFields && (body.ceoFields || body.ceo_fields)) {
      updateData.ceo_fields = body.ceoFields || body.ceo_fields;
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
        id,
        user_id,
        status,
        current_step,
        fy_label,
        fy_start_date,
        fy_end_date,
        is_locked,
        locked_by,
        meeting_booked,
        created_at,
        updated_at,
        employee_fields,
        ceo_fields,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
        goals(id, title, description, target_outcome, success_criteria, priority, weighting, goal_mapping, employee_progress, employee_rating, ceo_comments, ceo_rating),
        behaviors(id, value_id, description, examples, employee_self_assessment, employee_rating, ceo_comments, ceo_rating),
        mid_year_review:mid_year_reviews(id, progress_summary, blockers_challenges, support_needed),
        end_year_review:end_year_reviews(id, achievements_summary, learnings_growth, challenges_faced, next_year_goals, employee_overall_rating, ceo_overall_rating, ceo_final_comments)
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

    // Get current PDR to check permissions - minimal fields needed
    const { data: pdr, error: fetchError } = await supabase
      .from('pdrs')
      .select(`
        id,
        user_id,
        status,
        user:profiles!pdrs_user_id_fkey(id, role)
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
    // 1. The PDR owner (employee) if the PDR is in Created status
    // 2. CEO (can delete any PDR in Created status)
    const canDelete = (isOwner && pdr.status === PDRStatus.CREATED) || 
                      (isCEO && pdr.status === PDRStatus.CREATED);

    if (!canDelete) {
      let reason;
      if (pdr.status !== PDRStatus.CREATED) {
        reason = 'PDR can only be deleted when in Created status';
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