import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/api-helpers';
import { ApiResponse, ActivityItem } from '@/types';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = await createClient();

    // Fetch recent audit logs for the current user
    const { data: recentActivity, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles!audit_logs_user_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('user_id', user.id)
      .in('table_name', ['pdrs', 'goals', 'behaviors', 'mid_year_reviews', 'end_year_reviews'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Process audit logs into activity items
    const processedActivity: ActivityItem[] = recentActivity
      .map(log => {
        let type: ActivityItem['type'] = 'pdr_submitted';
        let message = '';
        let priority: 'low' | 'medium' | 'high' = 'low';

        switch (log.table_name) {
          case 'pdrs':
            if (log.action === 'UPDATE') {
              const newValues = log.new_values as any;
              const oldValues = log.old_values as any;
              
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
                  case 'MID_YEAR_SUBMITTED':
                    type = 'review_completed';
                    message = 'submitted mid-year review';
                    priority = 'medium';
                    break;
                  case 'MID_YEAR_APPROVED':
                    type = 'review_completed';
                    message = 'mid-year review approved';
                    priority = 'medium';
                    break;
                  case 'END_YEAR_SUBMITTED':
                    type = 'review_completed';
                    message = 'submitted end-year review';
                    priority = 'medium';
                    break;
                  case 'PLAN_LOCKED':
                    type = 'review_completed';
                    message = 'PDR plan approved';
                    priority = 'medium';
                    break;
                  default:
                    message = `updated PDR status to ${newValues.status.replace('_', ' ').toLowerCase()}`;
                    priority = 'low';
                }
              } else if (newValues?.meeting_booked && !oldValues?.meeting_booked) {
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
              const newValues = log.new_values as any;
              const oldValues = log.old_values as any;
              
              if (newValues?.employee_rating && newValues.employee_rating !== oldValues?.employee_rating) {
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
              const newValues = log.new_values as any;
              const oldValues = log.old_values as any;
              
              if (newValues?.employee_rating && newValues.employee_rating !== oldValues?.employee_rating) {
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
          timestamp: log.created_at,
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
