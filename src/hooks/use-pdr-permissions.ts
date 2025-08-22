'use client';

import { useMemo } from 'react';
import { PDRStatus, UserRole, PDR } from '@/types';
import { 
  getPDRPermissions, 
  isPDREditable, 
  getPDRReadOnlyReason,
  getValidNextStates
} from '@/lib/pdr-state-machine';
import { useAuth } from '@/hooks/use-auth';

interface UsePDRPermissionsProps {
  pdr?: PDR | null;
  userRole?: UserRole;
  isOwner?: boolean;
}

interface PDRPermissionsResult {
  permissions: ReturnType<typeof getPDRPermissions>;
  isEditable: boolean;
  readOnlyReason: string | null;
  validNextStates: ReturnType<typeof getValidNextStates>;
  canSubmitForReview: boolean;
  canSubmitCEOReview: boolean;
  canMarkAsBooked: boolean;
  showBookingCheckbox: boolean;
  statusDisplay: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    description?: string;
  };
}

/**
 * Hook for determining PDR permissions and UI state based on current user and PDR status
 */
export function usePDRPermissions({
  pdr,
  userRole,
  isOwner,
}: UsePDRPermissionsProps): PDRPermissionsResult {
  const { user } = useAuth();
  
  // Use provided values or fall back to auth context
  const effectiveUserRole = userRole || user?.role;
  const effectiveIsOwner = isOwner ?? (pdr ? pdr.userId === user?.id : false);

  return useMemo(() => {
    if (!pdr || !effectiveUserRole) {
      // Return default safe state
      return {
        permissions: {
          canView: false,
          canEdit: false,
          canViewEmployeeFields: false,
          canEditEmployeeFields: false,
          canViewCeoFields: false,
          canEditCeoFields: false,
          canSubmitForReview: false,
          canSubmitCeoReview: false,
          canMarkBooked: false,
        },
        isEditable: false,
        readOnlyReason: 'No PDR or user data available',
        validNextStates: [],
        canSubmitForReview: false,
        canSubmitCEOReview: false,
        canMarkAsBooked: false,
        showBookingCheckbox: false,
        statusDisplay: {
          text: 'Unknown',
          variant: 'outline',
        },
      };
    }

    const permissions = getPDRPermissions(pdr.status, effectiveUserRole, effectiveIsOwner);
    const isEditable = isPDREditable(pdr.status, effectiveUserRole, effectiveIsOwner);
    const readOnlyReason = getPDRReadOnlyReason(pdr.status, effectiveUserRole, effectiveIsOwner);
    const validNextStates = getValidNextStates(pdr.status, effectiveUserRole);

    // Determine specific action capabilities
    const canSubmitForReview = validNextStates.some(state => state.action === 'submitForReview');
    const canSubmitCEOReview = validNextStates.some(state => state.action === 'submitCeoReview');
    const canMarkAsBooked = validNextStates.some(state => state.action === 'markBooked');

    // Show booking checkbox for CEOs on locked PDRs
    const showBookingCheckbox = effectiveUserRole === 'CEO' && 
      (pdr.status === 'Plan - Locked' || pdr.status === 'PDR_Booked');

    // Status display configuration
    const statusDisplay = getStatusDisplay(pdr.status, pdr.meetingBooked);

    return {
      permissions,
      isEditable,
      readOnlyReason,
      validNextStates,
      canSubmitForReview,
      canSubmitCEOReview,
      canMarkAsBooked,
      showBookingCheckbox,
      statusDisplay,
    };
  }, [pdr, effectiveUserRole, effectiveIsOwner]);
}

/**
 * Get display configuration for PDR status
 */
function getStatusDisplay(status: PDRStatus, meetingBooked?: boolean): {
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  description?: string;
} {
  switch (status) {
    case 'Created':
      return {
        text: 'Draft',
        variant: 'outline',
        description: 'PDR is being created and can be edited',
      };

    case 'OPEN_FOR_REVIEW':
      return {
        text: 'Under Review',
        variant: 'warning',
        description: 'PDR submitted for CEO review',
      };

    case 'PLAN_LOCKED':
      return {
        text: 'Locked',
        variant: 'destructive',
        description: 'PDR locked by CEO pending meeting',
      };

    case 'PDR_Booked':
      return {
        text: meetingBooked ? 'Meeting Booked' : 'Ready for Booking',
        variant: 'success',
        description: meetingBooked 
          ? 'PDR meeting has been scheduled'
          : 'PDR ready for meeting booking',
      };

    // Legacy statuses
    case 'DRAFT':
      return {
        text: 'Draft',
        variant: 'outline',
        description: 'PDR is in draft state',
      };

    case 'SUBMITTED':
      return {
        text: 'Submitted',
        variant: 'secondary',
        description: 'PDR has been submitted',
      };

    case 'UNDER_REVIEW':
      return {
        text: 'Under Review',
        variant: 'warning',
        description: 'PDR is being reviewed',
      };

    case 'COMPLETED':
      return {
        text: 'Completed',
        variant: 'success',
        description: 'PDR process completed',
      };

    case 'LOCKED':
      return {
        text: 'Locked',
        variant: 'destructive',
        description: 'PDR is locked',
      };

    case 'SUBMITTED_FOR_REVIEW':
      return {
        text: 'Pending Final Review',
        variant: 'warning',
        description: 'Complete - awaiting final review meeting',
      };

    default:
      return {
        text: status,
        variant: 'outline',
        description: 'Unknown status',
      };
  }
}

/**
 * Hook specifically for checking if the current user can edit a PDR
 */
export function useCanEditPDR(pdr?: PDR | null): boolean {
  const { permissions } = usePDRPermissions({ pdr });
  return permissions.canEdit;
}

/**
 * Hook specifically for getting the status badge configuration
 */
export function usePDRStatusDisplay(pdr?: PDR | null) {
  const { statusDisplay } = usePDRPermissions({ pdr });
  return statusDisplay;
}

/**
 * Hook for getting available actions for the current user and PDR
 */
export function usePDRActions(pdr?: PDR | null) {
  const { 
    canSubmitForReview, 
    canSubmitCEOReview, 
    canMarkAsBooked,
    validNextStates
  } = usePDRPermissions({ pdr });

  return {
    canSubmitForReview,
    canSubmitCEOReview,
    canMarkAsBooked,
    availableActions: validNextStates,
  };
}
