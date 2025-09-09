/**
 * Permission utilities for role-based access control
 */

export type UserRole = 'EMPLOYEE' | 'CEO'

export interface Permission {
  name: string
  description: string
  roles: UserRole[]
}

// Define application permissions
export const PERMISSIONS = {
  // Employee permissions
  VIEW_OWN_PDR: {
    name: 'view_own_pdr',
    description: 'View own PDR data',
    roles: ['EMPLOYEE', 'CEO'] as UserRole[],
  },
  EDIT_OWN_PDR: {
    name: 'edit_own_pdr', 
    description: 'Edit own PDR data',
    roles: ['EMPLOYEE'] as UserRole[],
  },
  SUBMIT_PDR: {
    name: 'submit_pdr',
    description: 'Submit PDR for review',
    roles: ['EMPLOYEE'] as UserRole[],
  },

  // CEO permissions
  VIEW_ALL_PDRS: {
    name: 'view_all_pdrs',
    description: 'View all employee PDRs',
    roles: ['CEO'] as UserRole[],
  },
  REVIEW_PDRS: {
    name: 'review_pdrs',
    description: 'Review and approve PDRs',
    roles: ['CEO'] as UserRole[],
  },
  MANAGE_EMPLOYEES: {
    name: 'manage_employees',
    description: 'Manage employee accounts',
    roles: ['CEO'] as UserRole[],
  },
  VIEW_ANALYTICS: {
    name: 'view_analytics',
    description: 'View system analytics and reports',
    roles: ['CEO'] as UserRole[],
  },
  MANAGE_SYSTEM: {
    name: 'manage_system',
    description: 'Manage system settings',
    roles: ['CEO'] as UserRole[],
  },
  SALARY_REVIEW_ACCESS: {
    name: 'salary_review_access',
    description: 'Access salary review and calibration features',
    roles: ['CEO'] as UserRole[],
  },
} as const

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(userRole: UserRole | null, permission: Permission): boolean {
  if (!userRole) return false
  return permission.roles.includes(userRole)
}

/**
 * Check if a user can access their own PDR data
 */
export function canViewOwnPDR(userRole: UserRole | null): boolean {
  return hasPermission(userRole, PERMISSIONS.VIEW_OWN_PDR)
}

/**
 * Check if a user can edit their own PDR data
 */
export function canEditOwnPDR(userRole: UserRole | null): boolean {
  return hasPermission(userRole, PERMISSIONS.EDIT_OWN_PDR)
}

/**
 * Check if a user can view all PDRs (CEO only)
 */
export function canViewAllPDRs(userRole: UserRole | null): boolean {
  return hasPermission(userRole, PERMISSIONS.VIEW_ALL_PDRS)
}

/**
 * Check if a user can review PDRs (CEO only)
 */
export function canReviewPDRs(userRole: UserRole | null): boolean {
  return hasPermission(userRole, PERMISSIONS.REVIEW_PDRS)
}

/**
 * Check if a user can manage employees (CEO only)
 */
export function canManageEmployees(userRole: UserRole | null): boolean {
  return hasPermission(userRole, PERMISSIONS.MANAGE_EMPLOYEES)
}

/**
 * Check if a user can view analytics (CEO only)
 */
export function canViewAnalytics(userRole: UserRole | null): boolean {
  return hasPermission(userRole, PERMISSIONS.VIEW_ANALYTICS)
}

/**
 * Check if a user can access calibration features (CEO only)
 */
export function canAccessCalibration(userRole: UserRole | null): boolean {
  return hasPermission(userRole, PERMISSIONS.SALARY_REVIEW_ACCESS)
}

/**
 * Check if a user can access a specific PDR based on ownership
 */
export function canAccessPDR(
  userRole: UserRole | null, 
  pdrUserId: string, 
  currentUserId: string | null
): boolean {
  if (!userRole || !currentUserId) return false
  
  // CEO can access all PDRs
  if (userRole === 'CEO') return true
  
  // Employees can only access their own PDRs
  if (userRole === 'EMPLOYEE') {
    return pdrUserId === currentUserId
  }
  
  return false
}

/**
 * Get all permissions for a specific role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return Object.values(PERMISSIONS).filter(permission => 
    permission.roles.includes(role)
  )
}
