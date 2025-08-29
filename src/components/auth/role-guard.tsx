'use client'

import { ReactNode } from 'react'
import { useRole } from '@/providers/supabase-auth-provider'

interface RoleGuardProps {
  allowedRoles: ('EMPLOYEE' | 'CEO')[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { role, hasRole } = useRole()

  if (!role || !allowedRoles.some(allowedRole => hasRole(allowedRole))) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface EmployeeOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function EmployeeOnly({ children, fallback = null }: EmployeeOnlyProps) {
  return (
    <RoleGuard allowedRoles={['EMPLOYEE']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

interface CEOOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function CEOOnly({ children, fallback = null }: CEOOnlyProps) {
  return (
    <RoleGuard allowedRoles={['CEO']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}
