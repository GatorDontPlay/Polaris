import { NextRequest, NextResponse } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { behaviorUpdateSchema } from '@/lib/validations';
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
    const behaviorId = params.id;

    // Validate request body
    const validation = await validateRequestBody(request, behaviorUpdateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const behaviorData = validation.data;

    // Get behavior with PDR and verify access
    const behavior = await prisma.behavior.findUnique({
      where: { id: behaviorId },
      include: {
        pdr: {
          include: { user: true },
        },
        value: true,
      },
    });

    if (!behavior) {
      return createApiError('Behavior not found', 404, 'BEHAVIOR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && behavior.pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (behavior.pdr.isLocked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // For employees, only allow editing basic fields in DRAFT/SUBMITTED status
    if (user.role !== 'CEO' && !['DRAFT', 'SUBMITTED'].includes(behavior.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // If valueId is being changed, verify the new company value
    if (behaviorData.valueId && behaviorData.valueId !== behavior.valueId) {
      const companyValue = await prisma.companyValue.findUnique({
        where: { id: behaviorData.valueId },
      });

      if (!companyValue || !companyValue.isActive) {
        return createApiError('Invalid or inactive company value', 400, 'INVALID_COMPANY_VALUE');
      }

      // Check if behavior already exists for this value in the same PDR
      const existingBehavior = await prisma.behavior.findFirst({
        where: {
          pdrId: behavior.pdrId,
          valueId: behaviorData.valueId,
          id: { not: behaviorId }, // Exclude current behavior
        },
      });

      if (existingBehavior) {
        return createApiError('Behavior already exists for this company value', 400, 'BEHAVIOR_EXISTS');
      }
    }

    // Prepare update data based on user role
    const updateData: any = {};
    
    if (user.role === 'CEO') {
      // CEO can update any field
      if (behaviorData.valueId !== undefined) updateData.valueId = behaviorData.valueId;
      if (behaviorData.description !== undefined) updateData.description = behaviorData.description;
      if (behaviorData.examples !== undefined) updateData.examples = behaviorData.examples;
      if (behaviorData.employeeSelfAssessment !== undefined) updateData.employeeSelfAssessment = behaviorData.employeeSelfAssessment;
      if (behaviorData.employeeRating !== undefined) updateData.employeeRating = behaviorData.employeeRating;
      if (behaviorData.ceoComments !== undefined) updateData.ceoComments = behaviorData.ceoComments;
      if (behaviorData.ceoRating !== undefined) updateData.ceoRating = behaviorData.ceoRating;
    } else {
      // Employee can only update basic fields and self-assessment
      if (behaviorData.valueId !== undefined) updateData.valueId = behaviorData.valueId;
      if (behaviorData.description !== undefined) updateData.description = behaviorData.description;
      if (behaviorData.examples !== undefined) updateData.examples = behaviorData.examples;
      if (behaviorData.employeeSelfAssessment !== undefined) updateData.employeeSelfAssessment = behaviorData.employeeSelfAssessment;
      if (behaviorData.employeeRating !== undefined) updateData.employeeRating = behaviorData.employeeRating;
    }

    // Update the behavior
    const updatedBehavior = await prisma.behavior.update({
      where: { id: behaviorId },
      data: updateData,
      include: {
        value: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'behaviors',
      recordId: behaviorId,
      action: 'UPDATE',
      oldValues: behavior,
      newValues: updatedBehavior,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse(updatedBehavior);
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
    const behaviorId = params.id;

    // Get behavior with PDR and verify access
    const behavior = await prisma.behavior.findUnique({
      where: { id: behaviorId },
      include: {
        pdr: {
          include: { user: true },
        },
        value: true,
      },
    });

    if (!behavior) {
      return createApiError('Behavior not found', 404, 'BEHAVIOR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && behavior.pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked
    if (behavior.pdr.isLocked) {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing (only DRAFT and SUBMITTED for employees)
    if (user.role !== 'CEO' && !['DRAFT', 'SUBMITTED'].includes(behavior.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Delete the behavior
    await prisma.behavior.delete({
      where: { id: behaviorId },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'behaviors',
      recordId: behaviorId,
      action: 'DELETE',
      oldValues: behavior,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
