'use client';

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
  Calendar
} from 'lucide-react';
import { formatDateAU } from '@/lib/utils';

// Demo data for PDR reviews
const demoReviews = [
  {
    id: 'pdr-1',
    employeeName: 'Alice Wilson',
    employeeEmail: 'alice.wilson@company.com',
    department: 'Engineering',
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'pending_review',
    priority: 'HIGH',
    completionRate: 95,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: 'pdr-2',
    employeeName: 'Bob Chen',
    employeeEmail: 'bob.chen@company.com',
    department: 'Marketing',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'under_review',
    priority: 'MEDIUM',
    completionRate: 88,
    lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  },
  {
    id: 'pdr-3',
    employeeName: 'Carol Davis',
    employeeEmail: 'carol.davis@company.com',
    department: 'Sales',
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'completed',
    priority: 'LOW',
    completionRate: 100,
    lastActivity: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
  },
];

export default function ReviewsPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'Pending Review';
      case 'under_review':
        return 'Under Review';
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Overdue';
      default:
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

  const pendingReviews = demoReviews.filter(review => review.status === 'pending_review');
  const underReview = demoReviews.filter(review => review.status === 'under_review');
  const completedReviews = demoReviews.filter(review => review.status === 'completed');

  return (
    <div className="flex h-full flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'PDR Reviews' }
        ]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Review Cycle
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        <PageHeader 
          title="PDR Review Management"
          description="Monitor and manage employee performance development reviews"
        />

        {/* Review Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card>
          <CardHeader>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>
              Manage PDR reviews across different stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingReviews.length})
                </TabsTrigger>
                <TabsTrigger value="reviewing">
                  Under Review ({underReview.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedReviews.length})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All Reviews ({demoReviews.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                <ReviewTable reviews={pendingReviews} />
              </TabsContent>

              <TabsContent value="reviewing" className="space-y-4">
                <ReviewTable reviews={underReview} />
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                <ReviewTable reviews={completedReviews} />
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                <ReviewTable reviews={demoReviews} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  function ReviewTable({ reviews }: { reviews: typeof demoReviews }) {
    return (
      <div className="rounded-md border">
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
    );
  }
}
