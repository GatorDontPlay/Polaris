/**
 * Integration tests for PDR API endpoints
 * Tests the state machine transitions, permissions, and business logic
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { computeAustralianFY } from '@/lib/financial-year';

// Mock auth helper to return test users
jest.mock('@/lib/api-helpers', () => {
  const originalModule = jest.requireActual('@/lib/api-helpers');
  return {
    ...originalModule,
    authenticateRequest: jest.fn(),
  };
});

import { authenticateRequest } from '@/lib/api-helpers';
import { GET as getPDRs, POST as createPDR } from '@/app/api/pdrs/route';
import { POST as submitForReview } from '@/app/api/pdrs/[id]/submit-for-review/route';
import { POST as submitCEOReview } from '@/app/api/pdrs/[id]/submit-ceo-review/route';
import { POST as markAsBooked } from '@/app/api/pdrs/[id]/mark-booked/route';

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;

// Test users
const testEmployee = {
  id: 'emp-1',
  email: 'employee@test.com',
  firstName: 'John',
  lastName: 'Employee',
  role: 'EMPLOYEE' as const,
};

const testCEO = {
  id: 'ceo-1',
  email: 'ceo@test.com',
  firstName: 'Jane',
  lastName: 'CEO',
  role: 'CEO' as const,
};

describe('PDR API Integration Tests', () => {
  let createdPDRId: string;
  
  beforeEach(async () => {
    // Clear test data
    await prisma.notification.deleteMany();
    await prisma.pDR.deleteMany();
    await prisma.user.deleteMany();
    
    // Create test users
    await prisma.user.createMany({
      data: [testEmployee, testCEO],
    });
  });

  afterEach(async () => {
    // Clean up
    await prisma.notification.deleteMany();
    await prisma.pDR.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/pdrs (Create PDR)', () => {
    it('should create a new PDR for employee with correct FY data', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testEmployee,
        response: null as any,
      });

      const request = new NextRequest('http://localhost/api/pdrs', {
        method: 'POST',
      });

      const response = await createPDR(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        userId: testEmployee.id,
        status: 'Created',
        meetingBooked: false,
      });

      // Verify FY fields are set correctly
      const currentFY = computeAustralianFY();
      expect(data.data.fyLabel).toBe(currentFY.label);
      expect(new Date(data.data.fyStartDate)).toEqual(currentFY.startDate);
      expect(new Date(data.data.fyEndDate)).toEqual(currentFY.endDate);

      createdPDRId = data.data.id;
    });

    it('should not allow CEO to create PDR', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testCEO,
        response: null as any,
      });

      const request = new NextRequest('http://localhost/api/pdrs', {
        method: 'POST',
      });

      const response = await createPDR(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Only employees can create PDRs');
    });

    it('should not allow duplicate PDR for same FY', async () => {
      // Create first PDR
      await prisma.pDR.create({
        data: {
          userId: testEmployee.id,
          fyLabel: '2024-2025',
          fyStartDate: new Date('2024-07-01'),
          fyEndDate: new Date('2025-06-30'),
          status: 'Created',
        },
      });

      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testEmployee,
        response: null as any,
      });

      const request = new NextRequest('http://localhost/api/pdrs', {
        method: 'POST',
      });

      const response = await createPDR(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('PDR already exists');
    });
  });

  describe('PDR State Transitions', () => {
    beforeEach(async () => {
      // Create a test PDR with goals and behaviors
      const pdr = await prisma.pDR.create({
        data: {
          userId: testEmployee.id,
          fyLabel: '2024-2025',
          fyStartDate: new Date('2024-07-01'),
          fyEndDate: new Date('2025-06-30'),
          status: 'Created',
        },
      });
      createdPDRId = pdr.id;

      // Add goals and behaviors to satisfy validation
      await prisma.goal.create({
        data: {
          pdrId: createdPDRId,
          title: 'Test Goal',
          description: 'Test goal description',
          priority: 'HIGH',
        },
      });

      // Need to create a company value first
      const companyValue = await prisma.companyValue.create({
        data: {
          name: 'Test Value',
          description: 'Test company value',
          sortOrder: 1,
        },
      });

      await prisma.behavior.create({
        data: {
          pdrId: createdPDRId,
          valueId: companyValue.id,
          description: 'Test behavior',
          employeeSelfAssessment: 'Test assessment',
        },
      });
    });

    describe('Employee Submit for Review', () => {
      it('should allow employee to submit PDR for review', async () => {
        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testEmployee,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/submit-for-review`, {
          method: 'POST',
        });

        const response = await submitForReview(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('open for review');
        expect(data.data.submittedAt).toBeTruthy();
      });

      it('should not allow CEO to submit employee PDR for review', async () => {
        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testCEO,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/submit-for-review`, {
          method: 'POST',
        });

        const response = await submitForReview(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Only employees can submit PDRs for review');
      });

      it('should validate required fields before submission', async () => {
        // Create PDR without goals
        const emptyPDR = await prisma.pDR.create({
          data: {
            userId: testEmployee.id,
            fyLabel: '2024-2025',
            fyStartDate: new Date('2024-07-01'),
            fyEndDate: new Date('2025-06-30'),
            status: 'Created',
          },
        });

        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testEmployee,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${emptyPDR.id}/submit-for-review`, {
          method: 'POST',
        });

        const response = await submitForReview(request, { params: { id: emptyPDR.id } });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Validation failed');
      });
    });

    describe('CEO Submit Review', () => {
      beforeEach(async () => {
        // Move PDR to "open for review" status first
        await prisma.pDR.update({
          where: { id: createdPDRId },
          data: { status: 'open for review', submittedAt: new Date() },
        });

        // Add CEO comments to satisfy validation
        await prisma.goal.updateMany({
          where: { pdrId: createdPDRId },
          data: { ceoComments: 'CEO feedback on goal' },
        });

        await prisma.behavior.updateMany({
          where: { pdrId: createdPDRId },
          data: { ceoComments: 'CEO feedback on behavior' },
        });
      });

      it('should allow CEO to submit review and lock PDR', async () => {
        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testCEO,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/submit-ceo-review`, {
          method: 'POST',
        });

        const response = await submitCEOReview(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('Plan - Locked');
        expect(data.data.isLocked).toBe(true);
        expect(data.data.lockedAt).toBeTruthy();
        expect(data.data.lockedBy).toBe(testCEO.id);

        // Verify notification was created
        const notification = await prisma.notification.findFirst({
          where: {
            userId: testEmployee.id,
            pdrId: createdPDRId,
            type: 'PDR_LOCKED',
          },
        });
        expect(notification).toBeTruthy();
        expect(notification?.message).toContain('Jane CEO has locked your review');
      });

      it('should not allow employee to submit CEO review', async () => {
        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testEmployee,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/submit-ceo-review`, {
          method: 'POST',
        });

        const response = await submitCEOReview(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Only CEOs can submit reviews');
      });

      it('should validate CEO comments before submission', async () => {
        // Remove CEO comments
        await prisma.goal.updateMany({
          where: { pdrId: createdPDRId },
          data: { ceoComments: null },
        });

        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testCEO,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/submit-ceo-review`, {
          method: 'POST',
        });

        const response = await submitCEOReview(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Validation failed');
      });
    });

    describe('CEO Mark as Booked', () => {
      beforeEach(async () => {
        // Move PDR to "Plan - Locked" status
        await prisma.pDR.update({
          where: { id: createdPDRId },
          data: { 
            status: 'Plan - Locked',
            isLocked: true,
            lockedAt: new Date(),
            lockedBy: testCEO.id,
          },
        });
      });

      it('should allow CEO to mark PDR meeting as booked', async () => {
        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testCEO,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/mark-booked`, {
          method: 'POST',
        });

        const response = await markAsBooked(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('PDR_Booked');
        expect(data.data.meetingBooked).toBe(true);
        expect(data.data.meetingBookedAt).toBeTruthy();
      });

      it('should be idempotent when marking already booked PDR', async () => {
        // First booking
        await prisma.pDR.update({
          where: { id: createdPDRId },
          data: { 
            status: 'PDR_Booked',
            meetingBooked: true,
            meetingBookedAt: new Date(),
          },
        });

        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testCEO,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/mark-booked`, {
          method: 'POST',
        });

        const response = await markAsBooked(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('PDR_Booked');
      });

      it('should not allow employee to mark PDR as booked', async () => {
        mockAuthenticateRequest.mockResolvedValue({
          success: true,
          user: testEmployee,
          response: null as any,
        });

        const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/mark-booked`, {
          method: 'POST',
        });

        const response = await markAsBooked(request, { params: { id: createdPDRId } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Only CEOs can mark meetings as booked');
      });
    });
  });

  describe('Invalid State Transitions', () => {
    beforeEach(async () => {
      const pdr = await prisma.pDR.create({
        data: {
          userId: testEmployee.id,
          fyLabel: '2024-2025',
          fyStartDate: new Date('2024-07-01'),
          fyEndDate: new Date('2025-06-30'),
          status: 'Created',
        },
      });
      createdPDRId = pdr.id;
    });

    it('should not allow CEO to submit review on Created PDR', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testCEO,
        response: null as any,
      });

      const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/submit-ceo-review`, {
        method: 'POST',
      });

      const response = await submitCEOReview(request, { params: { id: createdPDRId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid transition');
    });

    it('should not allow marking as booked from Created status', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testCEO,
        response: null as any,
      });

      const request = new NextRequest(`http://localhost/api/pdrs/${createdPDRId}/mark-booked`, {
        method: 'POST',
      });

      const response = await markAsBooked(request, { params: { id: createdPDRId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid transition');
    });
  });

  describe('GET /api/pdrs (List PDRs)', () => {
    beforeEach(async () => {
      // Create test PDRs in different states
      await prisma.pDR.createMany({
        data: [
          {
            userId: testEmployee.id,
            fyLabel: '2024-2025',
            fyStartDate: new Date('2024-07-01'),
            fyEndDate: new Date('2025-06-30'),
            status: 'Created',
          },
          {
            userId: testEmployee.id,
            fyLabel: '2023-2024',
            fyStartDate: new Date('2023-07-01'),
            fyEndDate: new Date('2024-06-30'),
            status: 'open for review',
          },
        ],
      });
    });

    it('should return employee PDRs for employee user', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testEmployee,
        response: null as any,
      });

      const request = new NextRequest('http://localhost/api/pdrs', {
        method: 'GET',
      });

      const response = await getPDRs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data.every((pdr: any) => pdr.userId === testEmployee.id)).toBe(true);
    });

    it('should return all PDRs for CEO user', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testCEO,
        response: null as any,
      });

      const request = new NextRequest('http://localhost/api/pdrs', {
        method: 'GET',
      });

      const response = await getPDRs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
    });

    it('should filter PDRs by status', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: true,
        user: testCEO,
        response: null as any,
      });

      const request = new NextRequest('http://localhost/api/pdrs?status=Created', {
        method: 'GET',
      });

      const response = await getPDRs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('Created');
    });
  });
});
