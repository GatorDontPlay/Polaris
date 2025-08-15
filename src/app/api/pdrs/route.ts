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
import { computeAustralianFY } from '@/lib/financial-year';
import { getPDRPermissions } from '@/lib/pdr-state-machine';

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

    // Build where clause based on user role
    const whereClause: Record<string, unknown> = user.role === 'CEO' 
      ? {} // CEO can see all PDRs
      : { userId: user.id }; // Employee only sees their own PDRs

    // Add additional filters
    const status = url.searchParams.get('status');
    const periodId = url.searchParams.get('period');
    const search = url.searchParams.get('search');

    if (status) {
      whereClause.status = status;
    }

    if (periodId) {
      whereClause.periodId = periodId;
    }

    if (search && user.role === 'CEO') {
      whereClause.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await prisma.pDR.count({ where: whereClause });

    // Get PDRs with relations
    const pdrs = await prisma.pDR.findMany({
      where: whereClause,
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
            id: true,
            title: true,
            priority: true,
            employeeRating: true,
            ceoRating: true,
          },
        },
        behaviors: {
          select: {
            id: true,
            employeeRating: true,
            ceoRating: true,
          },
        },
        midYearReview: {
          select: {
            id: true,
            submittedAt: true,
          },
        },
        endYearReview: {
          select: {
            id: true,
            submittedAt: true,
            employeeOverallRating: true,
            ceoOverallRating: true,
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    });

    const response = createPaginatedResponse(pdrs, total, page, limit);
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;

    // Only employees can create PDRs
    if (user.role !== 'EMPLOYEE') {
      return createApiError('Only employees can create PDRs', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Compute Australian Financial Year for current date
    const currentFY = computeAustralianFY();

    // Check if user already has a PDR for this FY
    const existingPDR = await prisma.pDR.findUnique({
      where: {
        userId_fyLabel: {
          userId: user.id,
          fyLabel: currentFY.label,
        },
      },
    });

    if (existingPDR) {
      return createApiError(`PDR already exists for Financial Year ${currentFY.label}`, 400, 'PDR_EXISTS');
    }

    // Create new PDR with FY fields
    const pdr = await prisma.pDR.create({
      data: {
        userId: user.id,
        fyLabel: currentFY.label,
        fyStartDate: currentFY.startDate,
        fyEndDate: currentFY.endDate,
        status: 'Created',
        currentStep: 1,
        isLocked: false,
        meetingBooked: false,
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
        period: true,
      },
    });

    return createApiResponse(pdr, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
