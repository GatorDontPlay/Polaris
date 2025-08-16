import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';
import { ApiResponse, ActivityItem } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent audit logs for the current user
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        changedBy: user.id,
        // Only include relevant table changes
        tableName: {
          in: ['pdrs', 'goals', 'behaviors', 'mid_year_reviews', 'end_year_reviews']
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        changedAt: 'desc'
      },
      take: limit
    });

    // Process audit logs into activity items
    const processedActivity: ActivityItem[] = recentActivity
      .map(log => {
        let type: ActivityItem['type'] = 'pdr_submitted';
        let message = '';
        let priority: 'low' | 'medium' | 'high' = 'low';

        switch (log.tableName) {
          case 'pdrs':
            if (log.action === 'UPDATE') {
              const newValues = log.newValues as any;
              const oldValues = log.oldValues as any;
              
              // Check if status changed
              if (newValues?.status && newValues.status !== oldValues?.status) {
                switch (newValues.status) {
                  case 'SUBMITTED':
                    type = 'pdr_submitted';
                    message = 'submitted PDR for review';
                    priority = 'medium';
                    break;
                  case 'COMPLETED':
                    type = 'review_completed';
                    message = 'completed PDR';
                    priority = 'low';
                    break;
                  case 'MID_YEAR_CHECK':
                    type = 'review_completed';
                    message = 'started mid-year review';
                    priority = 'medium';
                    break;
                  case 'END_YEAR_REVIEW':
                    type = 'review_completed';
                    message = 'started end-year review';
                    priority = 'medium';
                    break;
                  default:
                    message = `updated PDR status to ${newValues.status.replace('_', ' ').toLowerCase()}`;
                    priority = 'low';
                }
              } else if (newValues?.meetingBooked && !oldValues?.meetingBooked) {
                message = 'booked PDR review meeting';
                priority = 'medium';
              } else {
                message = 'updated PDR details';
                priority = 'low';
              }
            } else if (log.action === 'INSERT') {
              message = 'created new PDR';
              priority = 'medium';
            }
            break;

          case 'goals':
            if (log.action === 'INSERT') {
              type = 'goal_added';
              message = 'added a new goal';
              priority = 'low';
            } else if (log.action === 'UPDATE') {
              const newValues = log.newValues as any;
              const oldValues = log.oldValues as any;
              
              if (newValues?.employeeRating && newValues.employeeRating !== oldValues?.employeeRating) {
                type = 'goal_added';
                message = 'self-rated a goal';
                priority = 'low';
              } else {
                type = 'goal_added';
                message = 'updated a goal';
                priority = 'low';
              }
            }
            break;

          case 'behaviors':
            if (log.action === 'INSERT') {
              type = 'behavior_assessed';
              message = 'added behavior assessment';
              priority = 'low';
            } else if (log.action === 'UPDATE') {
              const newValues = log.newValues as any;
              const oldValues = log.oldValues as any;
              
              if (newValues?.employeeRating && newValues.employeeRating !== oldValues?.employeeRating) {
                type = 'behavior_assessed';
                message = 'self-rated behavior';
                priority = 'low';
              } else {
                type = 'behavior_assessed';
                message = 'updated behavior assessment';
                priority = 'low';
              }
            }
            break;

          case 'mid_year_reviews':
            if (log.action === 'INSERT') {
              type = 'review_completed';
              message = 'submitted mid-year review';
              priority = 'medium';
            } else if (log.action === 'UPDATE') {
              type = 'review_completed';
              message = 'updated mid-year review';
              priority = 'low';
            }
            break;

          case 'end_year_reviews':
            if (log.action === 'INSERT') {
              type = 'review_completed';
              message = 'submitted end-year review';
              priority = 'high';
            } else if (log.action === 'UPDATE') {
              type = 'review_completed';
              message = 'updated end-year review';
              priority = 'low';
            }
            break;
        }

        return {
          id: log.id,
          type,
          user: log.user || { 
            id: user.id, 
            firstName: user.firstName, 
            lastName: user.lastName, 
            email: user.email 
          },
          message,
          timestamp: log.changedAt,
          priority,
        };
      })
      .filter(activity => activity.message); // Only include activities with messages

    const response: ApiResponse<ActivityItem[]> = {
      success: true,
      data: processedActivity
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch user activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
