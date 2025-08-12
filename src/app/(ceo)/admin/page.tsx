'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useCEODashboard } from '@/hooks/use-admin';
import { DashboardStats } from '@/components/admin/dashboard-stats';
import { RecentActivity } from '@/components/admin/recent-activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import {
  Crown,
  Users,
  FileText,
  PieChart,
  Settings,
  Eye,
  TrendingUp,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

export default function CEODashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: dashboardData, isLoading: dashboardLoading, error } = useCEODashboard();

  // Redirect if not authenticated or not CEO
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'CEO')) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Show loading state
  if (authLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Dashboard Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Unable to load dashboard data. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render if not authenticated or not CEO
  if (!isAuthenticated || user?.role !== 'CEO' || !dashboardData) {
    return null;
  }

  const { stats, recentActivity, pendingReviews, statusDistribution } = dashboardData;

  const quickActions = [
    {
      title: 'Employee Overview',
      description: 'View all employees and their PDR status',
      icon: Users,
      href: '/admin/employees',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Review PDRs',
      description: 'Review pending employee assessments',
      icon: FileText,
      href: '/admin/pdrs',
      color: 'bg-green-600 hover:bg-green-700',
      badge: stats.pendingReviews > 0 ? stats.pendingReviews : undefined,
    },
    {
      title: 'Reports & Analytics',
      description: 'View performance reports and trends',
      icon: PieChart,
      href: '/admin/reports',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      title: 'Company Values',
      description: 'Manage organizational values',
      icon: Settings,
      href: '/admin/company-values',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  CEO Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user.firstName}! Here's your organizational overview.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date().toLocaleDateString('en-AU', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="mb-8">
          <DashboardStats stats={stats} isLoading={false} />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(action.href)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${action.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      {action.badge && (
                        <Badge className="bg-red-100 text-red-800">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {action.description}
                    </p>
                    <div className="flex items-center text-sm text-blue-600">
                      <span>Go to {action.title.toLowerCase()}</span>
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div>
            <RecentActivity 
              activities={recentActivity}
              isLoading={false}
              onViewAll={() => router.push('/admin/audit')}
            />
          </div>

          {/* Pending Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Pending Reviews ({stats.pendingReviews})
                </div>
                {stats.pendingReviews > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/admin/pdrs?status=SUBMITTED,UNDER_REVIEW')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReviews.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-600">All caught up! No pending reviews.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.slice(0, 5).map((pdr) => (
                    <div 
                      key={pdr.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/admin/pdr/${pdr.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {pdr.user?.firstName} {pdr.user?.lastName}
                          </h4>
                          <PDRStatusBadge status={pdr.status} />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {pdr.period?.name || 'Current Period'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Updated {new Date(pdr.updatedAt).toLocaleDateString('en-AU')}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-gray-400 ml-4" />
                    </div>
                  ))}
                  
                  {pendingReviews.length > 5 && (
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push('/admin/pdrs?status=SUBMITTED,UNDER_REVIEW')}
                      >
                        View {pendingReviews.length - 5} more
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        {statusDistribution.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  PDR Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {statusDistribution.map((item) => (
                    <div key={item.status} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {item.count}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {item.percentage}%
                      </div>
                      <PDRStatusBadge status={item.status as any} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}