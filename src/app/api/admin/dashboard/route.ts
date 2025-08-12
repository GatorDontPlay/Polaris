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

      // Recent activity from audit logs
      prisma.auditLog.findMany({
        where: {
          tableName: { in: ['pdrs', 'goals', 'behaviors', 'mid_year_reviews', 'end_year_reviews'] },
          changedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { changedAt: 'desc' },
        take: 20,
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

    // Process recent activity
    const processedActivity = recentActivity.map(log => {
      let type: string = 'general';
      let message = '';
      let priority: 'low' | 'medium' | 'high' = 'low';

      switch (log.tableName) {
        case 'pdrs':
          if (log.action === 'UPDATE') {
            const newStatus = log.newValues as any;
            if (newStatus.status === 'SUBMITTED') {
              type = 'pdr_submitted';
              message = `submitted their PDR for review`;
              priority = 'medium';
            } else if (newStatus.status === 'COMPLETED') {
              type = 'review_completed';
              message = `completed their PDR`;
              priority = 'low';
            }
          }
          break;
        case 'goals':
          if (log.action === 'INSERT') {
            type = 'goal_added';
            message = `added a new goal`;
            priority = 'low';
          }
          break;
        case 'behaviors':
          if (log.action === 'INSERT') {
            type = 'behavior_assessed';
            message = `completed a behavior assessment`;
            priority = 'low';
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

    // Get pending reviews for quick access
    const pendingReviewPDRs = allPDRs
      .filter(pdr => ['SUBMITTED', 'UNDER_REVIEW'].includes(pdr.status))
      .slice(0, 10); // Top 10 pending reviews

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
