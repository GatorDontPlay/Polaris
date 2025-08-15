'use client';

import { useDemoAdminDashboard as useCEODashboard } from '@/hooks/use-demo-admin';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { PDRManagementDashboard } from '@/components/admin/pdr-management-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  
  const { data: dashboardData, isLoading, error } = useCEODashboard();

  console.log('CEO Dashboard Debug:', { 
    dashboardData, 
    isLoading, 
    error: error?.message || error,
    hasData: !!dashboardData,
    statsExists: !!dashboardData?.stats 
  });

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
  const recentActivity = dashboardData?.recentActivity || [];
  const pendingReviews = dashboardData?.pendingReviews || [];

  return (
    <div className="flex flex-col min-h-0">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard' }
        ]}
        actions={
          <Button asChild>
            <Link href="/admin/reviews/new">
              <Plus className="mr-2 h-4 w-4" />
              New Review
            </Link>
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-6 overflow-y-auto">
        <PageHeader 
          title="Welcome back!"
          description="Here&apos;s what&apos;s happening with your team&apos;s performance reviews."
        />

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={stats?.totalEmployees?.toString() || '0'}
            change="+2 from last month"
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Completed PDRs"
            value={stats?.completedPDRs?.toString() || '0'}
            change="+12% from last period"
            changeType="positive"
            icon={FileText}
          />
          <StatCard
            title="Pending Reviews"
            value={stats?.pendingReviews?.toString() || '0'}
            change="3 due this week"
            changeType="neutral"
            icon={Clock}
          />
          <StatCard
            title="Avg Rating"
            value={`${stats?.averageRating?.toFixed(1) || '0.0'}`}
            change="+0.2 from last period"
            changeType="positive"
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Recent PDR Activity</CardTitle>
                  <CardDescription>
                    Latest performance review submissions and updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        No recent activity
                      </p>
                    ) : (
                      recentActivity.slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className="flex items-center space-x-4">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {activity.user?.firstName?.[0]}{activity.user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-none">
                              {activity.user?.firstName} {activity.user?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.message}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={
                                activity.priority === 'high' ? 'destructive' :
                                activity.priority === 'medium' ? 'default' :
                                'secondary'
                              }
                            >
                              {activity.type}
                            </Badge>
                            {activity.pdr && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/admin/reviews/${activity.pdr.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Pending Actions</CardTitle>
                  <CardDescription>
                    Reviews requiring your attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingReviews.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <p className="text-muted-foreground">All caught up! No pending reviews.</p>
                      </div>
                    ) : (
                      pendingReviews.slice(0, 3).map((review: any) => (
                        <div key={review.id} className="flex items-center justify-between space-x-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-none">
                              {review.user?.firstName} {review.user?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {review.period?.name} - {review.status}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/reviews/${review.id}`}>
                              Review
                            </Link>
                          </Button>
                        </div>
                      ))
                    )}
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