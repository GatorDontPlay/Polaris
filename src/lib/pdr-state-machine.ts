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

// Define all valid state transitions for the simplified approval gate workflow
export const STATE_TRANSITIONS: StateTransition[] = [
  // Phase 1: Initial PDR Creation & CEO Approval
  {
    from: PDRStatus.CREATED,
    to: PDRStatus.SUBMITTED,
    action: 'submitInitialPDR',
    allowedRoles: ['EMPLOYEE'],
    requiresValidation: true,
    validationFields: ['goals', 'behaviors'],
  },
  {
    from: PDRStatus.SUBMITTED,
    to: PDRStatus.PLAN_LOCKED,
    action: 'approvePlan',
    allowedRoles: ['CEO'],
    requiresValidation: true,
    validationFields: ['ceoFields'],
  },
  
  // Phase 2: Mid-Year Review
  {
    from: PDRStatus.PLAN_LOCKED,
    to: PDRStatus.MID_YEAR_SUBMITTED,
    action: 'submitMidYear',
    allowedRoles: ['EMPLOYEE'],
    requiresValidation: true,
    validationFields: ['midYearReview'],
  },
  {
    from: PDRStatus.MID_YEAR_SUBMITTED,
    to: PDRStatus.MID_YEAR_APPROVED,
    action: 'approveMidYear',
    allowedRoles: ['CEO'],
    requiresValidation: true,
    validationFields: ['ceoMidYearFeedback'],
  },
  // Allow CEO to approve mid-year directly from PLAN_LOCKED (skip employee mid-year submission)
  {
    from: PDRStatus.PLAN_LOCKED,
    to: PDRStatus.MID_YEAR_APPROVED,
    action: 'approveMidYearDirect',
    allowedRoles: ['CEO'],
    requiresValidation: false,
  },
  
  // Phase 3: Final Year Review
  {
    from: PDRStatus.MID_YEAR_APPROVED,
    to: PDRStatus.END_YEAR_SUBMITTED,
    action: 'submitFinalYear',
    allowedRoles: ['EMPLOYEE'],
    requiresValidation: true,
    validationFields: ['endYearReview'],
  },
  // Allow direct transition from PLAN_LOCKED to END_YEAR_SUBMITTED (skip mid-year)
  {
    from: PDRStatus.PLAN_LOCKED,
    to: PDRStatus.END_YEAR_SUBMITTED,
    action: 'submitFinalYear',
    allowedRoles: ['EMPLOYEE'],
    requiresValidation: true,
    validationFields: ['endYearReview'],
  },
  {
    from: PDRStatus.END_YEAR_SUBMITTED,
    to: PDRStatus.COMPLETED,
    action: 'completeFinalReview',
    allowedRoles: ['CEO'],
    requiresValidation: true,
    validationFields: ['ceoFinalFeedback'],
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
      case PDRStatus.CREATED:
        return {
          ...basePermissions,
          canView: true,
          canEdit: true,
          canViewEmployeeFields: true,
          canEditEmployeeFields: true,
          canSubmitForReview: true,
        };

      case PDRStatus.SUBMITTED:
      case PDRStatus.MID_YEAR_SUBMITTED:
      case PDRStatus.END_YEAR_SUBMITTED:
        return {
          ...basePermissions,
          canView: true,
          canEdit: false,               // LOCKED after submission
          canViewEmployeeFields: true,  // Can see their own data
          canViewCeoFields: false,      // CANNOT see CEO feedback yet
          canEditEmployeeFields: false,
          readOnlyReason: 'PDR is under CEO review',
        };

      case PDRStatus.PLAN_LOCKED:
      case PDRStatus.MID_YEAR_APPROVED:
        return {
          ...basePermissions,
          canView: true,
          canEdit: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,       // CAN now see CEO feedback
          canEditEmployeeFields: true,
          canSubmitForReview: true,     // Can submit next phase
        };

      case PDRStatus.COMPLETED:
        return {
          ...basePermissions,
          canView: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,       // Can see all CEO feedback
          readOnlyReason: 'PDR process has been completed',
        };

      default:
        return basePermissions;
    }
  }

  // CEO permissions
  if (userRole === 'CEO') {
    switch (pdrStatus) {
      case PDRStatus.CREATED:
        return {
          ...basePermissions,
          canView: true, // Can list but cannot open/edit until submitted
          readOnlyReason: 'PDR not yet submitted for review',
        };

      case PDRStatus.SUBMITTED:
      case PDRStatus.MID_YEAR_SUBMITTED:
      case PDRStatus.END_YEAR_SUBMITTED:
        return {
          ...basePermissions,
          canView: true,
          canEdit: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,
          canEditCeoFields: true,
          canSubmitCeoReview: true,
        };

      case PDRStatus.PLAN_LOCKED:
      case PDRStatus.MID_YEAR_APPROVED:
        return {
          ...basePermissions,
          canView: true,
          canEdit: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,
          canEditCeoFields: true,
        };

      case PDRStatus.COMPLETED:
        return {
          ...basePermissions,
          canView: true,
          canViewEmployeeFields: true,
          canViewCeoFields: true,
          canEditCeoFields: true, // CEO can always revoke and edit
          readOnlyReason: 'PDR process has been completed',
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
          errors.push('Please add at least one goal before submitting for review');
        } else {
          // Validate each goal has required fields
          const goalsWithoutTitle = pdrData.goals.filter(g => !g.title?.trim());
          const goalsWithoutDescription = pdrData.goals.filter(g => !g.description?.trim());
          
          if (goalsWithoutTitle.length > 0) {
            errors.push(`${goalsWithoutTitle.length} goal(s) are missing a title. Please add titles to all goals.`);
          }
          if (goalsWithoutDescription.length > 0) {
            errors.push(`${goalsWithoutDescription.length} goal(s) are missing a description. Please add descriptions to all goals.`);
          }
        }
        break;

      case 'behaviors':
        if (!pdrData.behaviors || pdrData.behaviors.length === 0) {
          errors.push('Please complete at least one company value assessment before submitting');
        } else {
          // Validate each behavior has required fields
          const behaviorsWithoutDescription = pdrData.behaviors.filter(b => !b.description?.trim());
          
          if (behaviorsWithoutDescription.length > 0) {
            errors.push(`${behaviorsWithoutDescription.length} company value assessment(s) are missing a description. Please complete all assessments.`);
          }
          // Note: Self-assessment validation removed as it's not currently required in the form
        }
        break;

      case 'ceoFields':
        // Validate CEO has provided feedback on behaviors only
        // Note: Goal CEO feedback requirement removed as per UI changes

        const ceoBehaviorComments = pdrData.behaviors?.some((behavior: any) => behavior.ceo_comments?.trim());
        
        if (!ceoBehaviorComments) {
          errors.push('CEO must provide comments on at least one behavior');
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
