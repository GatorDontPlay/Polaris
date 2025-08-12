'use client';

import { useState } from 'react';
import type { CEODashboardData, ActivityItem } from '@/types';

const DEMO_DASHBOARD_DATA: CEODashboardData = {
  stats: {
    totalEmployees: 25,
    completedPDRs: 18,
    pendingReviews: 7,
    avgRating: 4.2,
  },
  recentActivity: [
    {
      id: '1',
      type: 'PDR_SUBMITTED',
      description: 'John Smith submitted their PDR for review',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      userId: 'user-1',
    },
    {
      id: '2',
      type: 'GOAL_COMPLETED',
      description: 'Sarah Johnson completed Q3 project milestone',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      userId: 'user-2',
    },
    {
      id: '3',
      type: 'REVIEW_APPROVED',
      description: 'Mid-year review approved for Michael Brown',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      userId: 'user-3',
    },
  ],
  pendingReviews: [
    {
      id: 'pdr-1',
      employeeName: 'Alice Wilson',
      department: 'Engineering',
      submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      priority: 'HIGH' as const,
    },
    {
      id: 'pdr-2',
      employeeName: 'Bob Chen',
      department: 'Marketing',
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      priority: 'MEDIUM' as const,
    },
    {
      id: 'pdr-3',
      employeeName: 'Carol Davis',
      department: 'Sales',
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      priority: 'LOW' as const,
    },
  ],
};

export function useDemoAdminDashboard() {
  const [dashboardData] = useState<CEODashboardData>(DEMO_DASHBOARD_DATA);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return {
    data: dashboardData,
    isLoading,
    error,
  };
}

export function useDemoEmployees() {
  const employees = [
    {
      id: 'emp-1',
      name: 'John Smith',
      email: 'john.smith@company.com',
      department: 'Engineering',
      role: 'Senior Developer',
      status: 'Active',
      lastPDR: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
    {
      id: 'emp-2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      department: 'Product',
      role: 'Product Manager',
      status: 'Active',
      lastPDR: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    },
    {
      id: 'emp-3',
      name: 'Michael Brown',
      email: 'michael.brown@company.com',
      department: 'Design',
      role: 'UX Designer',
      status: 'Active',
      lastPDR: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
    },
    {
      id: 'emp-4',
      name: 'Alice Wilson',
      email: 'alice.wilson@company.com',
      department: 'Engineering',
      role: 'Frontend Developer',
      status: 'Active',
      lastPDR: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  ];

  return {
    data: employees,
    isLoading: false,
    error: null,
  };
}
