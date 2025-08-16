'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Star,
  Target,
  Heart,
  TrendingUp
} from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalEmployees: number;
    pendingReviews: number;
    completedPDRs: number;
    overduePDRs: number;
    averageRating: number;
    averageGoalRating: number;
    averageBehaviorRating: number;
  };
  isLoading?: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  const statItems = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      color: 'text-status-info',
      bgColor: 'bg-status-info/10',
      description: 'Active employees',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning/10',
      description: 'Awaiting your review',
      priority: stats.pendingReviews > 0,
    },
    {
      title: 'Completed PDRs',
      value: stats.completedPDRs,
      icon: CheckCircle,
      color: 'text-status-success',
      bgColor: 'bg-status-success/10',
      description: 'Finished this period',
    },
    {
      title: 'Overdue PDRs',
      value: stats.overduePDRs,
      icon: AlertTriangle,
      color: 'text-status-error',
      bgColor: 'bg-status-error/10',
      description: 'Require attention',
      priority: stats.overduePDRs > 0,
    },
  ];

  const ratingItems = [
    {
      title: 'Average Overall Rating',
      value: stats.averageRating > 0 ? `${stats.averageRating}/5` : '-',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Team performance',
    },
    {
      title: 'Average Goal Rating',
      value: stats.averageGoalRating > 0 ? `${stats.averageGoalRating}/5` : '-',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Goal achievement',
    },
    {
      title: 'Average Behavior Rating',
      value: stats.averageBehaviorRating > 0 ? `${stats.averageBehaviorRating}/5` : '-',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      description: 'Values alignment',
    },
    {
      title: 'Completion Rate',
      value: stats.totalEmployees > 0 
        ? `${Math.round((stats.completedPDRs / stats.totalEmployees) * 100)}%`
        : '0%',
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'PDR completion',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Primary Stats Loading */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Overview</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </CardTitle>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Rating Stats Loading */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </CardTitle>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4">Overview</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className={item.priority ? 'ring-2 ring-orange-200' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {item.title}
                    {item.priority && (
                      <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-200">
                        Action Required
                      </Badge>
                    )}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${item.bgColor}`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {item.value}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ratingItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {item.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${item.bgColor}`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {item.value}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
