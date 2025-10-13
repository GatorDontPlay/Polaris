import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  handleApiError,
  authenticateRequest 
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { CompanyValue } from '@/types';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Company values are public data - no authentication required
    const supabase = await createClient();

    console.log('🔍 [API] Fetching company values from database...');
    console.log('🔍 [API] Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Get all active company values
    const { data: values, error } = await supabase
      .from('company_values')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('🚨 [API] Supabase query error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Check if it's an RLS policy error
      if (error.code === 'PGRST116' || error.message?.includes('policy')) {
        console.error('🚨 [API] RLS POLICY ERROR: The database query was blocked by Row Level Security.');
        console.error('🚨 [API] Fix: Run the fix-company-values-rls-policy.sql script in Supabase SQL Editor');
      }
      
      throw error;
    }

    console.log('🔍 [API] Raw data from database:', values);
    console.log('🔍 [API] Number of values fetched:', values?.length || 0);

    // Warn if no data returned (possible RLS issue even without error)
    if (!values || values.length === 0) {
      console.warn('⚠️ [API] No company values returned from database!');
      console.warn('⚠️ [API] This might be an RLS policy issue.');
      console.warn('⚠️ [API] Run: fix-company-values-rls-policy.sql in Supabase SQL Editor');
    }

    // Transform snake_case to camelCase to match TypeScript types
    const transformedValues: CompanyValue[] = (values || []).map((value: any) => ({
      id: value.id,
      name: value.name,
      description: value.description,
      isActive: value.is_active,
      sortOrder: value.sort_order,
      createdAt: new Date(value.created_at),
    }));

    console.log('🔍 [API] Transformed data:', transformedValues);
    console.log('✅ [API] Company values successfully fetched and transformed');

    return createApiResponse(transformedValues);
  } catch (error) {
    console.error('🚨 [API] Error in company-values route:', error);
    return handleApiError(error);
  }
}
