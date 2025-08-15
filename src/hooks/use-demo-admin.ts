'use client';

import { useState, useEffect } from 'react';
import type { CEODashboardData, ActivityItem, PDR } from '@/types';

const DEMO_DASHBOARD_DATA: CEODashboardData = {
  stats: {
    totalEmployees: 25,
    completedPDRs: 18,
    pendingReviews: 7,
    averageRating: 4.2,
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

// Function to get all PDRs from localStorage
function getAllPDRsFromStorage(): PDR[] {
  const pdrs: PDR[] = [];
  
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    console.log('getAllPDRsFromStorage: Not in browser, returning empty array');
    return pdrs;
  }
  
  console.log('getAllPDRsFromStorage: Starting localStorage scan');
  
  // Get current PDR
  const currentPDR = localStorage.getItem('demo_current_pdr');
  console.log('getAllPDRsFromStorage: demo_current_pdr =', currentPDR);
  
  if (currentPDR) {
    try {
      const parsed = JSON.parse(currentPDR);
      console.log('getAllPDRsFromStorage: Parsed current PDR:', parsed);
      pdrs.push({
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        ...(parsed.submittedAt && { submittedAt: new Date(parsed.submittedAt) }),
      });
    } catch (error) {
      console.error('Error parsing current PDR:', error);
    }
  }
  
  // Check for any additional PDRs stored individually
  console.log('getAllPDRsFromStorage: Scanning localStorage for demo_pdr_ keys');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`getAllPDRsFromStorage: Found key ${i}:`, key);
    if (key && key.startsWith('demo_pdr_') && key !== 'demo_current_pdr') {
      try {
        const pdrData = localStorage.getItem(key);
        console.log(`getAllPDRsFromStorage: Data for ${key}:`, pdrData);
        if (pdrData) {
          const parsed = JSON.parse(pdrData);
          // Avoid duplicates
          if (!pdrs.some(pdr => pdr.id === parsed.id)) {
            pdrs.push({
              ...parsed,
              createdAt: new Date(parsed.createdAt),
              updatedAt: new Date(parsed.updatedAt),
              ...(parsed.submittedAt && { submittedAt: new Date(parsed.submittedAt) }),
            });
          }
        }
      } catch (error) {
        console.error('Error parsing PDR:', error);
      }
    }
  }
  
  console.log('getAllPDRsFromStorage: Final PDRs array:', pdrs);
  return pdrs;
}

export function useDemoAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<CEODashboardData>(DEMO_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    console.log('useDemoAdminDashboard: useEffect triggered');
    
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      try {
        // Get real PDRs from localStorage
        const realPDRs = getAllPDRsFromStorage();
        console.log('useDemoAdminDashboard: Got PDRs from storage:', realPDRs);
    
        // Create dynamic dashboard data
        const dynamicData: CEODashboardData = {
          stats: {
            totalEmployees: 25,
            completedPDRs: realPDRs.filter(pdr => pdr.status === 'COMPLETED').length,
            pendingReviews: realPDRs.filter(pdr => 
              pdr.status === 'SUBMITTED' || 
              pdr.status === 'OPEN_FOR_REVIEW' || 
              pdr.status === 'UNDER_REVIEW'
            ).length,
            averageRating: 4.2, // Keep static for demo
          },
          recentActivity: [
            // Add activity for real PDRs
            ...realPDRs.map((pdr, index) => ({
              id: `real-${pdr.id}`,
              type: 'PDR_SUBMITTED' as const,
              description: `Employee Demo submitted their PDR for review`,
              message: `Employee Demo submitted their PDR for review`,
              timestamp: pdr.submittedAt || pdr.updatedAt,
              userId: pdr.userId,
              user: {
                firstName: 'Employee',
                lastName: 'Demo',
              },
              priority: 'high' as const,
            })),
            // Keep some original demo activity
            ...DEMO_DASHBOARD_DATA.recentActivity.slice(0, 2),
          ].slice(0, 5), // Limit to 5 items
          pendingReviews: [
            // Add real pending PDRs
            ...realPDRs
              .filter(pdr => 
                pdr.status === 'SUBMITTED' || 
                pdr.status === 'OPEN_FOR_REVIEW' || 
                pdr.status === 'UNDER_REVIEW' ||
                pdr.status === 'Created'
              )
              .map(pdr => ({
                id: pdr.id,
                employeeName: 'Employee Demo',
                department: 'Demo Department', 
                submittedAt: pdr.submittedAt || pdr.createdAt,
                priority: 'HIGH' as const,
                status: pdr.status,
                user: {
                  firstName: 'Employee',
                  lastName: 'Demo',
                },
                period: {
                  name: pdr.fyLabel || '2024',
                },
              })),
            // Keep original demo reviews
            ...DEMO_DASHBOARD_DATA.pendingReviews,
          ],
        };
        
        console.log('useDemoAdminDashboard: Setting dashboard data:', dynamicData);
        setDashboardData(dynamicData);
        setIsLoading(false);
      } catch (error) {
        console.error('useDemoAdminDashboard: Error loading data:', error);
        setIsLoading(false);
      }
    }, 100); // 100ms delay to ensure localStorage is available

    return () => clearTimeout(timer);
  }, []);

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

// Function to get reviews data including real PDRs
export function useDemoReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('useDemoReviews: useEffect triggered');
    
    const timer = setTimeout(() => {
      try {
        const realPDRs = getAllPDRsFromStorage();
        console.log('useDemoReviews: Got PDRs from storage:', realPDRs);
    
    // Convert real PDRs to review format
    const realReviews = realPDRs.map(pdr => ({
      id: pdr.id,
      employeeName: 'Employee Demo',
      employeeEmail: 'employee@demo.com',
      department: 'Demo Department',
      submittedAt: pdr.submittedAt || pdr.createdAt,
      status: pdr.status === 'Created' ? 'pending_review' : 
              pdr.status === 'SUBMITTED' ? 'pending_review' :
              pdr.status === 'UNDER_REVIEW' ? 'under_review' :
              pdr.status === 'COMPLETED' ? 'completed' : 'pending_review',
      priority: 'HIGH',
      completionRate: pdr.status === 'COMPLETED' ? 100 :
                     pdr.status === 'SUBMITTED' ? 95 :
                     pdr.currentStep ? (pdr.currentStep / 5) * 100 : 20,
      lastActivity: pdr.updatedAt,
    }));

    // Static demo reviews
    const demoReviews = [
      {
        id: 'demo-pdr-1',
        employeeName: 'Alice Wilson',
        employeeEmail: 'alice.wilson@company.com',
        department: 'Engineering',
        submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'pending_review',
        priority: 'HIGH',
        completionRate: 95,
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: 'demo-pdr-2',
        employeeName: 'Bob Chen',
        employeeEmail: 'bob.chen@company.com',
        department: 'Marketing',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'under_review',
        priority: 'MEDIUM',
        completionRate: 88,
        lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        id: 'demo-pdr-3',
        employeeName: 'Carol Davis',
        employeeEmail: 'carol.davis@company.com',
        department: 'Sales',
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'completed',
        priority: 'LOW',
        completionRate: 100,
        lastActivity: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ];

        // Combine real and demo reviews
        const allReviews = [...realReviews, ...demoReviews];
        console.log('useDemoReviews: Setting reviews:', allReviews);
        setReviews(allReviews);
        setIsLoading(false);
      } catch (error) {
        console.error('useDemoReviews: Error loading data:', error);
        setIsLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return {
    data: reviews,
    isLoading,
    error: null,
  };
}
