import { NextRequest, NextResponse } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { endYearReviewSchema } from '@/lib/validations';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;

    // Get PDR and verify access
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: { 
        user: true,
        endYearReview: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    return createApiResponse(pdr.endYearReview);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;

    // Validate request body
    const validation = await validateRequestBody(request, endYearReviewSchema);
    if (!validation.success) {
      return validation.response;
    }

    const reviewData = validation.data;

    // Get PDR and verify access
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: { 
        user: true,
        endYearReview: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (pdr.isLocked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if end-year review already exists
    if (pdr.endYearReview) {
      return createApiError('End-year review already exists', 400, 'REVIEW_EXISTS');
    }

    // Check if PDR is in the right status
    if (!['MID_YEAR_CHECK', 'END_YEAR_REVIEW'].includes(pdr.status)) {
      return createApiError('PDR status does not allow end-year review', 400, 'INVALID_STATUS');
    }

    // Create the end-year review
    const endYearReview = await prisma.endYearReview.create({
      data: {
        pdrId,
        achievementsSummary: reviewData.achievementsSummary,
        learningsGrowth: reviewData.learningsGrowth,
        challengesFaced: reviewData.challengesFaced,
        nextYearGoals: reviewData.nextYearGoals,
        employeeOverallRating: reviewData.employeeOverallRating,
      },
    });

    // Update PDR status to completed
    await prisma.pDR.update({
      where: { id: pdrId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'end_year_reviews',
      recordId: endYearReview.id,
      action: 'INSERT',
      newValues: endYearReview,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse(endYearReview, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;

    // Validate request body
    const validation = await validateRequestBody(request, endYearReviewSchema);
    if (!validation.success) {
      return validation.response;
    }

    const reviewData = validation.data;

    // Get PDR and verify access
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: { 
        user: true,
        endYearReview: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    if (!pdr.endYearReview) {
      return createApiError('End-year review not found', 404, 'REVIEW_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (pdr.isLocked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Prepare update data based on user role
    const updateData: any = {};
    
    if (user.role === 'CEO') {
      // CEO can update any field
      if (reviewData.achievementsSummary !== undefined) updateData.achievementsSummary = reviewData.achievementsSummary;
      if (reviewData.learningsGrowth !== undefined) updateData.learningsGrowth = reviewData.learningsGrowth;
      if (reviewData.challengesFaced !== undefined) updateData.challengesFaced = reviewData.challengesFaced;
      if (reviewData.nextYearGoals !== undefined) updateData.nextYearGoals = reviewData.nextYearGoals;
      if (reviewData.employeeOverallRating !== undefined) updateData.employeeOverallRating = reviewData.employeeOverallRating;
      if (reviewData.ceoOverallRating !== undefined) updateData.ceoOverallRating = reviewData.ceoOverallRating;
      if (reviewData.ceoFinalComments !== undefined) updateData.ceoFinalComments = reviewData.ceoFinalComments;
    } else {
      // Employee can only update their own fields (if not completed)
      if (pdr.status !== 'COMPLETED') {
        if (reviewData.achievementsSummary !== undefined) updateData.achievementsSummary = reviewData.achievementsSummary;
        if (reviewData.learningsGrowth !== undefined) updateData.learningsGrowth = reviewData.learningsGrowth;
        if (reviewData.challengesFaced !== undefined) updateData.challengesFaced = reviewData.challengesFaced;
        if (reviewData.nextYearGoals !== undefined) updateData.nextYearGoals = reviewData.nextYearGoals;
        if (reviewData.employeeOverallRating !== undefined) updateData.employeeOverallRating = reviewData.employeeOverallRating;
      }
    }

    // Update the end-year review
    const updatedReview = await prisma.endYearReview.update({
      where: { id: pdr.endYearReview.id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      tableName: 'end_year_reviews',
      recordId: pdr.endYearReview.id,
      action: 'UPDATE',
      oldValues: pdr.endYearReview,
      newValues: updatedReview,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse(updatedReview);
  } catch (error) {
    return handleApiError(error);
  }
}
