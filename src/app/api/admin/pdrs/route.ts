import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const period = searchParams.get('period');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build base query
    let query = supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          role,
          is_active
        ),
        period:pdr_periods(
          id,
          name,
          start_date,
          end_date,
          is_active
        ),
        goals(
          id,
          title,
          employee_rating,
          ceo_rating,
          weight
        ),
        behaviors(
          id,
          company_value_id,
          employee_rating,
          ceo_rating
        ),
        mid_year_review:mid_year_reviews(
          id,
          employee_comments,
          ceo_comments,
          created_at
        ),
        end_year_review:end_year_reviews(
          id,
          employee_overall_rating,
          ceo_overall_rating,
          employee_comments,
          ceo_comments,
          created_at
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      // Handle multiple status values separated by comma
      const statusArray = status.split(',').map(s => s.trim());
      if (statusArray.length === 1) {
        query = query.eq('status', statusArray[0]);
      } else {
        query = query.in('status', statusArray);
      }
    }

    if (period) {
      query = query.eq('fy_label', period);
    }

    if (search) {
      // Search in user first_name, last_name, or email
      query = query.or(`
        user.first_name.ilike.%${search}%,
        user.last_name.ilike.%${search}%,
        user.email.ilike.%${search}%
      `);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    if (sortBy === 'employee_name') {
      // Sort by user first_name, then last_name
      query = query.order('first_name', { ascending, foreignTable: 'user' });
    } else if (sortBy === 'fy_label') {
      query = query.order('fy_label', { ascending });
    } else if (sortBy === 'status') {
      query = query.order('status', { ascending });
    } else {
      // Default to updated_at or created_at
      query = query.order(sortBy, { ascending });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: pdrs, error, count } = await query;

    if (error) {
      console.error('Error fetching PDRs:', error);
      return createApiError('Failed to fetch PDRs', 500, 'DATABASE_ERROR', error.message);
    }

    // Transform the data to match the expected structure
    const transformedPdrs = pdrs?.map(pdr => ({
      id: pdr.id,
      userId: pdr.user_id,
      fyLabel: pdr.fy_label,
      fyStartDate: pdr.fy_start_date,
      fyEndDate: pdr.fy_end_date,
      status: pdr.status,
      currentStep: pdr.current_step,
      isLocked: pdr.is_locked,
      meetingBooked: pdr.meeting_booked,
      meetingDate: pdr.meeting_date,
      submittedAt: pdr.submitted_at,
      createdAt: pdr.created_at,
      updatedAt: pdr.updated_at,
      user: pdr.user ? {
        id: pdr.user.id,
        firstName: pdr.user.first_name,
        lastName: pdr.user.last_name,
        email: pdr.user.email,
        role: pdr.user.role,
        isActive: pdr.user.is_active,
      } : null,
      period: pdr.period ? {
        id: pdr.period.id,
        name: pdr.period.name,
        startDate: pdr.period.start_date,
        endDate: pdr.period.end_date,
        isActive: pdr.period.is_active,
      } : null,
      goals: pdr.goals || [],
      behaviors: pdr.behaviors || [],
      midYearReview: pdr.mid_year_review,
      endYearReview: pdr.end_year_review,
    })) || [];

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);

    const paginatedResponse = {
      success: true,
      data: transformedPdrs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    return createApiResponse(paginatedResponse);
  } catch (error) {
    return handleApiError(error);
  }
}


