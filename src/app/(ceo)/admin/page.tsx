'use client';

import { useEffect, useState } from 'react';
import { useCEODashboard } from '@/hooks/use-admin';
import { useSupabaseAdminDashboard } from '@/hooks/use-supabase-pdrs';
import { useAuth } from '@/providers/supabase-auth-provider';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { PDRManagementDashboard } from '@/components/admin/pdr-management-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Plus,
  Eye,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

const StatCard = ({ title, value, change, changeType, icon: Icon }: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className={`text-xs ${
        changeType === 'positive' ? 'text-green-600' : 
        changeType === 'negative' ? 'text-red-600' : 
        'text-muted-foreground'
      }`}>
        {change}
      </p>
    </CardContent>
  </Card>
);

export default function CEODashboard() {
  console.log('CEODashboard component mounted');
  
  // Get authenticated user
  const { user } = useAuth();
  
  // Filter state for pending reviews
  const [pendingReviewsFilter, setPendingReviewsFilter] = useState<'goal-setting' | 'mid-year' | 'year-end' | 'calibration' | 'closed'>('goal-setting');
  
  // Use Supabase admin dashboard
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refreshDashboard
  } = useSupabaseAdminDashboard();

  // React Query handles auto-refresh and caching automatically

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <AdminHeader 
          breadcrumbs={[
            { label: 'Dashboard' }
          ]}
        />
        <div className="flex-1 space-y-4 p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading CEO dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <AdminHeader 
          breadcrumbs={[
            { label: 'Dashboard' }
          ]}
        />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Dashboard Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Error: {error?.message || 'Unable to load dashboard data'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Please ensure you are logged in with CEO credentials.
              </p>
              <div className="space-y-2">
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/login'}>
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const allPendingReviews = dashboardData?.pendingReviews || [];
  
  // Calculate counts for each filter category
  const goalSettingCount = allPendingReviews.filter((review: any) => review.status === 'SUBMITTED').length;

  // Debug logging after all variables are declared
  console.log('CEO Dashboard Debug:', { 
    dashboardData, 
    isLoading, 
    error: error?.message || error,
    hasData: !!dashboardData,
    statsExists: !!dashboardData?.stats,
    pendingReviewsCount: allPendingReviews?.length || 0,
    pendingReviewsData: allPendingReviews,
    goalSettingCount
  });
  const midYearCount = allPendingReviews.filter((review: any) => review.status === 'PLAN_LOCKED' || review.status === 'LOCKED' || review.status === 'MID_YEAR_CHECK').length;
  const yearEndCount = allPendingReviews.filter((review: any) => review.status === 'FINAL_REVIEW' || review.status === 'END_YEAR_REVIEW').length;
  const calibrationCount = allPendingReviews.filter((review: any) => review.status === 'COMPLETED').length;
  const closedCount = allPendingReviews.filter((review: any) => review.status === 'COMPLETED').length;
  
  // Filter pending reviews based on selected filter
  const pendingReviews = allPendingReviews.filter((review: any) => {
    switch (pendingReviewsFilter) {
      case 'goal-setting':
        return review.status === 'SUBMITTED' || review.status === 'UNDER_REVIEW';
      case 'mid-year':
        return review.status === 'PLAN_LOCKED';
      case 'year-end':
        return review.status === 'FINAL_REVIEW';
      case 'calibration':
        return review.status === 'COMPLETED';
      case 'closed':
        return review.status === 'COMPLETED';
      default:
        return true;
    }
  });

  return (
    <div className="flex flex-col min-h-0">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard' }
        ]}
      />

      <div className="flex-1 space-y-6 p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Welcome back!"
            description="Your PDRs in progress or awaiting your review..."
          />

        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={stats?.totalEmployees?.toString() || '0'}
            change={stats?.totalEmployees ? `${stats.totalEmployees} active employees` : 'No employees yet'}
            changeType="neutral"
            icon={Users}
          />
          <StatCard
            title="Completed PDRs"
            value={stats?.completedPDRs?.toString() || '0'}
            change={stats?.completedPDRs ? `${stats.completedPDRs} reviews completed` : 'No completed PDRs'}
            changeType={stats?.completedPDRs ? "positive" : "neutral"}
            icon={FileText}
          />
          <StatCard
            title="Pending Reviews"
            value={stats?.pendingReviews?.toString() || '0'}
            change={stats?.pendingReviews ? `${stats.pendingReviews} awaiting review` : 'All caught up!'}
            changeType={stats?.pendingReviews ? "neutral" : "positive"}
            icon={Clock}
          />
          <StatCard
            title="Avg Rating"
            value={stats?.averageRating ? `${stats.averageRating.toFixed(1)}` : '0.0'}
            change={stats?.averageRating ? `Based on ${stats.completedPDRs || 0} reviews` : 'No ratings yet'}
            changeType="neutral"
            icon={TrendingUp}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Organization-wide Activity</CardTitle>
                  <CardDescription className="text-xs">
                    All employee PDR activities (last 14 days)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 px-3">
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {recentActivity.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground text-sm">
                        No recent activity
                      </p>
                    ) : (
                      recentActivity.slice(0, 6).map((activity: any) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 rounded border bg-card/50 hover:bg-accent/30 transition-colors">
                          <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                            <AvatarFallback className="text-xs">
                              {activity.user?.firstName?.[0]}{activity.user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">
                                  {`${activity.user?.firstName || 'Unknown'} ${activity.user?.lastName || 'User'}`}
                                </span>
                                <div className="text-xs text-muted-foreground mt-0.5 break-words">
                                  {activity.message}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0 mt-1 sm:mt-0">
                                <Badge 
                                  variant={
                                    activity.priority === 'high' ? 'destructive' :
                                    activity.priority === 'medium' ? 'default' :
                                    'secondary'
                                  }
                                  className="text-xs h-5 px-1"
                                >
                                  {activity.type === 'MID_YEAR_COMPLETED' ? 'MID-YEAR DONE' :
                                   activity.type === 'FINAL_REVIEW_COMPLETED' ? 'FINAL REVIEW' :
                                   activity.type === 'PDR_SUBMITTED' ? 'PDR SUBMITTED' :
                                   activity.type.replace('_', ' ')}
                                </Badge>
                                {activity.pdr && (
                                  <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                                    <Link href={`/admin/reviews/${activity.pdr.id}`}>
                                      <Eye className="h-3 w-3" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.timestamp).toLocaleString('en-AU', { 
                                timeZone: 'Australia/Adelaide',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">All Pending Reviews</CardTitle>
                  <CardDescription className="text-xs">
                    Employees requiring CEO review
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {/* Filter Tabs */}
                  <div className="mb-3">
                    <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                      <button
                        onClick={() => setPendingReviewsFilter('goal-setting')}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                          pendingReviewsFilter === 'goal-setting' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'hover:bg-muted-foreground/10'
                        }`}
                      >
                        Goal Setting
                        {goalSettingCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                            {goalSettingCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setPendingReviewsFilter('mid-year')}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                          pendingReviewsFilter === 'mid-year' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'hover:bg-muted-foreground/10'
                        }`}
                      >
                        Mid Year Checkin
                        {midYearCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                            {midYearCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setPendingReviewsFilter('year-end')}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                          pendingReviewsFilter === 'year-end' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'hover:bg-muted-foreground/10'
                        }`}
                      >
                        Year End Review
                        {yearEndCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                            {yearEndCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setPendingReviewsFilter('calibration')}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                          pendingReviewsFilter === 'calibration' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'hover:bg-muted-foreground/10'
                        }`}
                      >
                        Calibration
                        {calibrationCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                            {calibrationCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setPendingReviewsFilter('closed')}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                          pendingReviewsFilter === 'closed' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'hover:bg-muted-foreground/10'
                        }`}
                      >
                        Closed
                        {closedCount > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                            {closedCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    <div className="space-y-2 pr-1">
                      {pendingReviews.length === 0 ? (
                        <div className="text-center py-4">
                          <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">All caught up!</p>
                        </div>
                      ) : (
                        pendingReviews.map((review: any) => {
                          // Calculate days since submission
                          const submittedDate = review.submittedAt ? new Date(review.submittedAt) : new Date(review.updatedAt);
                          const daysSince = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
                          const priority = daysSince > 7 ? 'HIGH' : daysSince > 3 ? 'MEDIUM' : 'LOW';
                          
                          return (
                            <div key={review.id} className="flex items-center gap-3 p-3 rounded border bg-card/50 hover:bg-accent/30 transition-colors min-h-[3.5rem]">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs">
                                  {review.user?.firstName?.[0] || 'U'}{review.user?.lastName?.[0] || 'N'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium truncate">
                                      {review.user ? `${review.user.firstName} ${review.user.lastName}` : 'Unknown Employee'}
                                    </span>
                                    <Badge 
                                      variant={
                                        priority === 'HIGH' ? 'destructive' :
                                        priority === 'MEDIUM' ? 'default' :
                                        'secondary'
                                      }
                                      className="text-xs h-5 px-2 flex-shrink-0"
                                    >
                                      {priority}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {review.status.replace('_', ' ')} • {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs flex-shrink-0 ml-3">
                                  <Link href={`/admin/reviews/${review.id}`}>
                                    Review
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <PDRManagementDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Completion Trends</CardTitle>
                  <CardDescription>
                    PDR completion rates over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Chart visualization coming soon
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                  <CardDescription>
                    Overall performance ratings across the organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Chart visualization coming soon
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}