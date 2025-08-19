import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
  validateRequestBody,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for updating behavior entry
const updateBehaviorEntrySchema = z.object({
  description: z.string().min(1).optional(),
  examples: z.string().optional(),
  selfAssessment: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comments: z.string().optional(),
});

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
    const entryId = params.id;

    // Get behavior entry with related data
    const behaviorEntry = await prisma.behaviorEntry.findUnique({
      where: { id: entryId },
      include: {
        pdr: {
          include: {
            user: true,
          },
        },
        value: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        employeeEntry: {
          include: {
            value: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        ceoEntries: {
          include: {
            value: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!behaviorEntry) {
      return createApiError('Behavior entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    // Check access permissions
    const canView = user.role === 'CEO' || 
                   behaviorEntry.pdr.userId === user.id || 
                   behaviorEntry.authorId === user.id;

    if (!canView) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    return createApiResponse(behaviorEntry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entryId = params.id;
    
    // Check if this is demo mode
    const isDemoMode = entryId.startsWith('demo-behavior-entry-');
    
    let user;
    if (isDemoMode) {
      // For demo mode, create a mock CEO user
      user = {
        id: 'demo-ceo-1',
        email: 'ceo@demo.com',
        firstName: 'CEO',
        lastName: 'Demo',
        role: 'CEO' as const,
      };
    } else {
      // Authenticate user for production
      const authResult = await authenticateRequest(request);
      if (!authResult.success) {
        return authResult.response;
      }
      user = authResult.user;
    }

    // Validate request body
    const validation = await validateRequestBody(request, updateBehaviorEntrySchema);
    if (!validation.success) {
      return validation.response;
    }

    const updateData = validation.data;

    if (isDemoMode) {
      // For demo mode, return a mock updated entry
      const mockUpdatedEntry = {
        id: entryId,
        pdrId: 'demo-pdr-1755545351311',
        valueId: 'value-1',
        authorId: user.id,
        authorType: 'CEO',
        description: updateData.description || 'Updated description',
        examples: updateData.examples || null,
        selfAssessment: updateData.selfAssessment || null,
        rating: updateData.rating || null,
        comments: updateData.comments || 'Updated comments',
        employeeEntryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        value: {
          id: 'value-1',
          name: 'Innovation',
          description: 'Demo company value',
          isActive: true,
          sortOrder: 1,
          createdAt: new Date(),
        },
        author: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        employeeEntry: null,
        ceoEntries: [],
      };

      return createApiResponse(mockUpdatedEntry);
    }

    // Get behavior entry with PDR data
    const behaviorEntry = await prisma.behaviorEntry.findUnique({
      where: { id: entryId },
      include: {
        pdr: {
          include: {
            user: true,
          },
        },
        author: true,
      },
    });

    if (!behaviorEntry) {
      return createApiError('Behavior entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    // Check access permissions - only the author can update their entry
    if (behaviorEntry.authorId !== user.id) {
      return createApiError('Only the author can update their entry', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked (only affects employee entries)
    if (behaviorEntry.pdr.isLocked && behaviorEntry.authorType === 'EMPLOYEE') {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing for employees
    if (behaviorEntry.authorType === 'EMPLOYEE' && 
        !['DRAFT', 'SUBMITTED'].includes(behaviorEntry.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Store old values for audit log
    const oldValues = {
      description: behaviorEntry.description,
      examples: behaviorEntry.examples,
      selfAssessment: behaviorEntry.selfAssessment,
      rating: behaviorEntry.rating,
      comments: behaviorEntry.comments,
    };

    // Update the behavior entry
    const updatedEntry = await prisma.behaviorEntry.update({
      where: { id: entryId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        value: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        employeeEntry: {
          include: {
            value: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        ceoEntries: {
          include: {
            value: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'behavior_entries',
      recordId: entryId,
      action: 'UPDATE',
      oldValues,
      newValues: updateData,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(updatedEntry);
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
    const entryId = params.id;

    // Get behavior entry with PDR data
    const behaviorEntry = await prisma.behaviorEntry.findUnique({
      where: { id: entryId },
      include: {
        pdr: {
          include: {
            user: true,
          },
        },
        author: true,
        ceoEntries: true, // Check if this employee entry has CEO entries linked to it
      },
    });

    if (!behaviorEntry) {
      return createApiError('Behavior entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    // Check access permissions - only the author or CEO can delete
    const canDelete = behaviorEntry.authorId === user.id || user.role === 'CEO';

    if (!canDelete) {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if PDR is locked (only affects employee entries)
    if (behaviorEntry.pdr.isLocked && behaviorEntry.authorType === 'EMPLOYEE') {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing for employees
    if (behaviorEntry.authorType === 'EMPLOYEE' && 
        !['DRAFT', 'SUBMITTED'].includes(behaviorEntry.pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // If this is an employee entry with CEO entries linked to it, we can't delete it
    if (behaviorEntry.authorType === 'EMPLOYEE' && behaviorEntry.ceoEntries.length > 0) {
      return createApiError('Cannot delete employee entry that has CEO reviews linked to it', 400, 'HAS_LINKED_ENTRIES');
    }

    // Delete the behavior entry
    await prisma.behaviorEntry.delete({
      where: { id: entryId },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'behavior_entries',
      recordId: entryId,
      action: 'DELETE',
      oldValues: behaviorEntry,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse({ message: 'Behavior entry deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
