import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, formatRelative } from 'date-fns';
import { enAU } from 'date-fns/locale';

/**
 * Combine classes with Tailwind CSS utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date in Australian format (DD/MM/YYYY)
 */
export function formatDateAU(
  date: Date | string,
  pattern: string = 'dd/MM/yyyy'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, pattern, { locale: enAU });
}

/**
 * Format date with time in Australian format
 */
export function formatDateTimeAU(
  date: Date | string,
  pattern: string = 'dd/MM/yyyy HH:mm'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, pattern, { locale: enAU });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), {
    addSuffix: true,
    locale: enAU,
  });
}

/**
 * Format date in a human-readable relative format
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatRelative(dateObj, new Date(), { locale: enAU });
}

/**
 * Generate initials from first and last name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Get full name from first and last name
 */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Convert PDR status to display label
 */
export function getPDRStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    MID_YEAR_CHECK: 'Mid-Year Check',
    END_YEAR_REVIEW: 'End-Year Review',
    COMPLETED: 'Completed',
    LOCKED: 'Locked',
  };
  return statusLabels[status] || status;
}

/**
 * Get PDR status color class
 */
export function getPDRStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    DRAFT: 'pdr-status-draft',
    SUBMITTED: 'pdr-status-submitted',
    UNDER_REVIEW: 'pdr-status-review',
    MID_YEAR_CHECK: 'pdr-status-midyear',
    END_YEAR_REVIEW: 'pdr-status-endyear',
    COMPLETED: 'pdr-status-completed',
    LOCKED: 'pdr-status-locked',
  };
  return statusColors[status] || 'pdr-status-draft';
}

/**
 * Convert priority to display label
 */
export function getPriorityLabel(priority: string): string {
  const priorityLabels: Record<string, string> = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };
  return priorityLabels[priority] || priority;
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    HIGH: 'text-red-600 bg-red-50 border-red-200',
    MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    LOW: 'text-green-600 bg-green-50 border-green-200',
  };
  return priorityColors[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Generate rating stars array
 */
export function getRatingStars(rating?: number): Array<{ filled: boolean }> {
  return Array.from({ length: 5 }, (_, index) => ({
    filled: rating ? index < rating : false,
  }));
}

/**
 * Calculate PDR completion percentage
 */
export function calculatePDRProgress(pdr: {
  goals?: unknown[];
  behaviors?: unknown[];
  midYearReview?: unknown;
  endYearReview?: unknown;
  currentStep: number;
}): number {
  const { goals = [], behaviors = [], midYearReview, endYearReview, currentStep } = pdr;
  
  let progress = 0;
  const stepWeight = 20; // Each step is worth 20%
  
  // Step 1: Goals (20%)
  if (goals.length > 0) {progress += stepWeight;}
  
  // Step 2: Behaviors (20%)
  if (behaviors.length > 0) {progress += stepWeight;}
  
  // Step 3: Review & Submit (20%)
  if (currentStep >= 3) {progress += stepWeight;}
  
  // Step 4: Mid-year (20%)
  if (midYearReview) {progress += stepWeight;}
  
  // Step 5: End-year (20%)
  if (endYearReview) {progress += stepWeight;}
  
  return Math.min(progress, 100);
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
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
  userRole: 'EMPLOYEE' | 'CEO',
  pdrUserId: string,
  currentUserId: string,
  isLocked: boolean
): boolean {
  // CEO can always edit
  if (userRole === 'CEO') {return true;}
  
  // Employee can only edit their own unlocked PDRs
  return pdrUserId === currentUserId && !isLocked;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
