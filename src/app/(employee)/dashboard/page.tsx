'use client';

import { useRouter } from 'next/navigation';
import { useDemoAuth } from '@/hooks/use-demo-auth';
import { useDemoPDRDashboard } from '@/hooks/use-demo-pdr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Plus,
  FileText,
  CheckCircle2
} from 'lucide-react';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useDemoAuth();
  
  console.log('EmployeeDashboard - Auth Debug:', { 
    user, 
    isAuthenticated, 
    authLoading,
    userRole: user?.role 
  });
  
  // Get current user's PDRs using demo system
  const { data: currentPDR, createPDR, isLoading: pdrLoading } = useDemoPDRDashboard();
  const [isCreatingPDR, setIsCreatingPDR] = useState(false);
  
  console.log('EmployeeDashboard - PDR Debug:', { 
    currentPDR, 
    pdrLoading,
    hasPDR: !!currentPDR 
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle PDR creation
  const handleCreatePDR = async () => {
    setIsCreatingPDR(true);
    try {
      // Create a new PDR using demo system
      const newPDR = createPDR();
      if (newPDR) {
        router.push(`/pdr/${newPDR.id}/goals`);
      } else {
        console.error('Failed to create PDR');
      }
    } catch (error) {
      console.error('Failed to create PDR:', error);
    } finally {
      setIsCreatingPDR(false);
    }
  };

  // Handle continue PDR
  const handleContinuePDR = () => {
    if (currentPDR) {
      // Navigate based on current step
      const stepPaths = {
        1: `/pdr/${currentPDR.id}/goals`,
        2: `/pdr/${currentPDR.id}/behaviors`, 
        3: `/pdr/${currentPDR.id}/review`,
        4: `/pdr/${currentPDR.id}/mid-year`,
        5: `/pdr/${currentPDR.id}/end-year`,
      };
      
      const currentPath = stepPaths[currentPDR.currentStep as keyof typeof stepPaths] || `/pdr/${currentPDR.id}/goals`;
      router.push(currentPath);
    }
  };

  // Show loading state
  if (authLoading) {
    console.log('EmployeeDashboard: Auth still loading');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (pdrLoading) {
    console.log('EmployeeDashboard: PDRs still loading');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading PDRs...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {user.firstName}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your performance and development reviews
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Goals</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed PDRs</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">4.2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Days Until Due</p>
                  <p className="text-2xl font-bold">45</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {        /* Current PDR */}
        {currentPDR ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Current PDR - 2024 Annual Review
              </CardTitle>
              <CardDescription>
                Complete your performance development review for this cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <div className="flex items-center mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(currentPDR.currentStep / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{currentPDR.currentStep} of 5 steps</span>
                  </div>
                </div>
                <Badge variant={currentPDR.status === 'SUBMITTED' ? 'secondary' : 'default'}>
                  {currentPDR.status === 'Created' && 'In Progress'}
                  {currentPDR.status === 'OPEN_FOR_REVIEW' && 'Submitted'}
                  {currentPDR.status === 'PLAN_LOCKED' && 'Under Review'}
                  {currentPDR.status === 'COMPLETED' && 'Completed'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className={`text-center p-4 rounded-lg ${currentPDR.currentStep >= 1 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {currentPDR.currentStep >= 1 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  ) : (
                    <Target className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm font-medium">Goals</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPDR.currentStep >= 2 ? 'Completed' : currentPDR.currentStep === 1 ? 'In Progress' : 'Pending'}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${currentPDR.currentStep >= 2 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {currentPDR.currentStep >= 2 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  ) : (
                    <TrendingUp className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm font-medium">Behaviors</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPDR.currentStep >= 3 ? 'Completed' : currentPDR.currentStep === 2 ? 'In Progress' : 'Pending'}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${currentPDR.currentStep >= 3 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {currentPDR.currentStep >= 3 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  ) : (
                    <FileText className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm font-medium">Review</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPDR.currentStep >= 4 ? 'Completed' : currentPDR.currentStep === 3 ? 'In Progress' : 'Pending'}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${currentPDR.status === 'SUBMITTED' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  {currentPDR.currentStep >= 4 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  ) : currentPDR.status === 'SUBMITTED' ? (
                    <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  ) : (
                    <Calendar className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm font-medium">Mid-Year</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPDR.currentStep >= 5 ? 'Completed' : currentPDR.currentStep === 4 ? 'In Progress' : currentPDR.status === 'SUBMITTED' ? 'Available' : 'Pending'}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${currentPDR.currentStep >= 5 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {currentPDR.currentStep >= 5 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  ) : (
                    <FileText className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm font-medium">End-Year</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPDR.currentStep >= 5 ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={handleContinuePDR}
                  className="flex-1"
                >
                  Continue PDR
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/pdr/${currentPDR.id}/goals`)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New PDR</CardTitle>
              <CardDescription>
                Start your performance development review for the current period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Active PDR
                </h3>
                <p className="text-gray-600 mb-4">
                  Start your performance review by creating a new PDR for the current period.
                </p>
                <Button 
                  onClick={handleCreatePDR} 
                  disabled={isCreatingPDR}
                  className="inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isCreatingPDR ? 'Creating...' : 'Create New PDR'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push(`/pdr/${currentPDR?.id}/goals`)}
                disabled={!currentPDR}
              >
                <Target className="mr-2 h-4 w-4" />
                Update Goals
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push(`/pdr/${currentPDR?.id}/behaviors`)}
                disabled={!currentPDR}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Rate Behaviors
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push(`/pdr/${currentPDR?.id}/mid-year`)}
                disabled={!currentPDR || currentPDR.status !== 'SUBMITTED'}
                title={currentPDR?.status !== 'SUBMITTED' ? 'Complete and submit your PDR first' : 'Available during mid-year period'}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Mid-Year Check-in
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest PDR actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Completed behavior assessments</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Updated performance goals</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Started annual review</p>
                  <p className="text-xs text-muted-foreground">3 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDR History */}
        <Card>
          <CardHeader>
            <CardTitle>PDR History</CardTitle>
            <CardDescription>
              Your previous performance reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentPDR && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">2024 Annual Review</h4>
                    <p className="text-sm text-muted-foreground">
                      {currentPDR.status === 'COMPLETED' ? 'Completed' : 'In Progress'} • Started {new Date(currentPDR.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={currentPDR.status === 'COMPLETED' ? 'secondary' : 'default'}>
                      {currentPDR.status === 'Created' && 'In Progress'}
                      {currentPDR.status === 'OPEN_FOR_REVIEW' && 'Submitted'}
                      {currentPDR.status === 'PLAN_LOCKED' && 'Under Review'}
                      {currentPDR.status === 'COMPLETED' && 'Completed'}
                    </Badge>
                    <Button size="sm" onClick={() => router.push(`/pdr/${currentPDR.id}`)}>
                      {currentPDR.status === 'COMPLETED' ? 'View' : 'Continue'}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">2023 Annual Review</h4>
                  <p className="text-sm text-muted-foreground">Completed • Rating: 4.2/5</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">2022 Annual Review</h4>
                  <p className="text-sm text-muted-foreground">Completed • Rating: 4.0/5</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}