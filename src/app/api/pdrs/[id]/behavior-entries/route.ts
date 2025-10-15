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
import { PDRStatus, EMPLOYEE_EDITABLE_STATUSES } from '@/types/pdr-status';

// Validation schema for behavior entry
const behaviorEntrySchema = z.object({
  valueId: z.string().min(1), // Allow demo IDs that aren't UUIDs
  authorType: z.enum(['EMPLOYEE', 'CEO']),
  description: z.string().optional(), // Made optional since CEO entries might not have a modified description
  examples: z.string().optional(),
  selfAssessment: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comments: z.string().optional(),
  employeeEntryId: z.string().min(1).optional(), // Allow demo IDs that aren't UUIDs
}).refine((data) => {
  // For employee entries, description is required
  if (data.authorType === 'EMPLOYEE') {
    return data.description && data.description.length > 0;
  }
  // For CEO entries, description is optional
  return true;
}, {
  message: "Description is required for employee entries",
  path: ["description"],
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pdrId = params.id;
    
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const user = authResult.user;

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

    // Get behavior entries for this PDR with related data
    const { data: behaviorEntries, error: entriesError } = await supabase
      .from('behavior_entries')
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
      .eq('pdr_id', pdrId)
      .order('created_at', { ascending: true });

    if (entriesError) {
      throw entriesError;
    }

    return createApiResponse(behaviorEntries);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pdrId = params.id;
    
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const user = authResult.user;

    // Validate request body
    const validation = await validateRequestBody(request, behaviorEntrySchema);
    if (!validation.success) {
      return validation.response;
    }

    const entryData = validation.data;

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

    // Check if PDR is locked (only for employee entries, CEO can always add reviews)
    if (pdr.is_locked && entryData.authorType === 'EMPLOYEE') {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Define allowed statuses for employee editing
    // Check if PDR allows editing for employees
    if (entryData.authorType === 'EMPLOYEE' && !EMPLOYEE_EDITABLE_STATUSES.includes(pdr.status as PDRStatus)) {
      return createApiError(
        `PDR status '${pdr.status}' does not allow editing`, 
        400, 
        'INVALID_STATUS'
      );
    }

    // Verify the user can create this type of entry
    if (entryData.authorType === 'EMPLOYEE' && user.role !== 'EMPLOYEE' && pdr.user_id !== user.id) {
      return createApiError('Only the PDR owner can create employee entries', 403, 'INVALID_AUTHOR');
    }

    if (entryData.authorType === 'CEO' && user.role !== 'CEO') {
      return createApiError('Only CEOs can create CEO entries', 403, 'INVALID_AUTHOR');
    }

    // Verify the company value exists and is active
    const { data: companyValue, error: valueError } = await supabase
      .from('company_values')
      .select('*')
      .eq('id', entryData.valueId)
      .single();

    if (valueError || !companyValue || !companyValue.is_active) {
      return createApiError('Invalid or inactive company value', 400, 'INVALID_COMPANY_VALUE');
    }

    // For CEO entries, verify the employee entry exists
    if (entryData.authorType === 'CEO' && entryData.employeeEntryId) {
      const { data: employeeEntry, error: employeeError } = await supabase
        .from('behavior_entries')
        .select('*')
        .eq('id', entryData.employeeEntryId)
        .single();

      if (employeeError || !employeeEntry || employeeEntry.pdr_id !== pdrId || employeeEntry.author_type !== 'EMPLOYEE') {
        return createApiError('Invalid employee entry reference', 400, 'INVALID_EMPLOYEE_ENTRY');
      }
    }

    // Check if entry already exists for this combination
    const { data: existingEntry, error: existingError } = await supabase
      .from('behavior_entries')
      .select('*')
      .eq('pdr_id', pdrId)
      .eq('value_id', entryData.valueId)
      .eq('author_id', user.id)
      .eq('author_type', entryData.authorType)
      .single();

    // If we get an error other than "no rows found", throw it
    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (existingEntry) {
      return createApiError('Behavior entry already exists for this combination', 400, 'ENTRY_EXISTS');
    }

    // Create the behavior entry
    const { data: behaviorEntry, error: createError } = await supabase
      .from('behavior_entries')
      .insert({
        pdr_id: pdrId,
        value_id: entryData.valueId,
        author_id: user.id,
        author_type: entryData.authorType,
        description: entryData.description || '', // Use empty string if description is undefined
        examples: entryData.examples || null,
        self_assessment: entryData.selfAssessment || null,
        rating: entryData.rating || null,
        comments: entryData.comments || null,
        employee_entry_id: entryData.employeeEntryId || null,
      })
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
        )
      `)
      .single();

    if (createError) {
      throw createError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'behavior_entries',
      recordId: behaviorEntry.id,
      action: 'INSERT',
      newValues: behaviorEntry,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(behaviorEntry, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
