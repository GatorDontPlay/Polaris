'use client';

import { useState, useEffect } from 'react';
import type { CEODashboardData, ActivityItem, PDR } from '@/types';

// Real user data only - no simulated or seeded data

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
  
  // Get all localStorage keys and filter for PDR keys
  const allKeys = Object.keys(localStorage);
  const pdrKeys = allKeys.filter(key => key.startsWith('demo_pdr_') && key !== 'demo_current_pdr');
  console.log('getAllPDRsFromStorage: Found PDR keys:', pdrKeys);
  
  for (const key of pdrKeys) {
    try {
      const pdrData = localStorage.getItem(key);
      console.log(`getAllPDRsFromStorage: Data for ${key}:`, pdrData ? 'Found' : 'null');
      if (pdrData) {
        const parsed = JSON.parse(pdrData);
        console.log(`getAllPDRsFromStorage: Parsed ${key}:`, { id: parsed.id, status: parsed.status, isLocked: parsed.isLocked });
        // Avoid duplicates
        if (!pdrs.some(pdr => pdr.id === parsed.id)) {
          pdrs.push({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
            ...(parsed.submittedAt && { submittedAt: new Date(parsed.submittedAt) }),
          });
        } else {
          console.log(`getAllPDRsFromStorage: Skipping duplicate PDR ${parsed.id}`);
        }
      }
    } catch (error) {
      console.error(`getAllPDRsFromStorage: Error parsing PDR ${key}:`, error);
    }
  }
  
  console.log('getAllPDRsFromStorage: Final PDRs array:', pdrs);
  console.log('getAllPDRsFromStorage: PDR statuses:', pdrs.map(p => ({ id: p.id, status: p.status, submittedAt: p.submittedAt })));
  return pdrs;
}

export function useDemoAdminDashboard() {
  // Initialize with empty dashboard data - real user data only
  const [dashboardData, setDashboardData] = useState<CEODashboardData>({
    stats: {
      totalEmployees: 0,
      completedPDRs: 0,
      pendingReviews: 0,
      averageRating: 0,
    },
    recentActivity: [],
    pendingReviews: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to refresh dashboard data
  const refreshDashboard = () => {
    console.log('🔄 Dashboard refresh triggered');
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    console.log('useDemoAdminDashboard: useEffect triggered, refreshKey:', refreshKey);
    
    // Small delay to ensure component is mounted and localStorage is available
    const timer = setTimeout(() => {
      try {
        // Get real PDRs from localStorage
        const realPDRs = getAllPDRsFromStorage();
        console.log('useDemoAdminDashboard: Got PDRs from storage:', realPDRs);
    
        // Create dashboard data with ONLY real user data - no simulation
        const completedPDRs = realPDRs.filter(pdr => pdr.status === 'COMPLETED').length;
        const calibrationPDRs = realPDRs.filter(pdr => pdr.status === 'CALIBRATION').length;
        const pendingReviews = realPDRs.filter(pdr => 
          pdr.status === 'SUBMITTED' || 
          pdr.status === 'OPEN_FOR_REVIEW' || 
          pdr.status === 'UNDER_REVIEW' ||
          pdr.status === 'MID_YEAR_CHECK' ||
          pdr.status === 'CALIBRATION'
        ).length;
        
        const dynamicData: CEODashboardData = {
          stats: {
            totalEmployees: 1, // Only count real demo user
            completedPDRs: completedPDRs, // Only real completed PDRs
            pendingReviews: pendingReviews, // Only real pending reviews
            averageRating: completedPDRs > 0 ? 4.2 : 0, // Only show if there are real completions
          },
          recentActivity: [
            // Add dynamic activity for real PDRs based on status
            ...realPDRs.flatMap((pdr, index) => {
              const activities = [];
              
              // Helper function to format date to Adelaide time
              const formatAdelaideTime = (dateString: string) => {
                const date = new Date(dateString);
                return date.toLocaleString('en-AU', {
                  timeZone: 'Australia/Adelaide',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                });
              };
              
              // Generate activity based on current PDR status - show the most recent/relevant activity
              const getStatusLabel = (status: string) => {
                switch (status) {
                  case 'OPEN_FOR_REVIEW': return 'Open for Review';
                  case 'MID_YEAR_CHECK': return 'Mid-Year Check';
                  case 'CALIBRATION': return 'Calibration';
                  case 'PLAN_LOCKED': return 'Plan Locked';
                  case 'COMPLETED': return 'Completed';
                  default: return status;
                }
              };

              // Show activity based on current status
              if (pdr.status === 'MID_YEAR_CHECK' && pdr.midYearSubmittedAt) {
                activities.push({
                  id: `real-${pdr.id}-midyear`,
                  type: 'MID_YEAR_COMPLETED' as const,
                  employeeName: 'Employee Demo',
                  action: 'Mid-Year Check-in Completed',
                  performedBy: 'Employee Demo',
                  statusChange: 'OPEN_FOR_REVIEW → Mid-Year Check',
                  dateTime: formatAdelaideTime(pdr.midYearSubmittedAt),
                  description: `Employee Demo completed their mid-year check-in`,
                  message: `Mid-year check-in completed by Employee Demo\nStatus: ${getStatusLabel(pdr.status)}\n${formatAdelaideTime(pdr.midYearSubmittedAt)} (Adelaide)`,
                  timestamp: pdr.midYearSubmittedAt,
                  userId: pdr.userId,
                  user: {
                    firstName: 'Employee',
                    lastName: 'Demo',
                  },
                  priority: 'medium' as const,
                  pdr: { id: pdr.id },
                });
              } else if (pdr.status === 'CALIBRATION' && pdr.finalReviewCompletedAt) {
                activities.push({
                  id: `real-${pdr.id}-calibration`,
                  type: 'FINAL_REVIEW_COMPLETED' as const,
                  employeeName: 'Employee Demo',
                  action: 'Final Review Completed',
                  performedBy: 'CEO Admin',
                  statusChange: 'Mid-Year Check → Calibration',
                  dateTime: formatAdelaideTime(pdr.finalReviewCompletedAt),
                  description: `CEO completed final review for Employee Demo`,
                  message: `Final review completed by CEO Admin\nEmployee: Employee Demo\nStatus: ${getStatusLabel(pdr.status)}\n${formatAdelaideTime(pdr.finalReviewCompletedAt)} (Adelaide)`,
                  timestamp: pdr.finalReviewCompletedAt,
                  userId: 'ceo-user',
                  user: {
                    firstName: 'CEO',
                    lastName: 'Admin',
                  },
                  priority: 'high' as const,
                  pdr: { id: pdr.id },
                });
              } else if (pdr.submittedAt) {
                // Fallback to submission activity if no other recent activity
                activities.push({
                  id: `real-${pdr.id}-submitted`,
                  type: 'PDR_SUBMITTED' as const,
                  employeeName: 'Employee Demo',
                  action: 'PDR Submitted for Review',
                  performedBy: 'Employee Demo',
                  statusChange: 'Created → Open for Review',
                  dateTime: formatAdelaideTime(pdr.submittedAt),
                  description: `Employee Demo submitted their PDR for review`,
                  message: `PDR submitted by Employee Demo\nStatus: ${getStatusLabel(pdr.status)}\n${formatAdelaideTime(pdr.submittedAt)} (Adelaide)`,
                  timestamp: pdr.submittedAt,
                  userId: pdr.userId,
                  user: {
                    firstName: 'Employee',
                    lastName: 'Demo',
                  },
                  priority: 'high' as const,
                  pdr: { id: pdr.id },
                });
              }

              
              return activities;
            }),
            // Only real user activities - no simulated data
          ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort by most recent first
          .slice(0, 5), // Limit to 5 items
          pendingReviews: [
            // Only show PDRs that actually need CEO attention
            ...realPDRs
              .filter(pdr => {
                // Include PDRs that need CEO attention - including all review phases for filtering
                const needsCEOAction = ['SUBMITTED', 'OPEN_FOR_REVIEW', 'UNDER_REVIEW', 'PLAN_LOCKED', 'MID_YEAR_CHECK', 'END_YEAR_REVIEW', 'CALIBRATION', 'COMPLETED'].includes(pdr.status);
                console.log(`PDR ${pdr.id}: status=${pdr.status}, isLocked=${pdr.isLocked}, needsCEOAction=${needsCEOAction}`);
                return needsCEOAction;
              })
              .map(pdr => {
                // Calculate urgency based on submission date
                const submittedDate = new Date(pdr.submittedAt || pdr.updatedAt);
                const daysSinceSubmission = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
                const priority = daysSinceSubmission > 7 ? 'HIGH' : daysSinceSubmission > 3 ? 'MEDIUM' : 'LOW';
                
                return {
                  id: pdr.id,
                  employeeName: 'Employee Demo',
                  department: 'Demo Department', 
                  submittedAt: pdr.submittedAt || pdr.updatedAt,
                  priority: priority as 'HIGH' | 'MEDIUM' | 'LOW',
                  status: pdr.status,
                  daysSinceSubmission: daysSinceSubmission,
                  urgencyMessage: daysSinceSubmission > 7 ? 'Overdue' : 
                                daysSinceSubmission > 3 ? 'Due Soon' : 'Recently Submitted',
                  user: {
                    firstName: 'Employee',
                    lastName: 'Demo',
                  },
                  period: {
                    name: pdr.fyLabel || '2024',
                  },
                  actionRequired: 'Review and provide feedback',
                };
              })
              .sort((a, b) => b.daysSinceSubmission - a.daysSinceSubmission), // Sort by urgency (oldest first)
            // Only real pending reviews - no simulated data
          ],
        };
        
        console.log('useDemoAdminDashboard: Setting dashboard data:', dynamicData);
        console.log('useDemoAdminDashboard: Pending reviews details:', dynamicData.pendingReviews);
        console.log('useDemoAdminDashboard: Recent activity details:', dynamicData.recentActivity);
        console.log('useDemoAdminDashboard: Stats:', dynamicData.stats);
        setDashboardData(dynamicData);
        setIsLoading(false);
      } catch (error) {
        console.error('useDemoAdminDashboard: Error loading data:', error);
        setIsLoading(false);
      }
    }, 100); // 100ms delay to ensure localStorage is available

    return () => clearTimeout(timer);
  }, [refreshKey]);

  // Also listen for localStorage changes (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith('demo_pdr_') || e.key === 'demo_current_pdr')) {
        console.log('📡 Storage change detected for:', e.key);
        refreshDashboard();
      }
    };

    // Listen for custom events (same-tab communication)
    const handleCustomEvent = () => {
      console.log('📡 Custom PDR change event detected');
      refreshDashboard();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('demo-pdr-changed', handleCustomEvent);
    window.addEventListener('demo-audit-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('demo-pdr-changed', handleCustomEvent);
      window.removeEventListener('demo-audit-updated', handleCustomEvent);
    };
  }, [refreshDashboard]);

  return {
    data: dashboardData,
    isLoading,
    error,
    refreshDashboard,
  };
}

export function useDemoEmployees() {
  // Real employee data only - no simulated data
  const employees: any[] = [];

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
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to refresh data
  const refreshReviews = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshKey(prev => prev + 1);
  };

  // Function to load and process PDR data
  const loadReviewsData = () => {
    console.log('🔍 useDemoReviews: Loading reviews data, refreshKey:', refreshKey);
    
    try {
      const realPDRs = getAllPDRsFromStorage();
      console.log('📊 useDemoReviews: Got PDRs from storage:', realPDRs);
      console.log('📈 useDemoReviews: PDR statuses:', realPDRs.map(pdr => ({ 
        id: pdr.id, 
        status: pdr.status, 
        isLocked: pdr.isLocked,
        updatedAt: pdr.updatedAt 
      })));
  
      // Convert real PDRs to review format
      const realReviews = realPDRs.map(pdr => {
        // More robust status mapping with explicit handling
        let reviewStatus;
        console.log(`🔍 Processing PDR ${pdr.id}: raw status = "${pdr.status}" (type: ${typeof pdr.status})`);
        
        switch (pdr.status) {
          case 'PLAN_LOCKED':
            reviewStatus = 'locked';
            break;
          case 'COMPLETED':
            reviewStatus = 'completed';
            break;
          case 'UNDER_REVIEW':
            reviewStatus = 'under_review';
            break;
          case 'SUBMITTED':
            reviewStatus = 'pending_review';
            break;
          case 'Created':
            reviewStatus = 'pending_review';
            break;
          case undefined:
          case null:
          case '':
            console.warn(`⚠️ PDR ${pdr.id} has empty/null status, defaulting to pending_review`);
            reviewStatus = 'pending_review';
            break;
          default:
            console.warn(`⚠️ PDR ${pdr.id} has unmapped status "${pdr.status}", defaulting to pending_review`);
            reviewStatus = 'pending_review';
        }

        console.log(`🔄 PDR ${pdr.id}: "${pdr.status}" → "${reviewStatus}"`);

        return {
          id: pdr.id,
          employeeName: 'Employee Demo',
          employeeEmail: 'employee@demo.com',
          department: 'Demo Department',
          submittedAt: pdr.submittedAt || pdr.createdAt,
          status: reviewStatus,
          priority: 'HIGH',
          completionRate: pdr.status === 'COMPLETED' ? 100 :
                         pdr.status === 'PLAN_LOCKED' ? 100 :
                         pdr.status === 'SUBMITTED' ? 95 :
                         pdr.currentStep ? (pdr.currentStep / 5) * 100 : 20,
          lastActivity: pdr.updatedAt,
        };
      });

      // Only use real reviews - no simulated data
      const allReviews = realReviews;
      console.log('✅ useDemoReviews: Final reviews array:', allReviews);
      console.log('📊 useDemoReviews: Review statuses:', allReviews.map(r => ({ id: r.id, status: r.status })));
      
      setReviews(allReviews);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ useDemoReviews: Error loading data:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useDemoReviews: useEffect triggered, refreshKey:', refreshKey);
    
    const timer = setTimeout(() => {
      loadReviewsData();
    }, 100);

    return () => clearTimeout(timer);
  }, [refreshKey]);

  return {
    data: reviews,
    isLoading,
    error: null,
    refreshReviews,
  };
}
