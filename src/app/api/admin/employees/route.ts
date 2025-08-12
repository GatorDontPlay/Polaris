import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  extractPagination,
  createPaginatedResponse,
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

    const url = new URL(request.url);
    const { page, limit, offset } = extractPagination(url);

    // Extract filters
    const search = url.searchParams.get('search');
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');

    // Build where clause
    const whereClause: any = {
      role: role || 'EMPLOYEE', // Default to employees only
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    // Get total count
    const total = await prisma.user.count({ where: whereClause });

    // Get employees with their PDR data
    const employees = await prisma.user.findMany({
      where: whereClause,
      include: {
        pdrs: {
          include: {
            period: {
              select: {
                name: true,
                startDate: true,
                endDate: true,
              },
            },
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
            _count: {
              select: {
                goals: true,
                behaviors: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      skip: offset,
      take: limit,
    });

    // Process employee data with calculated metrics
    const processedEmployees = employees.map(employee => {
      const pdrs = employee.pdrs;
      const totalPDRs = pdrs.length;
      const completedPDRs = pdrs.filter(pdr => pdr.status === 'COMPLETED').length;
      const latestPDR = pdrs[0] || null;

      // Calculate average rating from completed PDRs
      const completedWithRatings = pdrs.filter(pdr => 
        pdr.status === 'COMPLETED' && pdr.endYearReview?.ceoOverallRating
      );
      const averageRating = completedWithRatings.length > 0
        ? completedWithRatings.reduce((sum, pdr) => 
            sum + (pdr.endYearReview?.ceoOverallRating || 0), 0
          ) / completedWithRatings.length
        : 0;

      // Add calculated fields to PDRs
      const pdrsWithCalc = pdrs.map(pdr => {
        const goalRatings = pdr.goals.filter(g => g.ceoRating).map(g => g.ceoRating!);
        const behaviorRatings = pdr.behaviors.filter(b => b.ceoRating).map(b => b.ceoRating!);

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
