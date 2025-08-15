/**
 * PDR State Machine Implementation
 * 
 * Enforces the precise flow, statuses, visibility, and editability 
 * across Employee and CEO roles according to the requirements.
 */

import { PDRStatus, UserRole, NotificationType } from '@/types';

export interface StateTransition {
  from: PDRStatus;
  to: PDRStatus;
  action: string;
  allowedRoles: UserRole[];
  requiresValidation?: boolean;
  validationFields?: string[];
}

export interface PDRPermissions {
  canView: boolean;
  canEdit: boolean;
  canViewEmployeeFields: boolean;
  canEditEmployeeFields: boolean;
  canViewCeoFields: boolean;
  canEditCeoFields: boolean;
  canSubmitForReview: boolean;
  canSubmitCeoReview: boolean;
  canMarkBooked: boolean;
  readOnlyReason?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Define all valid state transitions
export const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: 'Created',
    to: 'OPEN_FOR_REVIEW',
    action: 'submitForReview',
    allowedRoles: ['EMPLOYEE'],
    requiresValidation: true,
    validationFields: ['goals', 'behaviors'],
  },
  {
    from: 'OPEN_FOR_REVIEW',
    to: 'PLAN_LOCKED',
    action: 'submitCeoReview',
    allowedRoles: ['CEO'],
    requiresValidation: true,
    validationFields: ['ceoFields'],
  },
  {
    from: 'PLAN_LOCKED',
    to: 'PDR_BOOKED',
    action: 'markBooked',
    allowedRoles: ['CEO'],
    requiresValidation: false,
  },
];

/**
 * Validates if a state transition is allowed
 * @param from - Current PDR status
 * @param to - Target PDR status
 * @param action - Action being performed
 * @param userRole - Role of the user performing the action
 * @returns ValidationResult indicating if transition is valid
 */
export function validateStateTransition(
  from: PDRStatus,
  to: PDRStatus,
  action: string,
  userRole: UserRole
): ValidationResult {
  const transition = STATE_TRANSITIONS.find(
    t => t.from === from && t.to === to && t.action === action
  );

  if (!transition) {
    return {
      isValid: false,
      errors: [`Invalid transition from '${from}' to '${to}' with action '${action}'`],
    };
  }

  if (!transition.allowedRoles.includes(userRole)) {
    return {
      isValid: false,
      errors: [`User role '${userRole}' is not allowed to perform action '${action}'`],
    };
  }

  return {
    isValid: true,
    errors: [],
  };
}

/**
 * Gets the next valid states for a given current state and user role
 * @param currentState - Current PDR status
 * @param userRole - Role of the user
 * @returns Array of possible next states with their required actions
 */
export function getValidNextStates(
  currentState: PDRStatus,
  userRole: UserRole
): Array<{ state: PDRStatus; action: string }> {
  return STATE_TRANSITIONS
    .filter(t => t.from === currentState && t.allowedRoles.includes(userRole))
    .map(t => ({ state: t.to, action: t.action }));
}

/**
 * Determines permissions for a user based on PDR status and user role
 * @param pdrStatus - Current PDR status
 * @param userRole - Role of the user
 * @param isOwner - Whether the user is the PDR owner (employee)
 * @returns PDRPermissions object defining what the user can do
 */
export function getPDRPermissions(
  pdrStatus: PDRStatus,
  userRole: UserRole,
  isOwner: boolean = false
): PDRPermissions {
  const basePermissions: PDRPermissions = {
    canView: false,
    canEdit: false,
    canViewEmployeeFields: false,
    canEditEmployeeFields: false,
    canViewCeoFields: false,
    canEditCeoFields: false,
    canSubmitForReview: false,
    canSubmitCeoReview: false,
    canMarkBooked: false,
  };

  // Employee permissions
  if (userRole === 'EMPLOYEE' && isOwner) {
    switch (pdrStatus) {
      case 'Created':
        return {
          ...basePermissions,
          canView: true,
          canEdit: true,
          canViewEmployeeFields: true,
          canEditEmployeeFields: true,
          canSubmitForReview: true,
        };

      case 'OPEN_FOR_REVIEW':
        return {
          ...basePermissions,
          canView: true,
          canEdit: true,
          canViewEmployeeFields: true,
          canEditEmployeeFields: true,
          // Note: CEO fields are not visible to employee per requirements
        };

      case 'PLAN_LOCKED':
        return {
          ...basePermissions,
          canView: true,
          canViewEmployeeFields: true,
          readOnlyReason: 'PDR has been locked by CEO pending meeting',
        };

      case 'PDR_BOOKED':
        return {
          ...basePermissions,
          canView: true,
          canViewEmployeeFields: true,
          readOnlyReason: 'PDR meeting has been booked',
        };

      default:
        return basePermissions;
    }
  }

  // CEO permissions
  if (userRole === 'CEO') {
    switch (pdrStatus) {
      case 'Created':
        return {
          ...basePermissions,
          canView: true, // Can list but cannot open/edit per requirements
          readOnlyReason: 'PDR not yet submitted for review',
        };

      case 'OPEN_FOR_REVIEW':
        return {
          ...basePermissions,
          canView: true,
          canEdit: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,
          canEditCeoFields: true,
          canSubmitCeoReview: true,
        };

      case 'PLAN_LOCKED':
        return {
          ...basePermissions,
          canView: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,
          canMarkBooked: true,
          readOnlyReason: 'PDR is locked, only booking action available',
        };

      case 'PDR_BOOKED':
        return {
          ...basePermissions,
          canView: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,
          readOnlyReason: 'PDR meeting has been booked',
        };

      default:
        return basePermissions;
    }
  }

  return basePermissions;
}

/**
 * Validates required fields for a specific state transition
 * @param pdrData - Current PDR data
 * @param transition - The state transition being attempted
 * @returns ValidationResult indicating if fields are valid
 */
export function validateTransitionRequirements(
  pdrData: any,
  transition: StateTransition
): ValidationResult {
  if (!transition.requiresValidation || !transition.validationFields) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];

  for (const field of transition.validationFields) {
    switch (field) {
      case 'goals':
        if (!pdrData.goals || pdrData.goals.length === 0) {
          errors.push('At least one goal is required before submitting for review');
        } else {
          // Validate each goal has required fields
          for (const goal of pdrData.goals) {
            if (!goal.title?.trim()) {
              errors.push('All goals must have a title');
            }
            if (!goal.description?.trim()) {
              errors.push('All goals must have a description');
            }
          }
        }
        break;

      case 'behaviors':
        if (!pdrData.behaviors || pdrData.behaviors.length === 0) {
          errors.push('At least one behavior assessment is required before submitting for review');
        } else {
          // Validate each behavior has required fields
          for (const behavior of pdrData.behaviors) {
            if (!behavior.description?.trim()) {
              errors.push('All behavior assessments must have a description');
            }
            if (!behavior.employeeSelfAssessment?.trim()) {
              errors.push('All behavior assessments must have a self-assessment');
            }
          }
        }
        break;

      case 'ceoFields':
        if (!pdrData.ceoFields) {
          errors.push('CEO review fields are required before submitting review');
        } else {
          // Validate CEO has provided feedback on goals and behaviors
          const ceoGoalComments = pdrData.goals?.some((goal: any) => goal.ceoComments?.trim());
          const ceoBehaviorComments = pdrData.behaviors?.some((behavior: any) => behavior.ceoComments?.trim());
          
          if (!ceoGoalComments) {
            errors.push('CEO must provide comments on at least one goal');
          }
          if (!ceoBehaviorComments) {
            errors.push('CEO must provide comments on at least one behavior');
          }
        }
        break;

      default:
        errors.push(`Unknown validation field: ${field}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a notification for PDR state changes
 * @param pdrId - PDR ID
 * @param userId - User to notify
 * @param type - Type of notification
 * @param ceoName - Name of CEO (for lock notifications)
 * @returns Notification data
 */
export function createPDRNotification(
  pdrId: string,
  userId: string,
  type: NotificationType,
  ceoName?: string
): {
  userId: string;
  pdrId: string;
  type: NotificationType;
  title: string;
  message: string;
} {
  switch (type) {
    case 'PDR_LOCKED':
      return {
        userId,
        pdrId,
        type,
        title: 'PDR Locked',
        message: `${ceoName || 'Your manager'} has locked your review pending PDR meeting.`,
      };

    case 'PDR_SUBMITTED':
      return {
        userId,
        pdrId,
        type,
        title: 'PDR Submitted for Review',
        message: 'Your PDR has been submitted and is now available for CEO review.',
      };

    case 'PDR_REMINDER':
      return {
        userId,
        pdrId,
        type,
        title: 'PDR Reminder',
        message: 'Don\'t forget to complete your PDR before the deadline.',
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

/**
 * Checks if a PDR is editable by the current user
 * @param pdrStatus - Current PDR status
 * @param userRole - Role of the user
 * @param isOwner - Whether the user is the PDR owner
 * @returns boolean indicating if PDR is editable
 */
export function isPDREditable(
  pdrStatus: PDRStatus,
  userRole: UserRole,
  isOwner: boolean = false
): boolean {
  const permissions = getPDRPermissions(pdrStatus, userRole, isOwner);
  return permissions.canEdit;
}

/**
 * Gets the human-readable reason why a PDR is not editable
 * @param pdrStatus - Current PDR status
 * @param userRole - Role of the user
 * @param isOwner - Whether the user is the PDR owner
 * @returns string explaining why PDR is read-only, or null if editable
 */
export function getPDRReadOnlyReason(
  pdrStatus: PDRStatus,
  userRole: UserRole,
  isOwner: boolean = false
): string | null {
  const permissions = getPDRPermissions(pdrStatus, userRole, isOwner);
  return permissions.readOnlyReason || null;
}
