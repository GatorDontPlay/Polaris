import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

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

    // Get PDR to verify access
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

    // Get company values and behavior entries from database
    const { data: companyValues, error: valuesError } = await supabase
      .from('company_values')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (valuesError) {
      throw valuesError;
    }

    const { data: behaviorEntries, error: behaviorsError } = await supabase
      .from('behaviors')
      .select(`
        *,
        value:company_values!behaviors_value_id_fkey(*)
      `)
      .eq('pdr_id', pdrId);

    if (behaviorsError) {
      throw behaviorsError;
    }

    // Organize behaviors by company value
    const organizedBehaviors = companyValues.map(value => {
      const behaviors = behaviorEntries.filter(entry => entry.value_id === value.id);
      
      return {
        companyValue: value,
        behaviors: behaviors.map(behavior => ({
          id: behavior.id,
          description: behavior.description,
          examples: behavior.examples,
          employeeRating: behavior.employee_rating,
          ceoRating: behavior.ceo_rating,
          employeeNotes: behavior.employee_notes,
          ceoNotes: behavior.ceo_notes,
          createdAt: behavior.created_at,
          updatedAt: behavior.updated_at,
        })),
      };
    });

    return createApiResponse(organizedBehaviors);
  } catch (error) {
    return handleApiError(error);
  }
}
