import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  handleApiError,
  authenticateRequest 
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Company values are public data - no authentication required
    const supabase = await createClient();

    // Get all active company values
    const { data: values, error } = await supabase
      .from('company_values')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    return createApiResponse(values);
  } catch (error) {
    return handleApiError(error);
  }
}
