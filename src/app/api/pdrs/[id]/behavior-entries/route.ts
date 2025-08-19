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

// Validation schema for behavior entry
const behaviorEntrySchema = z.object({
  valueId: z.string().min(1), // Allow demo IDs that aren't UUIDs
  authorType: z.enum(['EMPLOYEE', 'CEO']),
  description: z.string().optional(), // Made optional since CEO entries might not have a modified description
  examples: z.string().optional(),
  selfAssessment: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comments: z.string().optional(),
  employeeEntryId: z.string().min(1).optional(), // Allow demo IDs that aren't UUIDs
}).refine((data) => {
  // For employee entries, description is required
  if (data.authorType === 'EMPLOYEE') {
    return data.description && data.description.length > 0;
  }
  // For CEO entries, description is optional
  return true;
}, {
  message: "Description is required for employee entries",
  path: ["description"],
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pdrId = params.id;
    
    // Check if this is demo mode
    const isDemoMode = pdrId.startsWith('demo-pdr-');
    
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

    if (isDemoMode) {
      // For demo mode, return empty behavior entries since we don't have real data yet
      return createApiResponse([]);
    }

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

    // Get behavior entries for this PDR with related data
    const behaviorEntries = await prisma.behaviorEntry.findMany({
      where: { pdrId },
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
      orderBy: [
        { value: { sortOrder: 'asc' } },
        { authorType: 'asc' }, // EMPLOYEE first, then CEO
        { createdAt: 'asc' },
      ],
    });

    return createApiResponse(behaviorEntries);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pdrId = params.id;
    
    // Check if this is demo mode
    const isDemoMode = pdrId.startsWith('demo-pdr-');
    
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
    const validation = await validateRequestBody(request, behaviorEntrySchema);
    if (!validation.success) {
      return validation.response;
    }

    const entryData = validation.data;

    if (isDemoMode) {
      // For demo mode, return a mock created entry
      const mockEntry = {
        id: `demo-behavior-entry-${Date.now()}`,
        pdrId,
        valueId: entryData.valueId,
        authorId: user.id,
        authorType: entryData.authorType,
        description: entryData.description,
        examples: entryData.examples || null,
        selfAssessment: entryData.selfAssessment || null,
        rating: entryData.rating || null,
        comments: entryData.comments || null,
        employeeEntryId: entryData.employeeEntryId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        value: {
          id: entryData.valueId,
          name: 'Demo Company Value',
          description: 'Demo description',
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

      return createApiResponse(mockEntry, 201);
    }

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

    // Check if PDR is locked (only for employee entries, CEO can always add reviews)
    if (pdr.isLocked && entryData.authorType === 'EMPLOYEE') {
      return createApiError('PDR is locked and cannot be modified', 400, 'PDR_LOCKED');
    }

    // Check if PDR allows editing for employees
    if (entryData.authorType === 'EMPLOYEE' && !['DRAFT', 'SUBMITTED'].includes(pdr.status)) {
      return createApiError('PDR status does not allow editing', 400, 'INVALID_STATUS');
    }

    // Verify the user can create this type of entry
    if (entryData.authorType === 'EMPLOYEE' && user.role !== 'EMPLOYEE' && pdr.userId !== user.id) {
      return createApiError('Only the PDR owner can create employee entries', 403, 'INVALID_AUTHOR');
    }

    if (entryData.authorType === 'CEO' && user.role !== 'CEO') {
      return createApiError('Only CEOs can create CEO entries', 403, 'INVALID_AUTHOR');
    }

    // Verify the company value exists and is active
    const companyValue = await prisma.companyValue.findUnique({
      where: { id: entryData.valueId },
    });

    if (!companyValue || !companyValue.isActive) {
      return createApiError('Invalid or inactive company value', 400, 'INVALID_COMPANY_VALUE');
    }

    // For CEO entries, verify the employee entry exists
    if (entryData.authorType === 'CEO' && entryData.employeeEntryId) {
      const employeeEntry = await prisma.behaviorEntry.findUnique({
        where: { id: entryData.employeeEntryId },
      });

      if (!employeeEntry || employeeEntry.pdrId !== pdrId || employeeEntry.authorType !== 'EMPLOYEE') {
        return createApiError('Invalid employee entry reference', 400, 'INVALID_EMPLOYEE_ENTRY');
      }
    }

    // Check if entry already exists for this combination
    const existingEntry = await prisma.behaviorEntry.findFirst({
      where: {
        pdrId,
        valueId: entryData.valueId,
        authorId: user.id,
        authorType: entryData.authorType,
      },
    });

    if (existingEntry) {
      return createApiError('Behavior entry already exists for this combination', 400, 'ENTRY_EXISTS');
    }

    // Create the behavior entry
    const behaviorEntry = await prisma.behaviorEntry.create({
      data: {
        pdrId,
        valueId: entryData.valueId,
        authorId: user.id,
        authorType: entryData.authorType,
        description: entryData.description || '', // Use empty string if description is undefined
        examples: entryData.examples || null,
        selfAssessment: entryData.selfAssessment || null,
        rating: entryData.rating || null,
        comments: entryData.comments || null,
        employeeEntryId: entryData.employeeEntryId || null,
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
      },
    });

    // Create audit log
    await createAuditLog({
      tableName: 'behavior_entries',
      recordId: behaviorEntry.id,
      action: 'INSERT',
      newValues: behaviorEntry,
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse(behaviorEntry, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
