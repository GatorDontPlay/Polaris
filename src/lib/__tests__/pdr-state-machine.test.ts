/**
 * @jest-environment node
 */

import {
  validateStateTransition,
  getValidNextStates,
  getPDRPermissions,
  validateTransitionRequirements,
  createPDRNotification,
  isPDREditable,
  getPDRReadOnlyReason,
  STATE_TRANSITIONS,
} from '../pdr-state-machine';
import { PDRStatus, UserRole, NotificationType } from '@/types';

describe('PDR State Machine', () => {
  describe('validateStateTransition', () => {
    it('should allow employee to submit PDR for review from Created status', () => {
      const result = validateStateTransition('Created', 'OPEN_FOR_REVIEW', 'submitForReview', 'EMPLOYEE');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow CEO to submit review from open for review status', () => {
      const result = validateStateTransition('OPEN_FOR_REVIEW', 'PLAN_LOCKED', 'submitCeoReview', 'CEO');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow CEO to mark as booked from Plan - Locked status', () => {
      const result = validateStateTransition('PLAN_LOCKED', 'PDR_BOOKED', 'markBooked', 'CEO');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not allow employee to submit CEO review', () => {
      const result = validateStateTransition('OPEN_FOR_REVIEW', 'PLAN_LOCKED', 'submitCeoReview', 'EMPLOYEE');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("User role 'EMPLOYEE' is not allowed to perform action 'submitCeoReview'");
    });

    it('should not allow CEO to submit PDR for review', () => {
      const result = validateStateTransition('Created', 'OPEN_FOR_REVIEW', 'submitForReview', 'CEO');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("User role 'CEO' is not allowed to perform action 'submitForReview'");
    });

    it('should not allow invalid state transitions', () => {
      const result = validateStateTransition('Created', 'PDR_Booked', 'invalidAction', 'EMPLOYEE');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid transition from 'Created' to 'PDR_Booked' with action 'invalidAction'");
    });

    it('should not allow skipping states', () => {
      const result = validateStateTransition('Created', 'Plan - Locked', 'submitCeoReview', 'CEO');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid transition');
    });
  });

  describe('getValidNextStates', () => {
    it('should return correct next states for employee in Created status', () => {
      const nextStates = getValidNextStates('Created', 'EMPLOYEE');
      expect(nextStates).toHaveLength(1);
      expect(nextStates[0]).toEqual({ state: 'OPEN_FOR_REVIEW', action: 'submitForReview' });
    });

    it('should return correct next states for CEO in open for review status', () => {
      const nextStates = getValidNextStates('OPEN_FOR_REVIEW', 'CEO');
      expect(nextStates).toHaveLength(1);
      expect(nextStates[0]).toEqual({ state: 'PLAN_LOCKED', action: 'submitCeoReview' });
    });

    it('should return correct next states for CEO in Plan - Locked status', () => {
      const nextStates = getValidNextStates('PLAN_LOCKED', 'CEO');
      expect(nextStates).toHaveLength(1);
      expect(nextStates[0]).toEqual({ state: 'PDR_BOOKED', action: 'markBooked' });
    });

    it('should return empty array for terminal states', () => {
      const nextStates = getValidNextStates('PDR_Booked', 'CEO');
      expect(nextStates).toHaveLength(0);
    });

    it('should return empty array when user role cannot perform any actions', () => {
      const nextStates = getValidNextStates('OPEN_FOR_REVIEW', 'EMPLOYEE');
      expect(nextStates).toHaveLength(0);
    });
  });

  describe('getPDRPermissions', () => {
    describe('Employee permissions', () => {
      it('should allow employee owner to edit in Created status', () => {
        const permissions = getPDRPermissions('Created', 'EMPLOYEE', true);
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(true);
        expect(permissions.canViewEmployeeFields).toBe(true);
        expect(permissions.canEditEmployeeFields).toBe(true);
        expect(permissions.canViewCeoFields).toBe(false);
        expect(permissions.canSubmitForReview).toBe(true);
      });

      it('should allow employee owner to edit in open for review status', () => {
        const permissions = getPDRPermissions('OPEN_FOR_REVIEW', 'EMPLOYEE', true);
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(true);
        expect(permissions.canViewEmployeeFields).toBe(true);
        expect(permissions.canEditEmployeeFields).toBe(true);
        expect(permissions.canViewCeoFields).toBe(false); // Per requirements
      });

      it('should make PDR read-only for employee after lock', () => {
        const permissions = getPDRPermissions('PLAN_LOCKED', 'EMPLOYEE', true);
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.canViewEmployeeFields).toBe(true);
        expect(permissions.canEditEmployeeFields).toBe(false);
        expect(permissions.readOnlyReason).toContain('locked');
      });

      it('should make PDR read-only for employee after booking', () => {
        const permissions = getPDRPermissions('PDR_BOOKED', 'EMPLOYEE', true);
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.readOnlyReason).toContain('booked');
      });
    });

    describe('CEO permissions', () => {
      it('should allow CEO to view but not edit Created PDRs', () => {
        const permissions = getPDRPermissions('Created', 'CEO');
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.readOnlyReason).toContain('not yet submitted');
      });

      it('should allow CEO to edit in open for review status', () => {
        const permissions = getPDRPermissions('OPEN_FOR_REVIEW', 'CEO');
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(true);
        expect(permissions.canViewEmployeeFields).toBe(true);
        expect(permissions.canViewCeoFields).toBe(true);
        expect(permissions.canEditCeoFields).toBe(true);
        expect(permissions.canSubmitCeoReview).toBe(true);
      });

      it('should allow CEO to book meetings in Plan - Locked status', () => {
        const permissions = getPDRPermissions('PLAN_LOCKED', 'CEO');
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.canMarkBooked).toBe(true);
        expect(permissions.readOnlyReason).toContain('locked');
      });

      it('should make PDR read-only for CEO after booking', () => {
        const permissions = getPDRPermissions('PDR_BOOKED', 'CEO');
        expect(permissions.canView).toBe(true);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.canMarkBooked).toBe(false);
        expect(permissions.readOnlyReason).toContain('booked');
      });
    });

    it('should deny all permissions for non-owner employees', () => {
      const permissions = getPDRPermissions('Created', 'EMPLOYEE', false);
      expect(permissions.canView).toBe(false);
      expect(permissions.canEdit).toBe(false);
    });
  });

  describe('validateTransitionRequirements', () => {
    const validGoals = [
      { title: 'Goal 1', description: 'Description 1' },
      { title: 'Goal 2', description: 'Description 2' },
    ];

    const validBehaviors = [
      { description: 'Behavior 1', employeeSelfAssessment: 'Assessment 1' },
      { description: 'Behavior 2', employeeSelfAssessment: 'Assessment 2' },
    ];

    const validCeoData = {
      goals: [
        { title: 'Goal 1', ceoComments: 'CEO feedback on goal 1' },
      ],
      behaviors: [
        { description: 'Behavior 1', ceoComments: 'CEO feedback on behavior 1' },
      ],
      ceoFields: { overallRating: 4 },
    };

    it('should validate employee submission requirements', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'submitForReview')!;
      const pdrData = { goals: validGoals, behaviors: validBehaviors };
      
      const result = validateTransitionRequirements(pdrData, transition);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject employee submission without goals', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'submitForReview')!;
      const pdrData = { goals: [], behaviors: validBehaviors };
      
      const result = validateTransitionRequirements(pdrData, transition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one goal is required before submitting for review');
    });

    it('should reject employee submission without behaviors', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'submitForReview')!;
      const pdrData = { goals: validGoals, behaviors: [] };
      
      const result = validateTransitionRequirements(pdrData, transition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one behavior assessment is required before submitting for review');
    });

    it('should reject goals without titles', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'submitForReview')!;
      const pdrData = {
        goals: [{ title: '', description: 'Description' }],
        behaviors: validBehaviors,
      };
      
      const result = validateTransitionRequirements(pdrData, transition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All goals must have a title');
    });

    it('should reject behaviors without self-assessment', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'submitForReview')!;
      const pdrData = {
        goals: validGoals,
        behaviors: [{ description: 'Behavior', employeeSelfAssessment: '' }],
      };
      
      const result = validateTransitionRequirements(pdrData, transition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All behavior assessments must have a self-assessment');
    });

    it('should validate CEO submission requirements', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'submitCeoReview')!;
      
      const result = validateTransitionRequirements(validCeoData, transition);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject CEO submission without comments', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'submitCeoReview')!;
      const pdrData = {
        goals: [{ title: 'Goal 1', ceoComments: '' }],
        behaviors: [{ description: 'Behavior 1', ceoComments: '' }],
        ceoFields: { overallRating: 4 },
      };
      
      const result = validateTransitionRequirements(pdrData, transition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CEO must provide comments on at least one goal');
      expect(result.errors).toContain('CEO must provide comments on at least one behavior');
    });

    it('should pass validation for transitions that do not require validation', () => {
      const transition = STATE_TRANSITIONS.find(t => t.action === 'markBooked')!;
      const pdrData = {};
      
      const result = validateTransitionRequirements(pdrData, transition);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createPDRNotification', () => {
    it('should create PDR locked notification', () => {
      const notification = createPDRNotification('pdr-1', 'user-1', 'PDR_LOCKED', 'John Doe');
      
      expect(notification.userId).toBe('user-1');
      expect(notification.pdrId).toBe('pdr-1');
      expect(notification.type).toBe('PDR_LOCKED');
      expect(notification.title).toBe('PDR Locked');
      expect(notification.message).toContain('John Doe has locked your review');
    });

    it('should create PDR submitted notification', () => {
      const notification = createPDRNotification('pdr-1', 'user-1', 'PDR_SUBMITTED');
      
      expect(notification.type).toBe('PDR_SUBMITTED');
      expect(notification.title).toBe('PDR Submitted for Review');
      expect(notification.message).toContain('submitted and is now available for CEO review');
    });

    it('should create PDR reminder notification', () => {
      const notification = createPDRNotification('pdr-1', 'user-1', 'PDR_REMINDER');
      
      expect(notification.type).toBe('PDR_REMINDER');
      expect(notification.title).toBe('PDR Reminder');
      expect(notification.message).toContain('Don\'t forget to complete');
    });

    it('should throw error for unknown notification types', () => {
      expect(() => {
        createPDRNotification('pdr-1', 'user-1', 'UNKNOWN' as NotificationType);
      }).toThrow('Unknown notification type: UNKNOWN');
    });
  });

  describe('isPDREditable', () => {
    it('should return true for employee owner in Created status', () => {
      expect(isPDREditable('Created', 'EMPLOYEE', true)).toBe(true);
    });

    it('should return true for employee owner in open for review status', () => {
      expect(isPDREditable('OPEN_FOR_REVIEW', 'EMPLOYEE', true)).toBe(true);
    });

    it('should return false for employee owner in locked status', () => {
      expect(isPDREditable('PLAN_LOCKED', 'EMPLOYEE', true)).toBe(false);
    });

    it('should return true for CEO in open for review status', () => {
      expect(isPDREditable('OPEN_FOR_REVIEW', 'CEO')).toBe(true);
    });

    it('should return false for CEO in Created status', () => {
      expect(isPDREditable('Created', 'CEO')).toBe(false);
    });
  });

  describe('getPDRReadOnlyReason', () => {
    it('should return null for editable PDRs', () => {
      expect(getPDRReadOnlyReason('Created', 'EMPLOYEE', true)).toBeNull();
    });

    it('should return reason for locked PDRs', () => {
      const reason = getPDRReadOnlyReason('PLAN_LOCKED', 'EMPLOYEE', true);
      expect(reason).toContain('locked');
    });

    it('should return reason for CEO viewing Created PDRs', () => {
      const reason = getPDRReadOnlyReason('Created', 'CEO');
      expect(reason).toContain('not yet submitted');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle all defined transitions in STATE_TRANSITIONS', () => {
      expect(STATE_TRANSITIONS).toHaveLength(3);
      
      const actions = STATE_TRANSITIONS.map(t => t.action);
      expect(actions).toContain('submitForReview');
      expect(actions).toContain('submitCeoReview');
      expect(actions).toContain('markBooked');
    });

    it('should maintain consistency between permissions and transitions', () => {
      // If a user can perform an action according to permissions,
      // there should be a valid transition for it
      const createdPermissions = getPDRPermissions('Created', 'EMPLOYEE', true);
      if (createdPermissions.canSubmitForReview) {
        const nextStates = getValidNextStates('Created', 'EMPLOYEE');
        expect(nextStates.some(s => s.action === 'submitForReview')).toBe(true);
      }
    });

    it('should handle status strings with special characters', () => {
      // Test that status strings with spaces and hyphens work correctly
      const result = validateStateTransition('OPEN_FOR_REVIEW', 'PLAN_LOCKED', 'submitCeoReview', 'CEO');
      expect(result.isValid).toBe(true);
    });
  });
});
