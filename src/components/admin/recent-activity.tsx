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
import { ActivityItem } from '@/hooks/use-admin';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  onViewAll?: () => void;
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
  pdr_submitted: 'text-blue-600 bg-blue-100',
  review_completed: 'text-green-600 bg-green-100',
  deadline_approaching: 'text-orange-600 bg-orange-100',
  goal_added: 'text-purple-600 bg-purple-100',
  behavior_assessed: 'text-pink-600 bg-pink-100',
  general: 'text-gray-600 bg-gray-100',
};

const PRIORITY_BADGES = {
  high: { color: 'bg-red-100 text-red-800 border-red-200', label: 'High' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' },
  low: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Low' },
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

export function RecentActivity({ activities, isLoading, onViewAll }: RecentActivityProps) {
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
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || Activity;
            const colorClass = ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.general;
            const priorityBadge = PRIORITY_BADGES[activity.priority];

            return (
              <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {activity.user.firstName} {activity.user.lastName}
                        </span>
                      </div>
                      {activity.priority !== 'low' && (
                        <Badge className={`text-xs ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(new Date(activity.timestamp))}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.message}
                  </p>
                  
                  <p className="text-xs text-gray-400 mt-1">
                    {activity.user.email}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
