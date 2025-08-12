import { NextRequest, NextResponse } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { midYearReviewSchema } from '@/lib/validations';
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
        midYearReview: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    return createApiResponse(pdr.midYearReview);
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
    const validation = await validateRequestBody(request, midYearReviewSchema);
    if (!validation.success) {
      return validation.response;
    }

    const reviewData = validation.data;

    // Get PDR and verify access
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: { 
        user: true,
        midYearReview: true,
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

    // Check if mid-year review already exists
    if (pdr.midYearReview) {
      return createApiError('Mid-year review already exists', 400, 'REVIEW_EXISTS');
    }

    // Check if PDR is in the right status
    if (!['SUBMITTED', 'UNDER_REVIEW', 'MID_YEAR_CHECK'].includes(pdr.status)) {
      return createApiError('PDR status does not allow mid-year review', 400, 'INVALID_STATUS');
    }

    // Create the mid-year review
    const midYearReview = await prisma.midYearReview.create({
      data: {
        pdrId,
        progressSummary: reviewData.progressSummary,
        blockersChallenges: reviewData.blockersChallenges,
        supportNeeded: reviewData.supportNeeded,
        employeeComments: reviewData.employeeComments,
      },
    });

    // Update PDR status to indicate mid-year review is completed
    await prisma.pDR.update({
      where: { id: pdrId },
      data: {
        status: 'MID_YEAR_CHECK',
        currentStep: 5, // Move to end-year step
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'mid_year_reviews',
      recordId: midYearReview.id,
      action: 'INSERT',
      newValues: midYearReview,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse(midYearReview, 201);
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
    const validation = await validateRequestBody(request, midYearReviewSchema);
    if (!validation.success) {
      return validation.response;
    }

    const reviewData = validation.data;

    // Get PDR and verify access
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: { 
        user: true,
        midYearReview: true,
      },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    if (!pdr.midYearReview) {
      return createApiError('Mid-year review not found', 404, 'REVIEW_NOT_FOUND');
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
      if (reviewData.progressSummary !== undefined) updateData.progressSummary = reviewData.progressSummary;
      if (reviewData.blockersChallenges !== undefined) updateData.blockersChallenges = reviewData.blockersChallenges;
      if (reviewData.supportNeeded !== undefined) updateData.supportNeeded = reviewData.supportNeeded;
      if (reviewData.employeeComments !== undefined) updateData.employeeComments = reviewData.employeeComments;
      if (reviewData.ceoFeedback !== undefined) updateData.ceoFeedback = reviewData.ceoFeedback;
    } else {
      // Employee can only update their own fields
      if (reviewData.progressSummary !== undefined) updateData.progressSummary = reviewData.progressSummary;
      if (reviewData.blockersChallenges !== undefined) updateData.blockersChallenges = reviewData.blockersChallenges;
      if (reviewData.supportNeeded !== undefined) updateData.supportNeeded = reviewData.supportNeeded;
      if (reviewData.employeeComments !== undefined) updateData.employeeComments = reviewData.employeeComments;
    }

    // Update the mid-year review
    const updatedReview = await prisma.midYearReview.update({
      where: { id: pdr.midYearReview.id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      tableName: 'mid_year_reviews',
      recordId: pdr.midYearReview.id,
      action: 'UPDATE',
      oldValues: pdr.midYearReview,
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
