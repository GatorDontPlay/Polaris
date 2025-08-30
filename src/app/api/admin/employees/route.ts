import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  extractPagination,
  createPaginatedResponse,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and check CEO role
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    if (user.role !== 'CEO') {
      return createApiError('Access denied - CEO role required', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const url = new URL(request.url);
    const { page, limit, offset } = extractPagination(url);

    // Extract filters
    const search = url.searchParams.get('search');
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');

    const supabase = await createClient();

    // Build query for Supabase
    let query = supabase
      .from('profiles')
      .select(`
        *,
        pdrs (
          *,
          period:pdr_periods (name, start_date, end_date),
          goals (employee_rating, ceo_rating),
          behaviors (employee_rating, ceo_rating),
          end_year_review:end_year_reviews (employee_overall_rating, ceo_overall_rating)
        )
      `, { count: 'exact' })
      .eq('role', role || 'EMPLOYEE')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply status filter
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: employees, error, count: total } = await query;

    if (error) {
      throw error;
    }

    // Process employee data with calculated metrics
    const processedEmployees = employees.map(employee => {
      const pdrs = employee.pdrs;
      const totalPDRs = pdrs.length;
      const completedPDRs = pdrs.filter(pdr => pdr.status === 'COMPLETED').length;
      const latestPDR = pdrs[0] || null;

      // Calculate average rating from completed PDRs
      const completedWithRatings = pdrs.filter(pdr => 
        pdr.status === 'COMPLETED' && pdr.end_year_review?.ceo_overall_rating
      );
      const averageRating = completedWithRatings.length > 0
        ? completedWithRatings.reduce((sum, pdr) => 
            sum + (pdr.end_year_review?.ceo_overall_rating || 0), 0
          ) / completedWithRatings.length
        : 0;

      // Add calculated fields to PDRs
      const pdrsWithCalc = pdrs.map(pdr => {
        const goalRatings = pdr.goals.filter(g => g.ceo_rating).map(g => g.ceo_rating!);
        const behaviorRatings = pdr.behaviors.filter(b => b.ceo_rating).map(b => b.ceo_rating!);

        const averageGoalRating = goalRatings.length > 0
          ? goalRatings.reduce((sum, rating) => sum + rating, 0) / goalRatings.length
          : undefined;

        const averageBehaviorRating = behaviorRatings.length > 0
          ? behaviorRatings.reduce((sum, rating) => sum + rating, 0) / behaviorRatings.length
          : undefined;

        return {
          ...pdr,
          averageGoalRating: averageGoalRating ? Math.round(averageGoalRating * 10) / 10 : undefined,
          averageBehaviorRating: averageBehaviorRating ? Math.round(averageBehaviorRating * 10) / 10 : undefined,
        };
      });

      return {
        ...employee,
        pdrs: pdrsWithCalc,
        latestPDR,
        totalPDRs,
        completedPDRs,
        averageRating: Math.round(averageRating * 10) / 10,
      };
    });

    const response = createPaginatedResponse(processedEmployees, total, page, limit);
    return createApiResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}
