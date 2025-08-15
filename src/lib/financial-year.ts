/**
 * Australian Financial Year Utility
 * 
 * Australian FY runs from 1 July to 30 June.
 * If month >= 7, FY = current year to next year (e.g., 2025-2026).
 * If month <= 6, FY = previous year to current year (e.g., 2024-2025).
 */

export interface FinancialYear {
  label: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Computes the Australian Financial Year based on a given date
 * @param attemptDate - The date to compute FY for (defaults to current date)
 * @param timezone - The timezone to use (defaults to Australia/Adelaide)
 * @returns FinancialYear object with label, start date, and end date
 */
export function computeAustralianFY(
  attemptDate: Date = new Date(),
  timezone: string = 'Australia/Adelaide'
): FinancialYear {
  // Convert to Australian timezone to ensure correct date calculations
  const localDate = new Date(attemptDate.toLocaleString('en-US', { timeZone: timezone }));
  
  let startYear: number;
  let endYear: number;

  if (localDate.getMonth() >= 6) { // July = month 6 (0-indexed)
    // If month >= 7 (July or later), FY = current year to next year
    startYear = localDate.getFullYear();
    endYear = localDate.getFullYear() + 1;
  } else {
    // If month <= 6 (June or earlier), FY = previous year to current year
    startYear = localDate.getFullYear() - 1;
    endYear = localDate.getFullYear();
  }

  const label = `${startYear}-${endYear}`;
  const startDate = new Date(startYear, 6, 1); // July 1st (month 6)
  const endDate = new Date(endYear, 5, 30); // June 30th (month 5)

  return {
    label,
    startDate,
    endDate,
  };
}

/**
 * Checks if a given date falls within the specified Financial Year
 * @param date - The date to check
 * @param fy - The Financial Year to check against
 * @returns true if the date falls within the FY
 */
export function isDateInFY(date: Date, fy: FinancialYear): boolean {
  return date >= fy.startDate && date <= fy.endDate;
}

/**
 * Gets the current Australian Financial Year
 * @param timezone - The timezone to use (defaults to Australia/Adelaide)
 * @returns Current FinancialYear
 */
export function getCurrentAustralianFY(timezone: string = 'Australia/Adelaide'): FinancialYear {
  return computeAustralianFY(new Date(), timezone);
}

/**
 * Formats a Financial Year date range for display
 * @param fy - The Financial Year to format
 * @param format - The format type ('short' | 'long')
 * @returns Formatted string
 */
export function formatFYDateRange(fy: FinancialYear, format: 'short' | 'long' = 'short'): string {
  const startStr = format === 'short' 
    ? fy.startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : fy.startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    
  const endStr = format === 'short'
    ? fy.endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : fy.endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return `${startStr} - ${endStr}`;
}

/**
 * Validates if a Financial Year label is in the correct format
 * @param label - The FY label to validate (e.g., "2025-2026")
 * @returns true if valid format
 */
export function isValidFYLabel(label: string): boolean {
  const fyPattern = /^\d{4}-\d{4}$/;
  if (!fyPattern.test(label)) {
    return false;
  }

  const [startYear, endYear] = label.split('-').map(Number);
  return endYear === startYear + 1;
}

/**
 * Creates a Financial Year from a label string
 * @param label - The FY label (e.g., "2025-2026")
 * @returns FinancialYear object
 * @throws Error if label is invalid
 */
export function createFYFromLabel(label: string): FinancialYear {
  if (!isValidFYLabel(label)) {
    throw new Error(`Invalid Financial Year label: ${label}. Expected format: YYYY-YYYY`);
  }

  const [startYear, endYear] = label.split('-').map(Number);
  const startDate = new Date(startYear, 6, 1); // July 1st
  const endDate = new Date(endYear, 5, 30); // June 30th

  return {
    label,
    startDate,
    endDate,
  };
}
