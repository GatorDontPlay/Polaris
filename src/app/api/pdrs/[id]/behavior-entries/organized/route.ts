import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

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
      // For demo mode, return all 6 demo company values with any existing behavior entries
      const demoCompanyValues = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Lean Thinking',
          description: 'We embrace a lean mindset, always seeking ways to eliminate waste and improve productivity. This ensures we deliver optimal results with minimal resources and maximum impact.',
          isActive: true,
          sortOrder: 1,
          createdAt: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Craftsmanship',
          description: 'We take pride in creating high-quality products and services. While we use AI to enhance our capabilities and streamline delivery, it\'s our team\'s creativity, expertise, and attention to detail that shape our solutions.',
          isActive: true,
          sortOrder: 2,
          createdAt: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Value-Centric Innovation',
          description: 'We focus on creating products and services that add significant value to our customers\' lives. Innovation isn\'t just about new ideas, it\'s about delivering meaningful, efficient solutions that solve real-world challenges.',
          isActive: true,
          sortOrder: 3,
          createdAt: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'Blameless Problem-Solving',
          description: 'We approach every challenge with a forward-looking, solution-driven mindset. Instead of assigning blame, we focus on learning, improvement, and taking ownership to move the business forward.',
          isActive: true,
          sortOrder: 4,
          createdAt: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          name: 'Self Reflection',
          description: 'Self Reflection / Development Reflect on your development goals and how you\'d like to grow.',
          isActive: true,
          sortOrder: 5,
          createdAt: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          name: 'CodeFish 3D - Deep Dive Development',
          description: 'You have up to $1000 per financial year to invest in your learning and growth. This could include courses, tools, workshops, or any learning experience that sparks your curiosity and aligns with our goals. We encourage you to share what you learn with the team to create a culture of continuous improvement.',
          isActive: true,
          sortOrder: 6,
          createdAt: new Date(),
        },
      ];

      // Create organized data structure with mock employee entries based on what's shown in the UI
      const organizedData = demoCompanyValues.map(value => {
        // Create mock employee entries for each company value
        const mockEmployeeEntry = {
          id: `demo-employee-entry-${value.id}`,
          pdrId,
          valueId: value.id,
          authorId: 'demo-employee-1',
          authorType: 'EMPLOYEE' as const,
          description: `${value.name} Comments`, // This matches what's shown in the UI
          examples: `Example behaviors demonstrating ${value.name.toLowerCase()}`,
          selfAssessment: `Self reflection on ${value.name.toLowerCase()} development goals and areas for growth.`,
          rating: null,
          comments: null,
          employeeEntryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          value: value,
          author: {
            id: 'demo-employee-1',
            firstName: 'Employee',
            lastName: 'Demo',
            email: 'employee@demo.com',
            role: 'EMPLOYEE',
          },
          employeeEntry: null,
          ceoEntries: [],
        };

        return {
          companyValue: value,
          employeeEntries: [mockEmployeeEntry],
          standaloneCeoEntries: [],
          hasEmployeeEntry: true,
          hasCeoEntry: false,
          totalEntries: 1,
        };
      });

      return createApiResponse(organizedData);
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

    // Get all active company values
    const companyValues = await prisma.companyValue.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Get all behavior entries for this PDR
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

    // Organize behavior entries by company value
    const organizedData = companyValues.map(value => {
      const entries = behaviorEntries.filter(entry => entry.valueId === value.id);
      
      // Separate employee and CEO entries
      const employeeEntries = entries.filter(entry => entry.authorType === 'EMPLOYEE');
      const ceoEntries = entries.filter(entry => entry.authorType === 'CEO');

      // For each employee entry, find its linked CEO entries
      const employeeEntriesWithCeoReviews = employeeEntries.map(employeeEntry => ({
        ...employeeEntry,
        ceoReviews: ceoEntries.filter(ceoEntry => ceoEntry.employeeEntryId === employeeEntry.id),
      }));

      // Also include standalone CEO entries (not linked to any employee entry)
      const standaloneCeoEntries = ceoEntries.filter(ceoEntry => !ceoEntry.employeeEntryId);

      return {
        companyValue: value,
        employeeEntries: employeeEntriesWithCeoReviews,
        standaloneCeoEntries,
        hasEmployeeEntry: employeeEntries.length > 0,
        hasCeoEntry: ceoEntries.length > 0,
        totalEntries: entries.length,
      };
    });

    return createApiResponse(organizedData);
  } catch (error) {
    return handleApiError(error);
  }
}
