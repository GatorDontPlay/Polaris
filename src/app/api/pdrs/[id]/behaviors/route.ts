import { NextRequest, NextResponse } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { behaviorSchema } from '@/lib/validations';
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
      include: { user: true },
    });

    if (!pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check access permissions
    if (user.role !== 'CEO' && pdr.userId !== user.id) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Get behaviors for this PDR with company values
    const behaviors = await prisma.behavior.findMany({
      where: { pdrId },
      include: {
        value: true,
      },
      orderBy: [
        { value: { sortOrder: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    return createApiResponse(behaviors);
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
    const validation = await validateRequestBody(request, behaviorSchema);
    if (!validation.success) {
      return validation.response;
    }

    const behaviorData = validation.data;

    // Get PDR and verify access
    const pdr = await prisma.pDR.findUnique({
      where: { id: pdrId },
      include: { user: true },
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

    // Check if PDR allows editing (only DRAFT and SUBMITTED)
    if (!['DRAFT', 'SUBMITTED'].includes(pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Verify the company value exists and is active
    const companyValue = await prisma.companyValue.findUnique({
      where: { id: behaviorData.valueId },
    });

    if (!companyValue || !companyValue.isActive) {
      return createApiError('Invalid or inactive company value', 400, 'INVALID_COMPANY_VALUE');
    }

    // Check if behavior already exists for this value
    const existingBehavior = await prisma.behavior.findFirst({
      where: {
        pdrId,
        valueId: behaviorData.valueId,
      },
    });

    if (existingBehavior) {
      return createApiError('Behavior already exists for this company value', 400, 'BEHAVIOR_EXISTS');
    }

    // Create the behavior
    const behavior = await prisma.behavior.create({
      data: {
        pdrId,
        valueId: behaviorData.valueId,
        description: behaviorData.description,
        examples: behaviorData.examples,
      },
      include: {
        value: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'behaviors',
      recordId: behavior.id,
      action: 'INSERT',
      newValues: behavior,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return createApiResponse(behavior, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
