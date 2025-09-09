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

    // Get current active period
    const { data: activePeriod } = await supabase
      .from('pdr_periods')
      .select('*')
      .eq('is_active', true)
      .single();

    // Fetch all statistics in parallel
    const [
      { count: totalEmployees },
      { data: allPDRs },
      { data: recentActivity },
    ] = await Promise.all([
      // Total employees count
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'EMPLOYEE')
        .eq('is_active', true),

      // All PDRs with relations for analysis
      supabase
        .from('pdrs')
        .select(`
          *,
          user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
          period:pdr_periods(*),
          goals(employee_rating, ceo_rating),
          behaviors(employee_rating, ceo_rating),
          end_year_review:end_year_reviews(employee_overall_rating, ceo_overall_rating)
        `)
        .order('updated_at', { ascending: false })
        .limit(50),

      // Recent activity from audit logs - Global system-wide activity for CEO view
      supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles!audit_logs_user_id_fkey(id, first_name, last_name, email, role)
        `)
        .in('table_name', ['pdrs', 'goals', 'behaviors', 'mid_year_reviews', 'end_year_reviews', 'profiles'])
        .gte('changed_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('changed_at', { ascending: false })
        .limit(50),
    ]);

    // Calculate statistics
    const pendingReviews = allPDRs?.filter(pdr => 
      ['SUBMITTED', 'UNDER_REVIEW'].includes(pdr.status)
    ).length || 0;

    const completedPDRs = allPDRs?.filter(pdr => 
      pdr.status === 'COMPLETED'
    ).length || 0;

    const overduePDRs = allPDRs?.filter(pdr => {
      if (!activePeriod || pdr.status === 'COMPLETED') return false;
      
      // Calculate if PDR is overdue based on period end date
      const daysSinceEnd = Math.floor(
        (Date.now() - new Date(activePeriod.end_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceEnd > 30; // Overdue if more than 30 days past period end
    }).length || 0;

    // Calculate average ratings
    const completedPDRsWithRatings = allPDRs?.filter(pdr => 
      pdr.status === 'COMPLETED' && pdr.end_year_review?.ceo_overall_rating
    ) || [];
    
    const averageRating = completedPDRsWithRatings.length > 0
      ? completedPDRsWithRatings.reduce((sum, pdr) => 
          sum + (pdr.end_year_review?.ceo_overall_rating || 0), 0
        ) / completedPDRsWithRatings.length
      : 0;

    // Calculate average goal ratings
    const allGoalRatings = allPDRs?.flatMap(pdr => 
      pdr.goals?.filter(g => g.ceo_rating).map(g => g.ceo_rating!) || []
    ) || [];
    const averageGoalRating = allGoalRatings.length > 0
      ? allGoalRatings.reduce((sum, rating) => sum + rating, 0) / allGoalRatings.length
      : 0;

    // Calculate average behavior ratings
    const allBehaviorRatings = allPDRs?.flatMap(pdr => 
      pdr.behaviors?.filter(b => b.ceo_rating).map(b => b.ceo_rating!) || []
    ) || [];
    const averageBehaviorRating = allBehaviorRatings.length > 0
      ? allBehaviorRatings.reduce((sum, rating) => sum + rating, 0) / allBehaviorRatings.length
      : 0;

    // Status distribution
    const statusCounts = allPDRs?.reduce((acc, pdr) => {
      acc[pdr.status] = (acc[pdr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: allPDRs?.length ? Math.round((count / allPDRs.length) * 100) : 0,
    }));

    // Process recent activity - Global view for CEO showing ALL employee activities
    const processedActivity = recentActivity?.map(log => {
      let type: string = 'general';
      let message = '';
      let priority: 'low' | 'medium' | 'high' = 'low';

      const userName = log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown User';

      switch (log.table_name) {
        case 'pdrs':
          if (log.action === 'INSERT') {
            type = 'pdr_created';
            message = `started their PDR for the current period`;
            priority = 'low';
          } else if (log.action === 'UPDATE') {
            const oldValues = log.oldValues as any;
            const newValues = log.newValues as any;
            
            if (newValues.status === 'SUBMITTED') {
              type = 'pdr_submitted';
              message = `submitted their PDR for CEO review`;
              priority = 'high';
            } else if (newValues.status === 'UNDER_REVIEW') {
              type = 'under_review';
              message = `PDR is now under CEO review`;
              priority = 'medium';
            } else if (newValues.status === 'COMPLETED') {
              type = 'review_completed';
              message = `PDR review completed by CEO`;
              priority = 'low';
            } else if (newValues.status === 'PLAN_LOCKED') {
              type = 'plan_locked';
              message = `PDR plan locked by CEO`;
              priority = 'medium';
            } else if (newValues.current_step && oldValues.current_step !== newValues.current_step) {
              type = 'progress_update';
              message = `progressed to step ${newValues.current_step} of their PDR`;
              priority = 'low';
            }
          }
          break;
          
        case 'goals':
          if (log.action === 'INSERT') {
            type = 'goal_added';
            message = `added a new goal to their PDR`;
            priority = 'low';
          } else if (log.action === 'UPDATE') {
            const newValues = log.new_values as any;
            if (newValues.employee_rating) {
              type = 'goal_self_rated';
              message = `completed self-rating for a goal`;
              priority = 'low';
            } else if (newValues.ceo_rating) {
              type = 'goal_ceo_rated';
              message = `goal rated by CEO`;
              priority = 'low';
            }
          }
          break;
          
        case 'behaviors':
          if (log.action === 'INSERT') {
            type = 'behavior_assessed';
            message = `completed a behavior assessment`;
            priority = 'low';
          } else if (log.action === 'UPDATE') {
            const newValues = log.new_values as any;
            if (newValues.employee_rating) {
              type = 'behavior_self_rated';
              message = `completed self-rating for behaviors`;
              priority = 'low';
            } else if (newValues.ceo_rating) {
              type = 'behavior_ceo_rated';
              message = `behaviors rated by CEO`;
              priority = 'low';
            }
          }
          break;
          
        case 'mid_year_reviews':
          if (log.action === 'INSERT') {
            type = 'mid_year_started';
            message = `started their mid-year review`;
            priority = 'low';
          } else if (log.action === 'UPDATE') {
            type = 'mid_year_updated';
            message = `updated their mid-year review`;
            priority = 'low';
          }
          break;
          
        case 'end_year_reviews':
          if (log.action === 'INSERT') {
            type = 'end_year_started';
            message = `started their end-year review`;
            priority = 'medium';
          } else if (log.action === 'UPDATE') {
            const newValues = log.new_values as any;
            if (newValues.employee_overall_rating) {
              type = 'end_year_self_completed';
              message = `completed their end-year self-assessment`;
              priority = 'medium';
            } else if (newValues.ceo_overall_rating) {
              type = 'end_year_ceo_completed';
              message = `end-year review completed by CEO`;
              priority = 'low';
            }
          }
          break;
          
        case 'profiles':
          if (log.action === 'INSERT') {
            const newValues = log.new_values as any;
            if (newValues.role === 'EMPLOYEE') {
              type = 'employee_created';
              message = `new employee account created`;
              priority = 'medium';
            }
          } else if (log.action === 'UPDATE') {
            const oldValues = log.old_values as any;
            const newValues = log.new_values as any;
            if (oldValues.is_active !== newValues.is_active) {
              if (newValues.is_active) {
                type = 'employee_activated';
                message = `employee account activated`;
                priority = 'low';
              } else {
                type = 'employee_deactivated';
                message = `employee account deactivated`;
                priority = 'medium';
              }
            }
          }
          break;
      }

      return {
        id: log.id,
        type,
        user: log.user || { id: '', first_name: 'Unknown', last_name: 'User', email: '' },
        message,
        timestamp: log.changed_at,
        priority,
      };
    }).filter(activity => activity.message) || []; // Only include activities with messages

    // Get pending reviews for quick access - Global view of ALL employees needing CEO attention
    const pendingReviewPDRs = allPDRs
      ?.filter(pdr => {
        // Include any PDR that needs CEO attention across the entire organization
        return ['SUBMITTED', 'UNDER_REVIEW', 'PLAN_LOCKED'].includes(pdr.status) ||
               (pdr.status === 'OPEN_FOR_REVIEW' && !pdr.is_locked);
      })
      .sort((a, b) => {
        // Sort by urgency: oldest submissions first, then by status priority
        const aDate = new Date(a.submitted_at || a.updated_at).getTime();
        const bDate = new Date(b.submitted_at || b.updated_at).getTime();
        return aDate - bDate; // Oldest first for urgency
      })
      .slice(0, 15) || []; // Show more pending reviews for comprehensive CEO view

    const dashboardData = {
      stats: {
        totalEmployees: totalEmployees || 0,
        pendingReviews,
        completedPDRs,
        overduePDRs,
        averageRating: Math.round(averageRating * 10) / 10,
        averageGoalRating: Math.round(averageGoalRating * 10) / 10,
        averageBehaviorRating: Math.round(averageBehaviorRating * 10) / 10,
      },
      recentActivity: processedActivity.slice(0, 10),
      pendingReviews: pendingReviewPDRs,
      statusDistribution,
    };

    return createApiResponse(dashboardData);
  } catch (error) {
    return handleApiError(error);
  }
}
