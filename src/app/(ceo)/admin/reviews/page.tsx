'use client';

import { useEffect } from 'react';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  Eye,
  MessageSquare,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { formatDateAU } from '@/lib/utils';
import { useSupabaseAdminDashboard } from '@/hooks/use-supabase-pdrs';

export default function ReviewsPage() {
  const { data: dashboardData, isLoading, refreshDashboard: refreshReviews } = useSupabaseAdminDashboard();
  
  // Extract reviews (PDRs) from dashboard data
  const reviews = dashboardData?.pdrs || [];

  // Refresh data when page becomes visible to catch localStorage changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 ReviewsPage: Page became visible, refreshing data');
        refreshReviews();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith('demo_pdr_') || e.key === 'demo_current_pdr')) {
        console.log('💾 ReviewsPage: localStorage changed for PDR data, refreshing:', e.key);
        refreshReviews();
      }
    };

    const handleFocus = () => {
      console.log('🎯 ReviewsPage: Window focused, refreshing data');
      refreshReviews();
    };

    // Listen for various events that should trigger refresh
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    // Also refresh on component mount
    const timer = setTimeout(() => {
      console.log('⏰ ReviewsPage: Initial refresh on mount');
      refreshReviews();
    }, 500);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      clearTimeout(timer);
    };
  }, [refreshReviews]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'locked':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    console.log(`🏷️ getStatusLabel called with status: "${status}" (type: ${typeof status})`);
    
    switch (status) {
      case 'pending_review':
        return 'Pending Review';
      case 'under_review':
        return 'Under Review';
      case 'locked':
        return 'Plan Locked';
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Overdue';
      case undefined:
      case null:
      case '':
      case 'Unknown':
        console.warn(`⚠️ getStatusLabel received invalid status: "${status}", returning "Pending Review"`);
        return 'Pending Review';
      default:
        console.warn(`⚠️ getStatusLabel received unmapped status: "${status}", returning as-is`);
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const pendingReviews = reviews.filter(review => review.status === 'pending_review');
  const underReview = reviews.filter(review => review.status === 'under_review');
  const lockedReviews = reviews.filter(review => review.status === 'locked');
  const completedReviews = reviews.filter(review => review.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <AdminHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin' },
            { label: 'Reviews' }
          ]}
        />
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading reviews...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'PDR Reviews' }
        ]}
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <PageHeader 
          title="PDR Review Management"
          description="Monitor and manage employee performance development reviews"
        />

        {/* Review Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingReviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                  <p className="text-2xl font-bold">{underReview.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Plan Locked</p>
                  <p className="text-2xl font-bold">{lockedReviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedReviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Tabs */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>
              Manage PDR reviews across different stages
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <Tabs defaultValue="pending" className="space-y-4 flex-1 flex flex-col">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingReviews.length})
                </TabsTrigger>
                <TabsTrigger value="reviewing">
                  Under Review ({underReview.length})
                </TabsTrigger>
                <TabsTrigger value="locked">
                  Locked ({lockedReviews.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedReviews.length})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All Reviews ({reviews.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 flex-1 min-h-0">
                <ReviewTable reviews={pendingReviews} />
              </TabsContent>

              <TabsContent value="reviewing" className="space-y-4 flex-1 min-h-0">
                <ReviewTable reviews={underReview} />
              </TabsContent>

              <TabsContent value="locked" className="space-y-4 flex-1 min-h-0">
                <ReviewTable reviews={lockedReviews} />
              </TabsContent>

              <TabsContent value="completed" className="space-y-4 flex-1 min-h-0">
                <ReviewTable reviews={completedReviews} />
              </TabsContent>

              <TabsContent value="all" className="space-y-4 flex-1 min-h-0">
                <ReviewTable reviews={reviews} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  function ReviewTable({ reviews }: { reviews: any[] }) {
    return (
      <div className="rounded-md border flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-muted-foreground">No reviews in this category.</div>
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(review.employeeName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{review.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{review.employeeEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{review.department}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(review.status)}>
                      {getStatusLabel(review.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(review.priority)}>
                      {review.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${review.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{review.completionRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateAU(review.submittedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Comment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
}
