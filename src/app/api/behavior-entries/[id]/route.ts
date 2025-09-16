import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for updating behavior entry
const updateBehaviorEntrySchema = z.object({
  description: z.string().min(1).optional(),
  examples: z.string().optional(),
  selfAssessment: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comments: z.string().optional(),
  // CEO-specific fields
  ceoNotes: z.string().optional(),
  ceoRating: z.number().int().min(1).max(5).optional(),
});

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
    const entryId = params.id;

    const supabase = await createClient();

    // Get behavior entry with related data
    const { data: behaviorEntry, error } = await supabase
      .from('behavior_entries')
      .select(`
        *,
        pdr:pdrs!behavior_entries_pdr_id_fkey(
          *,
          user:profiles!pdrs_user_id_fkey(*)
        ),
        value:company_values!behavior_entries_value_id_fkey(*),
        author:profiles!behavior_entries_author_id_fkey(
          id, first_name, last_name, email, role
        ),
        employee_entry:behavior_entries!behavior_entries_employee_entry_id_fkey(
          *,
          value:company_values(*),
          author:profiles!behavior_entries_author_id_fkey(
            id, first_name, last_name, email, role
          )
        ),
        ceo_entries:behavior_entries!behavior_entries_employee_entry_id_fkey(
          *,
          value:company_values(*),
          author:profiles!behavior_entries_author_id_fkey(
            id, first_name, last_name, email, role
          )
        )
      `)
      .eq('id', entryId)
      .single();

    if (error || !behaviorEntry) {
      return createApiError('Behavior entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    // Check access permissions
    const canView = user.role === 'CEO' || 
                   behaviorEntry.pdr.user_id === user.id || 
                   behaviorEntry.author_id === user.id;

    if (!canView) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    return createApiResponse(behaviorEntry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entryId = params.id;
    
    // Check if this is demo mode
    const isDemoMode = entryId.startsWith('demo-behavior-entry-');
    
    let user;
    if (isDemoMode) {
      // For demo mode, create a mock CEO user
      user = {
        id: 'demo-ceo-1',
        email: 'ceo@demo.com',
        firstName: 'CEO',
        lastName: 'Demo',
        role: 'CEO' as const,
      };
    } else {
      // Authenticate user for production
      const authResult = await authenticateRequest(request);
      if (!authResult.success) {
        return authResult.response;
      }
      user = authResult.user;
    }

    // Validate request body
    const validation = await validateRequestBody(request, updateBehaviorEntrySchema);
    if (!validation.success) {
      return validation.response;
    }

    const updateData = validation.data;

    if (isDemoMode) {
      // For demo mode, return a mock updated entry
      const mockUpdatedEntry = {
        id: entryId,
        pdrId: 'demo-pdr-1755545351311',
        valueId: 'value-1',
        authorId: user.id,
        authorType: 'CEO',
        description: updateData.description || 'Updated description',
        examples: updateData.examples || null,
        selfAssessment: updateData.selfAssessment || null,
        rating: updateData.rating || null,
        comments: updateData.comments || 'Updated comments',
        employeeEntryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        value: {
          id: 'value-1',
          name: 'Innovation',
          description: 'Demo company value',
          isActive: true,
          sortOrder: 1,
          createdAt: new Date(),
        },
        author: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        employeeEntry: null,
        ceoEntries: [],
      };

      return createApiResponse(mockUpdatedEntry);
    }

    const supabase = await createClient();

    // Get behavior entry with PDR data
    const { data: behaviorEntry, error: fetchError } = await supabase
      .from('behavior_entries')
      .select(`
        *,
        pdr:pdrs!behavior_entries_pdr_id_fkey(
          *,
          user:profiles!pdrs_user_id_fkey(*)
        ),
        author:profiles!behavior_entries_author_id_fkey(*)
      `)
      .eq('id', entryId)
      .single();

    if (fetchError || !behaviorEntry) {
      return createApiError('Behavior entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    // Check access permissions - only the author can update their entry
    if (behaviorEntry.author_id !== user.id) {
      return createApiError('Only the author can update their entry', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked (only affects employee entries)
    if (behaviorEntry.pdr.is_locked && behaviorEntry.author_type === 'EMPLOYEE') {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing for employees
    if (behaviorEntry.author_type === 'EMPLOYEE' && 
        !['Created', 'DRAFT', 'SUBMITTED', 'OPEN_FOR_REVIEW'].includes(behaviorEntry.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Store old values for audit log
    const oldValues = {
      description: behaviorEntry.description,
      examples: behaviorEntry.examples,
      self_assessment: behaviorEntry.self_assessment,
      rating: behaviorEntry.rating,
      comments: behaviorEntry.comments,
    };

    // Prepare update data with snake_case field names
    const supabaseUpdateData: any = {};
    if (updateData.description !== undefined) supabaseUpdateData.description = updateData.description;
    if (updateData.examples !== undefined) supabaseUpdateData.examples = updateData.examples;
    if (updateData.selfAssessment !== undefined) supabaseUpdateData.self_assessment = updateData.selfAssessment;
    if (updateData.rating !== undefined) supabaseUpdateData.employee_rating = updateData.rating;
    if (updateData.comments !== undefined) supabaseUpdateData.employee_notes = updateData.comments;
    // CEO-specific fields
    if (updateData.ceoNotes !== undefined) supabaseUpdateData.ceo_notes = updateData.ceoNotes;
    if (updateData.ceoRating !== undefined) supabaseUpdateData.ceo_rating = updateData.ceoRating;
    supabaseUpdateData.updated_at = new Date().toISOString();

    // Update the behavior entry
    const { data: updatedEntry, error: updateError } = await supabase
      .from('behavior_entries')
      .update(supabaseUpdateData)
      .eq('id', entryId)
      .select(`
        *,
        value:company_values!behavior_entries_value_id_fkey(*),
        author:profiles!behavior_entries_author_id_fkey(
          id, first_name, last_name, email, role
        ),
        employee_entry:behavior_entries!behavior_entries_employee_entry_id_fkey(
          *,
          value:company_values(*),
          author:profiles!behavior_entries_author_id_fkey(
            id, first_name, last_name, email, role
          )
        ),
        ceo_entries:behavior_entries!behavior_entries_employee_entry_id_fkey(
          *,
          value:company_values(*),
          author:profiles!behavior_entries_author_id_fkey(
            id, first_name, last_name, email, role
          )
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'behavior_entries',
      recordId: entryId,
      action: 'UPDATE',
      oldValues,
      newValues: updateData,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(updatedEntry);
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
    const entryId = params.id;

    const supabase = await createClient();

    // Get behavior entry with PDR data
    const { data: behaviorEntry, error: fetchError } = await supabase
      .from('behavior_entries')
      .select(`
        *,
        pdr:pdrs!behavior_entries_pdr_id_fkey(
          *,
          user:profiles!pdrs_user_id_fkey(*)
        ),
        author:profiles!behavior_entries_author_id_fkey(*),
        ceo_entries:behavior_entries!behavior_entries_employee_entry_id_fkey(*)
      `)
      .eq('id', entryId)
      .single();

    if (fetchError || !behaviorEntry) {
      return createApiError('Behavior entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    // Check access permissions - only the author or CEO can delete
    const canDelete = behaviorEntry.author_id === user.id || user.role === 'CEO';

    if (!canDelete) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked (only affects employee entries)
    if (behaviorEntry.pdr.is_locked && behaviorEntry.author_type === 'EMPLOYEE') {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing for employees
    if (behaviorEntry.author_type === 'EMPLOYEE' && 
        !['Created', 'DRAFT', 'SUBMITTED', 'OPEN_FOR_REVIEW'].includes(behaviorEntry.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // If this is an employee entry with CEO entries linked to it, we can't delete it
    if (behaviorEntry.author_type === 'EMPLOYEE' && behaviorEntry.ceo_entries && behaviorEntry.ceo_entries.length > 0) {
      return createApiError('Cannot delete employee entry that has CEO reviews linked to it', 400, 'HAS_LINKED_ENTRIES');
    }

    // Delete the behavior entry
    const { error: deleteError } = await supabase
      .from('behavior_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) {
      throw deleteError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'behavior_entries',
      recordId: entryId,
      action: 'DELETE',
      oldValues: behaviorEntry,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse({ message: 'Behavior entry deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
