import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PDRStatus, UserRole } from '@/types';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to Australian format (DD/MM/YYYY)
 */
export function formatDateAU(date: Date | string): string {
  if (!date) {
    return 'Invalid Date';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return format(dateObj, 'dd/MM/yyyy');
}

/**
 * Format date with time to Australian format
 */
export function formatDateTimeAU(date: Date | string): string {
  if (!date) {
    return 'Invalid Date';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return format(dateObj, 'dd/MM/yyyy HH:mm');
}

/**
 * Get relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(date: Date | string): string {
  if (!date) {
    return 'Invalid Date';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {return 'Just now';}
  if (diffInMinutes < 60) {return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;}
  if (diffInHours < 24) {return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;}
  if (diffInDays < 7) {return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;}
  
  return formatDateAU(dateObj);
}

/**
 * Get PDR status label for display
 */
export function getPDRStatusLabel(status: PDRStatus): string {
  const labels: Record<PDRStatus, string> = {
    Created: 'Draft',
    SUBMITTED: 'Under Review',
    PLAN_LOCKED: 'Plan Approved',
    MID_YEAR_SUBMITTED: 'Mid-Year Submitted',
    MID_YEAR_APPROVED: 'Mid-Year Approved',
    END_YEAR_SUBMITTED: 'End-Year Submitted',
    COMPLETED: 'Completed',
  };
  return labels[status];
}

/**
 * Get PDR status color class
 */
export function getPDRStatusColor(status: PDRStatus): string {
  const colors: Record<PDRStatus, string> = {
    Created: 'pdr-status-created',
    SUBMITTED: 'pdr-status-review',
    PLAN_LOCKED: 'pdr-status-approved',
    MID_YEAR_SUBMITTED: 'pdr-status-review',
    MID_YEAR_APPROVED: 'pdr-status-approved',
    END_YEAR_SUBMITTED: 'pdr-status-review',
    COMPLETED: 'pdr-status-completed',
  };
  return colors[status];
}

/**
 * Calculate PDR completion progress
 */
export function calculatePDRProgress(
  goals: Array<{ id: string }> = [],
  behaviors: Array<{ id: string }> = [],
  currentStep: number = 1,
  midYearReview?: { id: string } | null,
  endYearReview?: { id: string } | null
): number {
  let progress = 0;
  const stepWeight = 20; // Each step is worth 20%

  // Step 1: Goals (20%)
  if (goals.length > 0) {progress += stepWeight;}

  // Step 2: Behaviors (20%)
  if (behaviors.length > 0) {progress += stepWeight;}

  // Step 3: Review & Submit (20%)
  if (currentStep >= 3) {progress += stepWeight;}

  // Step 4: Mid-year (20%)
  if (midYearReview || currentStep >= 4) {progress += stepWeight;}

  // Step 5: End-year (20%)
  if (endYearReview || currentStep >= 5) {progress += stepWeight;}

  return Math.min(progress, 100);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {return text;}
  return text.substring(0, maxLength) + '...';
}

/**
 * Check if user can edit PDR
 */
export function canEditPDR(
  pdrStatus: PDRStatus,
  userRole: UserRole,
  isOwnPDR: boolean
): boolean {
  // CEO can always edit
  if (userRole === 'CEO') {return true;}

  // Employee can only edit their own unlocked PDRs
  return isOwnPDR && pdrStatus !== 'LOCKED' && pdrStatus !== 'COMPLETED';
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {return '0 Bytes';}

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
