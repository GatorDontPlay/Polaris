import { NextRequest, NextResponse } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { goalUpdateSchema } from '@/lib/validations';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/auth';

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
    const goalId = params.id;

    // Validate request body
    const validation = await validateRequestBody(request, goalUpdateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const goalData = validation.data;

    // Get goal with PDR and verify access
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        pdr: {
          include: { user: true },
        },
      },
    });

    if (!goal) {
      return createApiError('Goal not found', 404, 'GOAL_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && goal.pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (goal.pdr.isLocked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // For employees, only allow editing basic fields in DRAFT/SUBMITTED status
    if (user.role !== 'CEO' && !['DRAFT', 'SUBMITTED'].includes(goal.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Prepare update data based on user role
    const updateData: any = {};
    
    if (user.role === 'CEO') {
      // CEO can update any field
      if (goalData.title !== undefined) {updateData.title = goalData.title;}
      if (goalData.description !== undefined) {updateData.description = goalData.description;}
      if (goalData.targetOutcome !== undefined) {updateData.targetOutcome = goalData.targetOutcome;}
      if (goalData.successCriteria !== undefined) {updateData.successCriteria = goalData.successCriteria;}
      if (goalData.priority !== undefined) {updateData.priority = goalData.priority;}
      if (goalData.employeeProgress !== undefined) {updateData.employeeProgress = goalData.employeeProgress;}
      if (goalData.employeeRating !== undefined) {updateData.employeeRating = goalData.employeeRating;}
      if (goalData.ceoComments !== undefined) {updateData.ceoComments = goalData.ceoComments;}
      if (goalData.ceoRating !== undefined) {updateData.ceoRating = goalData.ceoRating;}
    } else {
      // Employee can only update basic fields and self-assessment
      if (goalData.title !== undefined) {updateData.title = goalData.title;}
      if (goalData.description !== undefined) {updateData.description = goalData.description;}
      if (goalData.targetOutcome !== undefined) {updateData.targetOutcome = goalData.targetOutcome;}
      if (goalData.successCriteria !== undefined) {updateData.successCriteria = goalData.successCriteria;}
      if (goalData.priority !== undefined) {updateData.priority = goalData.priority;}
      if (goalData.employeeProgress !== undefined) {updateData.employeeProgress = goalData.employeeProgress;}
      if (goalData.employeeRating !== undefined) {updateData.employeeRating = goalData.employeeRating;}
    }

    // Update the goal
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      tableName: 'goals',
      recordId: goalId,
      action: 'UPDATE',
      oldValues: goal,
      newValues: updatedGoal,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse(updatedGoal);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
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
    const goalId = params.id;

    // Get goal with PDR and verify access
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        pdr: {
          include: { user: true },
        },
      },
    });

    if (!goal) {
      return createApiError('Goal not found', 404, 'GOAL_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && goal.pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (goal.pdr.isLocked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing (only DRAFT and SUBMITTED for employees)
    if (user.role !== 'CEO' && !['DRAFT', 'SUBMITTED'].includes(goal.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Delete the goal
    await prisma.goal.delete({
      where: { id: goalId },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'goals',
      recordId: goalId,
      action: 'DELETE',
      oldValues: goal,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
