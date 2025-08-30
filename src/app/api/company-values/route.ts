import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  handleApiError,
  authenticateRequest 
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

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
