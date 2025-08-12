import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { goalSchema } from '@/lib/validations';
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

    // Get goals for this PDR
    const goals = await prisma.goal.findMany({
      where: { pdrId },
      orderBy: [
        { priority: 'asc' }, // HIGH first, then MEDIUM, then LOW
        { createdAt: 'asc' },
      ],
    });

    return createApiResponse(goals);
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
    const validation = await validateRequestBody(request, goalSchema);
    if (!validation.success) {
      return validation.response;
    }

    const goalData = validation.data;

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

    // Create the goal
    const goal = await prisma.goal.create({
      data: {
        pdrId,
        title: goalData.title,
        description: goalData.description || null,
        targetOutcome: goalData.targetOutcome || null,
        successCriteria: goalData.successCriteria || null,
        priority: goalData.priority || 'MEDIUM',
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'goals',
      recordId: goal.id,
      action: 'INSERT',
      newValues: goal,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(goal, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
