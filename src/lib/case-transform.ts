/**
 * Utility functions for transforming object keys between snake_case and camelCase
 */

/**
 * Converts a snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Recursively transforms all keys in an object from snake_case to camelCase
 */
export function transformToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToCamelCase) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      transformed[camelKey] = transformToCamelCase(value);
    }
    
    return transformed as T;
  }

  return obj;
}

/**
 * Recursively transforms all keys in an object from camelCase to snake_case
 */
export function transformToSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToSnakeCase) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      transformed[snakeKey] = transformToSnakeCase(value);
    }
    
    return transformed as T;
  }

  return obj;
}

/**
 * Transforms PDR-specific fields from snake_case to camelCase
 * This handles the most common field mappings we use
 */
export function transformPDRFields(pdr: any): any {
  if (!pdr) return pdr;

  return {
    ...transformToCamelCase(pdr),
    // Ensure specific field mappings are correct
    userId: pdr.user_id || pdr.userId,
    periodId: pdr.period_id || pdr.periodId,
    fyLabel: pdr.fy_label || pdr.fyLabel,
    fyStartDate: pdr.fy_start_date || pdr.fyStartDate,
    fyEndDate: pdr.fy_end_date || pdr.fyEndDate,
    currentStep: pdr.current_step || pdr.currentStep,
    isLocked: pdr.is_locked !== undefined ? pdr.is_locked : pdr.isLocked,
    meetingBooked: pdr.meeting_booked !== undefined ? pdr.meeting_booked : pdr.meetingBooked,
    meetingBookedAt: pdr.meeting_booked_at || pdr.meetingBookedAt,
    lockedAt: pdr.locked_at || pdr.lockedAt,
    lockedBy: pdr.locked_by || pdr.lockedBy,
    submittedAt: pdr.submitted_at || pdr.submittedAt,
    createdAt: pdr.created_at || pdr.createdAt,
    updatedAt: pdr.updated_at || pdr.updatedAt,
    employeeFields: pdr.employee_fields || pdr.employeeFields,
    ceoFields: pdr.ceo_fields || pdr.ceoFields,
  };
}
