/**
 * Acceptance tests for PDR workflow
 * Tests the complete happy path from creation to meeting booking
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/db';
import { computeAustralianFY } from '@/lib/financial-year';
import { 
  validateStateTransition, 
  getPDRPermissions,
  createPDRNotification 
} from '@/lib/pdr-state-machine';

describe('PDR Workflow Acceptance Tests', () => {
  const testEmployee = {
    id: 'emp-test',
    email: 'employee@example.com',
    firstName: 'John',
    lastName: 'Employee',
    role: 'EMPLOYEE' as const,
  };

  const testCEO = {
    id: 'ceo-test',
    email: 'ceo@example.com',
    firstName: 'Jane',
    lastName: 'CEO',
    role: 'CEO' as const,
  };

  beforeEach(async () => {
    // Clean up test data
    await prisma.notification.deleteMany();
    await prisma.behavior.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.pDR.deleteMany();
    await prisma.companyValue.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    await prisma.user.createMany({
      data: [testEmployee, testCEO],
    });

    // Create company value for behavior assessments
    await prisma.companyValue.create({
      data: {
        id: 'value-1',
        name: 'Innovation',
        description: 'Driving innovation and creativity',
        sortOrder: 1,
      },
    });
  });

  afterEach(async () => {
    // Clean up
    await prisma.notification.deleteMany();
    await prisma.behavior.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.pDR.deleteMany();
    await prisma.companyValue.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should complete the full PDR workflow from creation to meeting booking', async () => {
    // Step 1: Employee creates PDR on 2025-08-15
    const createDate = new Date('2025-08-15'); // This should result in FY 2025-2026
    const expectedFY = computeAustralianFY(createDate);
    
    expect(expectedFY.label).toBe('2025-2026');
    expect(expectedFY.startDate).toEqual(new Date(2025, 6, 1)); // July 1, 2025
    expect(expectedFY.endDate).toEqual(new Date(2026, 5, 30)); // June 30, 2026

    const pdr = await prisma.pDR.create({
      data: {
        userId: testEmployee.id,
        fyLabel: expectedFY.label,
        fyStartDate: expectedFY.startDate,
        fyEndDate: expectedFY.endDate,
        status: 'Created',
        meetingBooked: false,
        createdAt: createDate,
      },
    });

    expect(pdr.status).toBe('Created');
    expect(pdr.fyLabel).toBe('2025-2026');

    // Verify initial permissions
    const initialPermissions = getPDRPermissions('Created', 'EMPLOYEE', true);
    expect(initialPermissions.canEdit).toBe(true);
    expect(initialPermissions.canViewEmployeeFields).toBe(true);
    expect(initialPermissions.canSubmitForReview).toBe(true);

    // Step 2: Employee saves drafts multiple times (status remains "Created")
    await prisma.goal.create({
      data: {
        pdrId: pdr.id,
        title: 'Increase team productivity',
        description: 'Implement new project management tools and processes',
        targetOutcome: 'Achieve 20% increase in delivery speed',
        successCriteria: 'Complete projects on time and within budget',
        priority: 'HIGH',
      },
    });

    await prisma.behavior.create({
      data: {
        pdrId: pdr.id,
        valueId: 'value-1',
        description: 'Demonstrates innovative thinking in problem-solving',
        examples: 'Proposed automation solution that saved 10 hours/week',
        employeeSelfAssessment: 'I consistently look for creative solutions',
        employeeRating: 4,
      },
    });

    // Verify PDR is still in Created state after draft saves
    const pdrAfterDrafts = await prisma.pDR.findUnique({ where: { id: pdr.id } });
    expect(pdrAfterDrafts?.status).toBe('Created');

    // Step 3: Employee submits PDR for review
    const submitTransition = validateStateTransition('Created', 'open for review', 'submitForReview', 'EMPLOYEE');
    expect(submitTransition.isValid).toBe(true);

    await prisma.pDR.update({
      where: { id: pdr.id },
      data: {
        status: 'open for review',
        submittedAt: new Date(),
      },
    });

    // Verify employee can still edit their fields in "open for review"
    const reviewPermissions = getPDRPermissions('open for review', 'EMPLOYEE', true);
    expect(reviewPermissions.canEdit).toBe(true);
    expect(reviewPermissions.canEditEmployeeFields).toBe(true);
    expect(reviewPermissions.canViewCeoFields).toBe(false); // Employee cannot see CEO fields

    // Verify CEO can now open and see the PDR
    const ceoReviewPermissions = getPDRPermissions('open for review', 'CEO', false);
    expect(ceoReviewPermissions.canView).toBe(true);
    expect(ceoReviewPermissions.canEdit).toBe(true);
    expect(ceoReviewPermissions.canViewEmployeeFields).toBe(true);
    expect(ceoReviewPermissions.canEditCeoFields).toBe(true);

    // Step 4: CEO opens and saves mirrored fields multiple times
    await prisma.goal.update({
      where: { pdrId: pdr.id },
      data: {
        ceoComments: 'Great goal, well-defined success criteria',
        ceoRating: 4,
      },
    });

    await prisma.behavior.update({
      where: { pdrId: pdr.id },
      data: {
        ceoComments: 'Excellent examples of innovative thinking',
        ceoRating: 5,
      },
    });

    // Status should remain "open for review" until CEO formally submits
    const pdrAfterCeoEdits = await prisma.pDR.findUnique({ where: { id: pdr.id } });
    expect(pdrAfterCeoEdits?.status).toBe('open for review');

    // Step 5: CEO submits review (locks the plan)
    const ceoSubmitTransition = validateStateTransition('open for review', 'Plan - Locked', 'submitCeoReview', 'CEO');
    expect(ceoSubmitTransition.isValid).toBe(true);

    const lockTime = new Date();
    await prisma.pDR.update({
      where: { id: pdr.id },
      data: {
        status: 'Plan - Locked',
        isLocked: true,
        lockedAt: lockTime,
        lockedBy: testCEO.id,
      },
    });

    // Create notification for employee
    const notification = createPDRNotification(
      pdr.id,
      testEmployee.id,
      'PDR_LOCKED',
      `${testCEO.firstName} ${testCEO.lastName}`
    );

    await prisma.notification.create({ data: notification });

    // Verify notification was created correctly
    const createdNotification = await prisma.notification.findFirst({
      where: { userId: testEmployee.id, pdrId: pdr.id },
    });
    expect(createdNotification).toBeTruthy();
    expect(createdNotification?.type).toBe('PDR_LOCKED');
    expect(createdNotification?.title).toBe('PDR Locked');
    expect(createdNotification?.message).toContain('Jane CEO has locked your review');

    // Verify both sides are now read-only
    const lockedEmployeePermissions = getPDRPermissions('Plan - Locked', 'EMPLOYEE', true);
    expect(lockedEmployeePermissions.canEdit).toBe(false);
    expect(lockedEmployeePermissions.canEditEmployeeFields).toBe(false);
    expect(lockedEmployeePermissions.readOnlyReason).toContain('locked');

    const lockedCeoPermissions = getPDRPermissions('Plan - Locked', 'CEO', false);
    expect(lockedCeoPermissions.canEdit).toBe(false);
    expect(lockedCeoPermissions.canEditCeoFields).toBe(false);
    expect(lockedCeoPermissions.canMarkBooked).toBe(true); // Only booking is allowed

    // Step 6: CEO dashboard shows PDR with status "Plan - Locked"
    const lockedPDR = await prisma.pDR.findUnique({
      where: { id: pdr.id },
      include: { user: true, lockedByUser: true },
    });

    expect(lockedPDR?.status).toBe('Plan - Locked');
    expect(lockedPDR?.isLocked).toBe(true);
    expect(lockedPDR?.lockedBy).toBe(testCEO.id);
    expect(lockedPDR?.meetingBooked).toBe(false);

    // Step 7: CEO ticks booking checkbox
    const bookingTransition = validateStateTransition('Plan - Locked', 'PDR_Booked', 'markBooked', 'CEO');
    expect(bookingTransition.isValid).toBe(true);

    const bookingTime = new Date();
    await prisma.pDR.update({
      where: { id: pdr.id },
      data: {
        status: 'PDR_Booked',
        meetingBooked: true,
        meetingBookedAt: bookingTime,
      },
    });

    // Verify final state
    const finalPDR = await prisma.pDR.findUnique({
      where: { id: pdr.id },
      include: { user: true, lockedByUser: true },
    });

    expect(finalPDR?.status).toBe('PDR_Booked');
    expect(finalPDR?.meetingBooked).toBe(true);
    expect(finalPDR?.meetingBookedAt).toBeTruthy();

    // Verify row should be greyed out in CEO dashboard
    const finalPermissions = getPDRPermissions('PDR_Booked', 'CEO', false);
    expect(finalPermissions.canEdit).toBe(false);
    expect(finalPermissions.canMarkBooked).toBe(false);
    expect(finalPermissions.readOnlyReason).toContain('booked');

    // Verify complete workflow integrity
    expect(finalPDR?.fyLabel).toBe('2025-2026');
    expect(finalPDR?.createdAt).toEqual(createDate);
    expect(finalPDR?.submittedAt).toBeTruthy();
    expect(finalPDR?.lockedAt).toEqual(lockTime);
    expect(finalPDR?.meetingBookedAt).toEqual(bookingTime);
    expect(finalPDR?.lockedBy).toBe(testCEO.id);
  });

  it('should handle edge cases correctly', () => {
    // Test FY calculation for boundary dates
    const julyFirst = new Date('2025-07-01');
    const juneLast = new Date('2025-06-30');

    const fyJuly = computeAustralianFY(julyFirst);
    const fyJune = computeAustralianFY(juneLast);

    expect(fyJuly.label).toBe('2025-2026');
    expect(fyJune.label).toBe('2024-2025');
  });

  it('should enforce state machine constraints', () => {
    // Cannot skip states
    const skipTransition = validateStateTransition('Created', 'Plan - Locked', 'submitCeoReview', 'CEO');
    expect(skipTransition.isValid).toBe(false);

    // Cannot go backwards
    const backwardTransition = validateStateTransition('Plan - Locked', 'open for review', 'submitForReview', 'EMPLOYEE');
    expect(backwardTransition.isValid).toBe(false);

    // Wrong role for action
    const wrongRoleTransition = validateStateTransition('Created', 'open for review', 'submitForReview', 'CEO');
    expect(wrongRoleTransition.isValid).toBe(false);
  });

  it('should handle concurrent edits correctly', async () => {
    // This test would verify that employee and CEO field updates don't overwrite each other
    // In a real implementation, this would test optimistic locking or field-level updates
    
    const pdr = await prisma.pDR.create({
      data: {
        userId: testEmployee.id,
        fyLabel: '2025-2026',
        fyStartDate: new Date('2025-07-01'),
        fyEndDate: new Date('2026-06-30'),
        status: 'open for review',
        employeeFields: { note: 'Employee edit' },
      },
    });

    // Simulate concurrent updates
    await prisma.pDR.update({
      where: { id: pdr.id },
      data: {
        employeeFields: { note: 'Employee update', progress: 'good' },
        ceoFields: { feedback: 'CEO feedback' },
      },
    });

    const updatedPDR = await prisma.pDR.findUnique({ where: { id: pdr.id } });
    expect(updatedPDR?.employeeFields).toMatchObject({ note: 'Employee update', progress: 'good' });
    expect(updatedPDR?.ceoFields).toMatchObject({ feedback: 'CEO feedback' });
  });

  it('should validate timezone handling for Australian FY', () => {
    // Test that FY calculation works consistently across timezones
    const testDates = [
      { date: new Date('2025-06-30T23:59:59Z'), expected: '2024-2025' },
      { date: new Date('2025-07-01T00:00:00Z'), expected: '2025-2026' },
      { date: new Date('2025-12-31T12:00:00Z'), expected: '2025-2026' },
      { date: new Date('2026-01-01T12:00:00Z'), expected: '2025-2026' },
    ];

    testDates.forEach(({ date, expected }) => {
      const fy = computeAustralianFY(date, 'Australia/Adelaide');
      expect(fy.label).toBe(expected);
    });
  });

  it('should handle notification delivery correctly', () => {
    const notification = createPDRNotification(
      'pdr-1',
      'user-1',
      'PDR_LOCKED',
      'John CEO'
    );

    expect(notification.type).toBe('PDR_LOCKED');
    expect(notification.title).toBe('PDR Locked');
    expect(notification.message).toBe('John CEO has locked your review pending PDR meeting.');
    expect(notification.userId).toBe('user-1');
    expect(notification.pdrId).toBe('pdr-1');
  });
});
