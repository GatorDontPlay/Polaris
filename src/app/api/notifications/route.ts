import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest,
  extractPagination,
  createPaginatedResponse 
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const url = new URL(request.url);
    const { page, limit, offset } = extractPagination(url);
    const supabase = await createClient();

    // Get query parameters
    const unreadOnly = url.searchParams.get('unread') === 'true';

    // Build query
    let query = supabase
      .from('notifications')
      .select(`
        *,
        pdr:pdrs(id, fy_label, status)
      `, { count: 'exact' })
      .eq('user_id', user.id);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    // Get total count first
    const { count: total } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read_at', unreadOnly ? null : 'read_at');

    // Get notifications with pagination
    const { data: notifications, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const response = createPaginatedResponse(notifications || [], total || 0, page, limit);
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const body = await request.json();
    const { notificationIds, markAsRead = true } = body;

    if (!Array.isArray(notificationIds)) {
      return createApiError('notificationIds must be an array', 400, 'INVALID_REQUEST');
    }

    // Update notifications (only user's own notifications)
    const updateData = markAsRead 
      ? { readAt: new Date() }
      : { readAt: null };

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id, // Ensure user can only update their own notifications
      },
      data: updateData,
    });

    return createApiResponse({ 
      updatedCount: result.count,
      markAsRead 
    });
  } catch (error) {
    return handleApiError(error);
  }
}
