import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

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

    // Get current active period
    const activePeriod = await prisma.pDRPeriod.findFirst({
      where: { isActive: true },
    });

    // Fetch all statistics
    const [
      totalEmployees,
      allPDRs,
      recentActivity,
    ] = await Promise.all([
      // Total employees count
      prisma.user.count({
        where: { 
          role: 'EMPLOYEE',
          isActive: true,
        },
      }),

      // All PDRs with relations for analysis
      prisma.pDR.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          period: true,
          goals: {
            select: {
              employeeRating: true,
              ceoRating: true,
            },
          },
          behaviors: {
            select: {
              employeeRating: true,
              ceoRating: true,
            },
          },
          endYearReview: {
            select: {
              employeeOverallRating: true,
              ceoOverallRating: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50, // Limit for performance
      }),

      // Recent activity from audit logs - Global system-wide activity for CEO view
      prisma.auditLog.findMany({
        where: {
          tableName: { 
            in: ['pdrs', 'goals', 'behaviors', 'mid_year_reviews', 'end_year_reviews', 'users'] 
          },
          changedAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Last 14 days for better global view
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { changedAt: 'desc' },
        take: 50, // More activities for comprehensive CEO dashboard
      }),
    ]);

    // Calculate statistics
    const pendingReviews = allPDRs.filter(pdr => 
      ['SUBMITTED', 'UNDER_REVIEW'].includes(pdr.status)
    ).length;

    const completedPDRs = allPDRs.filter(pdr => 
      pdr.status === 'COMPLETED'
    ).length;

    const overduePDRs = allPDRs.filter(pdr => {
      if (!activePeriod || pdr.status === 'COMPLETED') {return false;}
      
      // Calculate if PDR is overdue based on period end date
      const daysSinceEnd = Math.floor(
        (Date.now() - activePeriod.endDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceEnd > 30; // Overdue if more than 30 days past period end
    }).length;

    // Calculate average ratings
    const completedPDRsWithRatings = allPDRs.filter(pdr => 
      pdr.status === 'COMPLETED' && pdr.endYearReview?.ceoOverallRating
    );
    
    const averageRating = completedPDRsWithRatings.length > 0
      ? completedPDRsWithRatings.reduce((sum, pdr) => 
          sum + (pdr.endYearReview?.ceoOverallRating || 0), 0
        ) / completedPDRsWithRatings.length
      : 0;

    // Calculate average goal ratings
    const allGoalRatings = allPDRs.flatMap(pdr => 
      pdr.goals.filter(g => g.ceoRating).map(g => g.ceoRating!)
    );
    const averageGoalRating = allGoalRatings.length > 0
      ? allGoalRatings.reduce((sum, rating) => sum + rating, 0) / allGoalRatings.length
      : 0;

    // Calculate average behavior ratings
    const allBehaviorRatings = allPDRs.flatMap(pdr => 
      pdr.behaviors.filter(b => b.ceoRating).map(b => b.ceoRating!)
    );
    const averageBehaviorRating = allBehaviorRatings.length > 0
      ? allBehaviorRatings.reduce((sum, rating) => sum + rating, 0) / allBehaviorRatings.length
      : 0;

    // Status distribution
    const statusCounts = allPDRs.reduce((acc, pdr) => {
      acc[pdr.status] = (acc[pdr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: allPDRs.length > 0 ? Math.round((count / allPDRs.length) * 100) : 0,
    }));

    // Process recent activity - Global view for CEO showing ALL employee activities
    const processedActivity = recentActivity.map(log => {
      let type: string = 'general';
      let message = '';
      let priority: 'low' | 'medium' | 'high' = 'low';

      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown User';

      switch (log.tableName) {
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
            } else if (newValues.currentStep && oldValues.currentStep !== newValues.currentStep) {
              type = 'progress_update';
              message = `progressed to step ${newValues.currentStep} of their PDR`;
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
            const newValues = log.newValues as any;
            if (newValues.employeeRating) {
              type = 'goal_self_rated';
              message = `completed self-rating for a goal`;
              priority = 'low';
            } else if (newValues.ceoRating) {
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
            const newValues = log.newValues as any;
            if (newValues.employeeRating) {
              type = 'behavior_self_rated';
              message = `completed self-rating for behaviors`;
              priority = 'low';
            } else if (newValues.ceoRating) {
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
            const newValues = log.newValues as any;
            if (newValues.employeeOverallRating) {
              type = 'end_year_self_completed';
              message = `completed their end-year self-assessment`;
              priority = 'medium';
            } else if (newValues.ceoOverallRating) {
              type = 'end_year_ceo_completed';
              message = `end-year review completed by CEO`;
              priority = 'low';
            }
          }
          break;
          
        case 'users':
          if (log.action === 'INSERT') {
            const newValues = log.newValues as any;
            if (newValues.role === 'EMPLOYEE') {
              type = 'employee_created';
              message = `new employee account created`;
              priority = 'medium';
            }
          } else if (log.action === 'UPDATE') {
            const oldValues = log.oldValues as any;
            const newValues = log.newValues as any;
            if (oldValues.isActive !== newValues.isActive) {
              if (newValues.isActive) {
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
        user: log.user || { id: '', firstName: 'Unknown', lastName: 'User', email: '' },
        message,
        timestamp: log.changedAt,
        priority,
      };
    }).filter(activity => activity.message); // Only include activities with messages

    // Get pending reviews for quick access - Global view of ALL employees needing CEO attention
    const pendingReviewPDRs = allPDRs
      .filter(pdr => {
        // Include any PDR that needs CEO attention across the entire organization
        return ['SUBMITTED', 'UNDER_REVIEW', 'PLAN_LOCKED'].includes(pdr.status) ||
               (pdr.status === 'OPEN_FOR_REVIEW' && !pdr.isLocked);
      })
      .sort((a, b) => {
        // Sort by urgency: oldest submissions first, then by status priority
        const aDate = new Date(a.submittedAt || a.updatedAt).getTime();
        const bDate = new Date(b.submittedAt || b.updatedAt).getTime();
        return aDate - bDate; // Oldest first for urgency
      })
      .slice(0, 15); // Show more pending reviews for comprehensive CEO view

    const dashboardData = {
      stats: {
        totalEmployees,
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
