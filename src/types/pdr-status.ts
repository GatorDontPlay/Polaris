/**
 * PDR Status Enum and Constants
 * 
 * Single source of truth for all PDR status values.
 * Maps TypeScript enum to exact database values.
 */

/**
 * PDR Status Enum
 * 
 * Enum keys use consistent naming (UPPER_SNAKE_CASE)
 * Enum values match exact database values (mixed casing)
 */
export enum PDRStatus {
  CREATED = 'Created',                    // Employee creating PDR
  SUBMITTED = 'SUBMITTED',                // Employee submitted → CEO reviews
  PLAN_LOCKED = 'PLAN_LOCKED',            // CEO approved → Mid-year available
  MID_YEAR_SUBMITTED = 'MID_YEAR_SUBMITTED',  // Employee submitted mid-year
  MID_YEAR_APPROVED = 'MID_YEAR_APPROVED',    // CEO approved mid-year → End-year available
  END_YEAR_SUBMITTED = 'END_YEAR_SUBMITTED',  // Employee submitted final
  COMPLETED = 'COMPLETED',                // CEO completed final → All locked
}

/**
 * Status values that allow employee editing
 * Used across all API routes for permission checks
 * 
 * Note: SUBMITTED, MID_YEAR_SUBMITTED, and END_YEAR_SUBMITTED are NOT included
 * because those statuses mean the PDR is under CEO review and locked for editing
 */
export const EMPLOYEE_EDITABLE_STATUSES: PDRStatus[] = [
  PDRStatus.CREATED,
  PDRStatus.PLAN_LOCKED,
  PDRStatus.MID_YEAR_APPROVED,
];

/**
 * Status values that allow CEO editing
 */
export const CEO_EDITABLE_STATUSES: PDRStatus[] = [
  PDRStatus.SUBMITTED,
  PDRStatus.PLAN_LOCKED,
  PDRStatus.MID_YEAR_SUBMITTED,
  PDRStatus.MID_YEAR_APPROVED,
  PDRStatus.END_YEAR_SUBMITTED,
  PDRStatus.COMPLETED,
];

/**
 * Human-readable status display names
 */
export const STATUS_DISPLAY_NAMES: Record<PDRStatus, string> = {
  [PDRStatus.CREATED]: 'Draft',
  [PDRStatus.SUBMITTED]: 'Submitted for Review',
  [PDRStatus.PLAN_LOCKED]: 'Plan Approved',
  [PDRStatus.MID_YEAR_SUBMITTED]: 'Mid-Year Submitted',
  [PDRStatus.MID_YEAR_APPROVED]: 'Mid-Year Approved',
  [PDRStatus.END_YEAR_SUBMITTED]: 'End-Year Submitted',
  [PDRStatus.COMPLETED]: 'Completed',
};

/**
 * Status descriptions
 */
export const STATUS_DESCRIPTIONS: Record<PDRStatus, string> = {
  [PDRStatus.CREATED]: 'PDR is being created by the employee',
  [PDRStatus.SUBMITTED]: 'PDR has been submitted and is awaiting CEO review',
  [PDRStatus.PLAN_LOCKED]: 'Initial PDR has been approved by CEO',
  [PDRStatus.MID_YEAR_SUBMITTED]: 'Mid-year review has been submitted',
  [PDRStatus.MID_YEAR_APPROVED]: 'Mid-year review has been approved by CEO',
  [PDRStatus.END_YEAR_SUBMITTED]: 'End-year review has been submitted',
  [PDRStatus.COMPLETED]: 'PDR cycle is complete',
};

/**
 * Check if employee can edit PDR with given status
 */
export function canEmployeeEdit(status: PDRStatus | string): boolean {
  return EMPLOYEE_EDITABLE_STATUSES.includes(status as PDRStatus);
}

/**
 * Check if CEO can edit PDR with given status
 */
export function canCEOEdit(status: PDRStatus | string): boolean {
  return CEO_EDITABLE_STATUSES.includes(status as PDRStatus);
}

/**
 * Get human-readable display name for status
 */
export function getStatusDisplayName(status: PDRStatus | string): string {
  return STATUS_DISPLAY_NAMES[status as PDRStatus] || status;
}

/**
 * Get description for status
 */
export function getStatusDescription(status: PDRStatus | string): string {
  return STATUS_DESCRIPTIONS[status as PDRStatus] || '';
}

/**
 * Check if status value is valid
 */
export function isValidStatus(status: string): status is PDRStatus {
  return Object.values(PDRStatus).includes(status as PDRStatus);
}

/**
 * Type guard to check if value is a PDRStatus enum value
 */
export function isPDRStatus(value: unknown): value is PDRStatus {
  return typeof value === 'string' && isValidStatus(value);
}

/**
 * Get all status values as array
 */
export function getAllStatuses(): PDRStatus[] {
  return Object.values(PDRStatus);
}

