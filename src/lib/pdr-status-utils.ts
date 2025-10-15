/**
 * PDR Status Utility Functions
 * 
 * Helper functions for working with PDR statuses
 */

import { PDRStatus, getStatusDisplayName } from '@/types/pdr-status';

/**
 * Get Tailwind CSS color classes for status badge
 */
export function getStatusColor(status: PDRStatus | string): string {
  const statusEnum = status as PDRStatus;
  
  switch (statusEnum) {
    case PDRStatus.CREATED:
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case PDRStatus.SUBMITTED:
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case PDRStatus.PLAN_LOCKED:
      return 'bg-green-100 text-green-800 border-green-300';
    case PDRStatus.MID_YEAR_SUBMITTED:
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case PDRStatus.MID_YEAR_APPROVED:
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case PDRStatus.END_YEAR_SUBMITTED:
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case PDRStatus.COMPLETED:
      return 'bg-purple-100 text-purple-800 border-purple-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get status progress percentage (0-100)
 * Represents how far through the PDR cycle
 */
export function getStatusProgress(status: PDRStatus | string): number {
  const statusEnum = status as PDRStatus;
  
  switch (statusEnum) {
    case PDRStatus.CREATED:
      return 0;
    case PDRStatus.SUBMITTED:
      return 15;
    case PDRStatus.PLAN_LOCKED:
      return 30;
    case PDRStatus.MID_YEAR_SUBMITTED:
      return 50;
    case PDRStatus.MID_YEAR_APPROVED:
      return 70;
    case PDRStatus.END_YEAR_SUBMITTED:
      return 85;
    case PDRStatus.COMPLETED:
      return 100;
    default:
      return 0;
  }
}

/**
 * Check if status can transition to another status
 */
export function canTransitionTo(from: PDRStatus | string, to: PDRStatus | string): boolean {
  const fromStatus = from as PDRStatus;
  const toStatus = to as PDRStatus;
  
  // Define valid transitions
  const validTransitions: Record<PDRStatus, PDRStatus[]> = {
    [PDRStatus.CREATED]: [PDRStatus.SUBMITTED],
    [PDRStatus.SUBMITTED]: [PDRStatus.PLAN_LOCKED, PDRStatus.CREATED],
    [PDRStatus.PLAN_LOCKED]: [PDRStatus.MID_YEAR_SUBMITTED],
    [PDRStatus.MID_YEAR_SUBMITTED]: [PDRStatus.MID_YEAR_APPROVED, PDRStatus.PLAN_LOCKED],
    [PDRStatus.MID_YEAR_APPROVED]: [PDRStatus.END_YEAR_SUBMITTED],
    [PDRStatus.END_YEAR_SUBMITTED]: [PDRStatus.COMPLETED, PDRStatus.MID_YEAR_APPROVED],
    [PDRStatus.COMPLETED]: [], // No transitions from completed
  };
  
  return validTransitions[fromStatus]?.includes(toStatus) || false;
}

/**
 * Get available transitions from current status
 */
export function getAvailableTransitions(status: PDRStatus | string): PDRStatus[] {
  const statusEnum = status as PDRStatus;
  
  const transitions: Record<PDRStatus, PDRStatus[]> = {
    [PDRStatus.CREATED]: [PDRStatus.SUBMITTED],
    [PDRStatus.SUBMITTED]: [PDRStatus.PLAN_LOCKED],
    [PDRStatus.PLAN_LOCKED]: [PDRStatus.MID_YEAR_SUBMITTED],
    [PDRStatus.MID_YEAR_SUBMITTED]: [PDRStatus.MID_YEAR_APPROVED],
    [PDRStatus.MID_YEAR_APPROVED]: [PDRStatus.END_YEAR_SUBMITTED],
    [PDRStatus.END_YEAR_SUBMITTED]: [PDRStatus.COMPLETED],
    [PDRStatus.COMPLETED]: [],
  };
  
  return transitions[statusEnum] || [];
}

/**
 * Get next status in normal flow
 */
export function getNextStatus(status: PDRStatus | string): PDRStatus | null {
  const transitions = getAvailableTransitions(status);
  return transitions[0] || null;
}

/**
 * Check if PDR is in a final state
 */
export function isFinalStatus(status: PDRStatus | string): boolean {
  return status === PDRStatus.COMPLETED;
}

/**
 * Check if PDR is in a submitted state (waiting for review)
 */
export function isSubmittedStatus(status: PDRStatus | string): boolean {
  const statusEnum = status as PDRStatus;
  return [
    PDRStatus.SUBMITTED,
    PDRStatus.MID_YEAR_SUBMITTED,
    PDRStatus.END_YEAR_SUBMITTED,
  ].includes(statusEnum);
}

/**
 * Check if PDR is in an approved state
 */
export function isApprovedStatus(status: PDRStatus | string): boolean {
  const statusEnum = status as PDRStatus;
  return [
    PDRStatus.PLAN_LOCKED,
    PDRStatus.MID_YEAR_APPROVED,
    PDRStatus.COMPLETED,
  ].includes(statusEnum);
}

/**
 * Get status stage (planning, mid-year, end-year, complete)
 */
export function getStatusStage(status: PDRStatus | string): 'planning' | 'mid-year' | 'end-year' | 'complete' {
  const statusEnum = status as PDRStatus;
  
  switch (statusEnum) {
    case PDRStatus.CREATED:
    case PDRStatus.SUBMITTED:
    case PDRStatus.PLAN_LOCKED:
      return 'planning';
    case PDRStatus.MID_YEAR_SUBMITTED:
    case PDRStatus.MID_YEAR_APPROVED:
      return 'mid-year';
    case PDRStatus.END_YEAR_SUBMITTED:
      return 'end-year';
    case PDRStatus.COMPLETED:
      return 'complete';
    default:
      return 'planning';
  }
}

/**
 * Format status for display with icon
 */
export function formatStatusWithIcon(status: PDRStatus | string): string {
  const displayName = getStatusDisplayName(status);
  const stage = getStatusStage(status);
  
  const icons = {
    planning: '📝',
    'mid-year': '📊',
    'end-year': '🎯',
    complete: '✅',
  };
  
  return `${icons[stage]} ${displayName}`;
}

