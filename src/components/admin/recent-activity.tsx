'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity,
  Send,
  CheckCircle,
  Clock,
  Target,
  Heart,
  User,
  Eye
} from 'lucide-react';
import { ActivityItem } from '@/types';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  onViewAll?: () => void;
  isUserActivity?: boolean; // New prop to indicate if this is user-specific activity
}

const ACTIVITY_ICONS = {
  pdr_submitted: Send,
  review_completed: CheckCircle,
  deadline_approaching: Clock,
  goal_added: Target,
  behavior_assessed: Heart,
  general: Activity,
};

const ACTIVITY_COLORS = {
  pdr_submitted: 'text-activity-submission bg-activity-submission-background',
  review_completed: 'text-activity-review bg-activity-review-background',
  deadline_approaching: 'text-activity-deadline bg-activity-deadline-background',
  goal_added: 'text-activity-goal bg-activity-goal-background',
  behavior_assessed: 'text-activity-behavior bg-activity-behavior-background',
  general: 'text-activity-general bg-activity-general-background',
};

const PRIORITY_BADGES = {
  high: { color: 'bg-priority-high-background text-priority-high border-priority-high/20', label: 'High' },
  medium: { color: 'bg-priority-medium-background text-priority-medium border-priority-medium/20', label: 'Medium' },
  low: { color: 'bg-priority-low-background text-priority-low border-priority-low/20', label: 'Low' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {return 'Just now';}
  if (diffInMinutes < 60) {return `${diffInMinutes}m ago`;}
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {return `${diffInHours}h ago`;}
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {return `${diffInDays}d ago`;}
  
  return date.toLocaleDateString('en-AU', { 
    day: '2-digit', 
    month: 'short' 
  });
}

export function RecentActivity({ activities, isLoading, onViewAll, isUserActivity = false }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-1 min-h-[140px]">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || Activity;
            const colorClass = ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.general;
            const priorityBadge = PRIORITY_BADGES[activity.priority];

            return (
              <div key={activity.id} className="flex items-center space-x-1.5 px-2 py-1 rounded-full hover:bg-muted/30 transition-colors text-sm">
                <div className={`p-0.5 rounded-full ${colorClass}`}>
                  <Icon className="h-2.5 w-2.5" />
                </div>
                
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 truncate">
                    {activity.priority !== 'low' && (
                      <Badge className={`text-xs px-1 py-0 h-3.5 ${priorityBadge.color}`}>
                        {priorityBadge.label}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {isUserActivity ? `You ${activity.message}` : `${activity.user.firstName} ${activity.user.lastName} ${activity.message}`}
                    </span>
                  </div>
                  
                  <span className="text-xs text-muted-foreground/70 ml-1 flex-shrink-0">
                    {formatTimeAgo(new Date(activity.timestamp))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
