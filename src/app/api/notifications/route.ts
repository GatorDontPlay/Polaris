import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest,
  extractPagination,
  createPaginatedResponse 
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

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

    // Get query parameters
    const unreadOnly = url.searchParams.get('unread') === 'true';

    // Build where clause
    const whereClause: any = {
      userId: user.id,
    };

    if (unreadOnly) {
      whereClause.readAt = null;
    }

    // Get total count
    const total = await prisma.notification.count({ where: whereClause });

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        pdr: {
          select: {
            id: true,
            fyLabel: true,
            status: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    });

    const response = createPaginatedResponse(notifications, total, page, limit);
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
