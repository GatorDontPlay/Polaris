// Demo audit logging system - tracks real user actions in localStorage
import { ActivityItem } from '@/types';

export interface DemoAuditLog {
  id: string;
  userId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: 'pdrs' | 'goals' | 'behaviors' | 'mid_year_reviews' | 'end_year_reviews';
  recordId: string;
  oldValues?: any;
  newValues?: any;
  changedAt: Date;
}

// Get demo user from localStorage
function getCurrentDemoUser() {
  try {
    const userData = localStorage.getItem('demo_user');
    if (userData) {
      const user = JSON.parse(userData);
      return user;
    }
  } catch (error) {
    console.warn('Failed to get demo user:', error);
  }
  return null;
}

// Store audit log in localStorage
export function logDemoAudit(log: Omit<DemoAuditLog, 'id' | 'userId' | 'changedAt'>) {
  const user = getCurrentDemoUser();
  if (!user) {
    console.warn('No demo user found for audit logging. Checking localStorage keys:', Object.keys(localStorage).filter(k => k.includes('demo')));
    return;
  }

  const auditLog: DemoAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id,
    changedAt: new Date(),
    ...log,
  };

  try {
    const existingLogs = getDemoAuditLogs();
    const updatedLogs = [auditLog, ...existingLogs].slice(0, 100); // Keep last 100 logs
    localStorage.setItem('demo_audit_logs', JSON.stringify(updatedLogs));
    
    console.log('Demo audit log created:', {
      action: log.action,
      table: log.tableName,
      user: `${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    console.error('Failed to store audit log:', error);
  }
}

// Get all audit logs from localStorage
export function getDemoAuditLogs(): DemoAuditLog[] {
  try {
    const logs = localStorage.getItem('demo_audit_logs');
    if (logs) {
      const parsed = JSON.parse(logs);
      // Convert date strings back to Date objects
      return parsed.map((log: any) => ({
        ...log,
        changedAt: new Date(log.changedAt),
      }));
    }
  } catch (error) {
    console.error('Failed to get audit logs:', error);
  }
  return [];
}

// Get audit logs for specific user
export function getDemoUserAuditLogs(userId?: string, limit: number = 10): DemoAuditLog[] {
  const allLogs = getDemoAuditLogs();
  const userLogs = userId 
    ? allLogs.filter(log => log.userId === userId)
    : allLogs; // If no userId provided, get current user's logs
  
  return userLogs.slice(0, limit);
}

// Convert audit logs to activity items for Recent Activity component
export function convertAuditLogsToActivity(logs: DemoAuditLog[]): ActivityItem[] {
  const user = getCurrentDemoUser();
  if (!user) return [];

  return logs
    .map(log => {
      let type: ActivityItem['type'] = 'pdr_submitted';
      let message = '';
      let priority: 'low' | 'medium' | 'high' = 'low';

      switch (log.tableName) {
        case 'pdrs':
          if (log.action === 'UPDATE') {
            const newValues = log.newValues as any;
            if (newValues?.status === 'SUBMITTED') {
              type = 'pdr_submitted';
              message = 'submitted PDR for review';
              priority = 'medium';
            } else if (newValues?.status === 'COMPLETED') {
              type = 'review_completed';
              message = 'completed PDR';
              priority = 'low';
            } else if (newValues?.status === 'DRAFT') {
              type = 'pdr_submitted';
              message = 'updated PDR';
              priority = 'low';
            }
          } else if (log.action === 'INSERT') {
            type = 'pdr_submitted';
            message = 'created new PDR';
            priority = 'medium';
          } else if (log.action === 'DELETE') {
            type = 'pdr_submitted';
            message = 'deleted PDR';
            priority = 'medium';
          }
          break;

        case 'goals':
          if (log.action === 'INSERT') {
            type = 'goal_added';
            message = 'added a new goal';
            priority = 'low';
          } else if (log.action === 'UPDATE') {
            const newValues = log.newValues as any;
            const oldValues = log.oldValues as any;
            
            if (newValues?.employeeRating && newValues.employeeRating !== oldValues?.employeeRating) {
              type = 'goal_added';
              message = 'self-rated a goal';
              priority = 'low';
            } else {
              type = 'goal_added';
              message = 'updated a goal';
              priority = 'low';
            }
          } else if (log.action === 'DELETE') {
            type = 'goal_added';
            message = 'deleted a goal';
            priority = 'low';
          }
          break;

        case 'behaviors':
          if (log.action === 'INSERT') {
            type = 'behavior_assessed';
            message = 'added behavior assessment';
            priority = 'low';
          } else if (log.action === 'UPDATE') {
            const newValues = log.newValues as any;
            const oldValues = log.oldValues as any;
            
            if (newValues?.employeeRating && newValues.employeeRating !== oldValues?.employeeRating) {
              type = 'behavior_assessed';
              message = 'self-rated behavior';
              priority = 'low';
            } else {
              type = 'behavior_assessed';
              message = 'updated behavior assessment';
              priority = 'low';
            }
          } else if (log.action === 'DELETE') {
            type = 'behavior_assessed';
            message = 'deleted behavior assessment';
            priority = 'low';
          }
          break;

        case 'mid_year_reviews':
          if (log.action === 'INSERT') {
            type = 'review_completed';
            message = 'submitted mid-year review';
            priority = 'medium';
          }
          break;

        case 'end_year_reviews':
          if (log.action === 'INSERT') {
            type = 'review_completed';
            message = 'submitted end-year review';
            priority = 'medium';
          }
          break;
      }

      // Only return activities with meaningful messages
      if (!message) return null;

      return {
        id: log.id,
        type,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        message,
        timestamp: log.changedAt,
        priority,
      };
    })
    .filter((activity): activity is ActivityItem => activity !== null);
}

// Clear audit logs (for cleanup)
export function clearDemoAuditLogs() {
  localStorage.removeItem('demo_audit_logs');
}

// Debug function to view audit logs in console
export function debugDemoAuditLogs() {
  const logs = getDemoAuditLogs();
  console.log('Demo Audit Logs:', logs);
  console.log('Total logs:', logs.length);
  
  if (logs.length > 0) {
    console.log('Recent activity:');
    const activities = convertAuditLogsToActivity(logs.slice(0, 10));
    activities.forEach(activity => {
      console.log(`- ${activity.type}: ${activity.message} (${activity.timestamp.toLocaleTimeString()})`);
    });
  }
  
  return logs;
}

// Test audit logging system
export function testDemoAudit() {
  const user = getCurrentDemoUser();
  console.log('Testing demo audit system:');
  console.log('User found:', !!user);
  if (user) {
    console.log('User details:', { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email });
    
    // Test logging a sample audit
    logDemoAudit({
      action: 'INSERT',
      tableName: 'pdrs',
      recordId: 'test-record',
      newValues: { test: 'data' },
    });
    
    console.log('Test audit log created. Check debugDemoAuditLogs() to verify.');
  } else {
    console.log('Available localStorage keys:', Object.keys(localStorage).filter(k => k.includes('demo')));
  }
}

// Make debug function available globally for easy access
if (typeof window !== 'undefined') {
  (window as any).debugDemoAuditLogs = debugDemoAuditLogs;
  (window as any).clearDemoAuditLogs = clearDemoAuditLogs;
  (window as any).testDemoAudit = testDemoAudit;
}
