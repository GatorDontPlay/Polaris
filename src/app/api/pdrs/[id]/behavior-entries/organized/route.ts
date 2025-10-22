import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

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
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Get company values and behavior entries from database using service role to bypass RLS
    const { data: companyValues, error: valuesError } = await supabaseAdmin
      .from('company_values')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (valuesError) {
      throw valuesError;
    }

    const { data: behaviorEntries, error: behaviorsError } = await supabaseAdmin
      .from('behaviors')
      .select(`
        *,
        value:company_values!behaviors_value_id_fkey(*)
      `)
      .eq('pdr_id', pdrId);

    if (behaviorsError) {
      console.error('Organized behaviors API - behaviors query error:', behaviorsError);
      throw behaviorsError;
    }

    // Organize behaviors by company value using the correct structure
    const organizedBehaviors = companyValues.map(value => {
      const valueBehaviors = behaviorEntries.filter(entry => entry.value_id === value.id);
      
      // Transform behaviors to match expected structure (behaviors table doesn't have author_type)
      // All entries from behaviors table are employee entries
      const transformedEmployeeEntries = valueBehaviors.map(entry => ({
        id: entry.id,
        pdrId: entry.pdr_id,
        valueId: entry.value_id,
        authorId: pdr.user_id, // Use PDR owner as author
        authorType: 'EMPLOYEE' as const,
        description: entry.description || '',
        examples: entry.examples,
        selfAssessment: entry.employee_self_assessment || entry.employeeSelfAssessment,
        rating: entry.employee_rating, // Employee rating
        ceoComments: entry.ceo_comments, // CEO comments
        ceoAdjustedInitiative: entry.ceo_adjusted_initiative, // CEO adjusted initiative (separate field)
        ceoRating: entry.ceo_rating, // CEO rating
        employeeEntryId: null,
        createdAt: new Date(entry.created_at || new Date()),
        updatedAt: new Date(entry.updated_at || new Date()),
        value: entry.value,
        author: {
          id: pdr.user.id,
          firstName: pdr.user.first_name,
          lastName: pdr.user.last_name,
          email: pdr.user.email,
          role: 'EMPLOYEE' as const,
        },
        employeeEntry: null,
        ceoEntries: [], // No separate CEO entries in behaviors table yet
        ceoReviews: [], // No separate CEO reviews in behaviors table yet
      }));
      
      return {
        companyValue: value,
        employeeEntries: transformedEmployeeEntries,
        standaloneCeoEntries: [], // No separate CEO entries in behaviors table
        hasEmployeeEntry: transformedEmployeeEntries.length > 0,
        hasCeoEntry: false, // CEO reviews are stored in same record
        totalEntries: valueBehaviors.length,
      };
    });

    return createApiResponse(organizedBehaviors);
  } catch (error) {
    return handleApiError(error);
  }
}
