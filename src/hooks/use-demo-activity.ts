'use client';

import { useState, useEffect } from 'react';
import { ActivityItem } from '@/types';
import { getDemoUserAuditLogs, convertAuditLogsToActivity } from '@/lib/demo-audit';

// Hook for demo user's recent activity - reads from localStorage audit logs
export function useDemoUserActivity(limit: number = 10) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get audit logs from localStorage
        const auditLogs = getDemoUserAuditLogs(undefined, limit);
        
        // Convert to activity items
        const activityItems = convertAuditLogsToActivity(auditLogs);
        
        setActivities(activityItems);
      } catch (err) {
        console.error('Failed to fetch demo activity:', err);
        setError('Failed to load recent activity');
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchActivities();

    // Listen for storage changes to update activity in real-time
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'demo_audit_logs') {
        fetchActivities();
      }
    };

    // Listen for custom events when audit logs are updated
    const handleAuditUpdate = () => {
      fetchActivities();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('demo-audit-updated', handleAuditUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('demo-audit-updated', handleAuditUpdate);
    };
  }, [limit]);

  // Trigger refetch when called
  const refetch = () => {
    const auditLogs = getDemoUserAuditLogs(undefined, limit);
    const activityItems = convertAuditLogsToActivity(auditLogs);
    setActivities(activityItems);
  };

  return {
    data: activities,
    isLoading,
    error,
    refetch,
  };
}
