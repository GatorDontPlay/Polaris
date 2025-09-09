'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  BarChart3, 
  ArrowLeft,
  Calculator,
  Target,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { useSupabaseAdminDashboard } from '@/hooks/use-supabase-pdrs';
import { useAuth } from '@/providers/supabase-auth-provider';
import type { PDR, Goal, Behavior } from '@/types';

interface EmployeeCalibrationData {
  name: string;
  role: string;
  currentSalary: string;
  performance: number;
  pdrStatus: string;
  pdrId: string;
  completedGoals: number;
  completedBehaviors: number;
  averageGoalRating: number;
  averageBehaviorRating: number;
}

export default function SalaryCalibrationPage() {
  const { data: dashboardData, isLoading: dashboardLoading } = useSupabaseAdminDashboard();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeCalibrationData[]>([]);
  const [stats, setStats] = useState({
    pendingReviews: 0,
    budgetImpact: 0,
    avgPerformance: 0
  });

  useEffect(() => {
    // Get real PDR data from localStorage and calculate employee calibration data
    const loadEmployeeData = () => {
      if (typeof window === 'undefined') return;

      const employeeData: EmployeeCalibrationData[] = [];
      let totalBudgetImpact = 0;
      let totalPerformance = 0;
      let performanceCount = 0;

      // Find all PDRs in localStorage
      const pdrKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('demo_pdr_')) {
          pdrKeys.push(key);
        }
      }

      console.log(`Found ${pdrKeys.length} PDRs in localStorage`);

      // Process each PDR
      pdrKeys.forEach(key => {
        try {
          const pdrString = localStorage.getItem(key);
          if (!pdrString) return;
          
          const pdr: PDR = JSON.parse(pdrString);
          console.log(`Processing PDR: ${pdr.id}, status: ${pdr.status}`);
          
          // Get goals and behaviors for this PDR
          const goalsString = localStorage.getItem(`demo_goals_${pdr.id}`);
          const behaviorsString = localStorage.getItem(`demo_behaviors_${pdr.id}`);
          
          let parsedGoals: Goal[] = [];
          let parsedBehaviors: Behavior[] = [];
          
          if (goalsString) {
            parsedGoals = JSON.parse(goalsString);
            console.log(`Found ${parsedGoals.length} goals for PDR ${pdr.id}`);
          }
          
          if (behaviorsString) {
            parsedBehaviors = JSON.parse(behaviorsString);
            console.log(`Found ${parsedBehaviors.length} behaviors for PDR ${pdr.id}`);
          }

          // Calculate performance metrics
          const goalRatings = parsedGoals
            .map(g => g.employeeRating || g.ceoRating || 0)
            .filter(rating => rating !== null && rating !== undefined && rating > 0);
          
          const behaviorRatings = parsedBehaviors
            .map(b => b.employeeRating || b.ceoRating || 0)
            .filter(rating => rating !== null && rating !== undefined && rating > 0);
          
          const allRatings = [...goalRatings, ...behaviorRatings];
          const averageRating = allRatings.length > 0 
            ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length 
            : 0;

          console.log(`Average rating for PDR ${pdr.id}: ${averageRating}`);

          // Estimate salary increase based on performance
          const baseSalary = 85000; // Base salary
          let salaryIncrease = 0;
          if (averageRating >= 4.5) {
            salaryIncrease = baseSalary * 0.10; // 10% for outstanding
          } else if (averageRating >= 4.0) {
            salaryIncrease = baseSalary * 0.07; // 7% for exceeds expectations
          } else if (averageRating >= 3.0) {
            salaryIncrease = baseSalary * 0.04; // 4% for meets expectations
          } else if (averageRating > 0) {
            salaryIncrease = baseSalary * 0.02; // 2% for below expectations but with some rating
          }

          if (averageRating > 0) {
            totalBudgetImpact += salaryIncrease;
            totalPerformance += averageRating;
            performanceCount++;
          }

          // Include PDRs that are in COMPLETED status or have ratings
          if (pdr.status === 'COMPLETED' || pdr.status === 'END_YEAR_REVIEW' || pdr.status === 'SUBMITTED' || allRatings.length > 0) {
            // Create employee name from PDR or use default
            const employeeName = pdr.employeeName || 'Demo Employee';
            const employeeRole = pdr.employeeRole || 'Developer';
            
            employeeData.push({
              name: employeeName,
              role: employeeRole,
              currentSalary: `$${baseSalary.toLocaleString()}`,
              performance: Math.round(averageRating * 10) / 10,
              pdrStatus: pdr.status,
              pdrId: pdr.id,
              completedGoals: parsedGoals.length,
              completedBehaviors: parsedBehaviors.length,
              averageGoalRating: goalRatings.length > 0 
                ? goalRatings.reduce((sum, rating) => sum + rating, 0) / goalRatings.length 
                : 0,
              averageBehaviorRating: behaviorRatings.length > 0 
                ? behaviorRatings.reduce((sum, rating) => sum + rating, 0) / behaviorRatings.length 
                : 0
            });
          }
        } catch (error) {
          console.error(`Error processing PDR ${key}:`, error);
        }
      });

      // If no PDRs found, create a demo employee
      if (employeeData.length === 0) {
        const baseSalary = 85000;
        const averageRating = 4.2;
        const salaryIncrease = baseSalary * 0.07;
        
        employeeData.push({
          name: 'John Smith',
          role: 'Senior Developer',
          currentSalary: `$${baseSalary.toLocaleString()}`,
          performance: averageRating,
          pdrStatus: 'COMPLETED',
          pdrId: 'demo-pdr-placeholder',
          completedGoals: 3,
          completedBehaviors: 6,
          averageGoalRating: 4.3,
          averageBehaviorRating: 4.1
        });
        
        totalBudgetImpact = salaryIncrease;
        totalPerformance = averageRating;
        performanceCount = 1;
      }

      setEmployees(employeeData);
      setStats({
        pendingReviews: employeeData.length,
        budgetImpact: Math.round(totalBudgetImpact),
        avgPerformance: performanceCount > 0 
          ? Math.round((totalPerformance / performanceCount) * 10) / 10 
          : 0
      });
    };

    loadEmployeeData();
    
    // Set up a storage event listener to reload data when localStorage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && (event.key.startsWith('demo_pdr_') || event.key === 'demo_current_pdr')) {
        loadEmployeeData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getPerformanceRecommendation = (performance: number): string => {
    if (performance >= 4.5) return '8-12% increase';
    if (performance >= 4.0) return '5-8% increase';
    if (performance >= 3.0) return '3-5% increase';
    if (performance >= 2.0) return '0-2% increase';
    return 'No increase';
  };

  const getPriorityLevel = (performance: number): 'high' | 'medium' | 'low' => {
    if (performance >= 4.0) return 'high';
    if (performance >= 3.0) return 'medium';
    return 'low';
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Salary Calibration</h1>
          </div>
          <p className="text-muted-foreground">
            Review and calibrate employee compensation based on performance assessments
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground">
              Employees awaiting calibration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Impact</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.budgetImpact > 0 ? `$${stats.budgetImpact.toLocaleString()}` : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated annual increase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgPerformance > 0 ? `${stats.avgPerformance}/5` : '0/5'}
            </div>
            <p className="text-xs text-muted-foreground">
              Team performance rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calibration Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Calibration Guidelines
          </CardTitle>
          <CardDescription>
            Use these guidelines to ensure fair and consistent compensation decisions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Performance Ratings</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                  <span className="text-sm">1-2: Below Expectations</span>
                  <Badge variant="destructive">0-2% increase</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-md">
                  <span className="text-sm">3: Meets Expectations</span>
                  <Badge variant="secondary">3-5% increase</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                  <span className="text-sm">4: Exceeds Expectations</span>
                  <Badge variant="default">5-8% increase</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                  <span className="text-sm">5: Outstanding</span>
                  <Badge className="bg-blue-600 hover:bg-blue-700">8-12% increase</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Additional Considerations</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                  Market positioning and salary bands
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                  Time in current role and responsibilities
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                  Budget constraints and team equity
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                  Development potential and future contributions
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Calibration List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Employee Calibration Queue
          </CardTitle>
          <CardDescription>
            Employees ready for salary calibration based on completed performance reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length > 0 ? (
            <div className="space-y-4">
              {employees.map((employee, index) => {
                const priority = getPriorityLevel(employee.performance);
                const recommendation = getPerformanceRecommendation(employee.performance);
                
                return (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{employee.name}</h4>
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{employee.currentSalary}</p>
                        <p className="text-xs text-muted-foreground">Current salary</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {employee.performance > 0 ? employee.performance : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                      </div>

                      <Badge 
                        variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'secondary' : 'outline'}
                      >
                        {recommendation}
                      </Badge>

                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Employees Ready for Calibration</h3>
              <p className="text-muted-foreground">
                Complete employee performance reviews to see calibration recommendations here.
              </p>
            </div>
          )}

          {employees.length > 0 && (
            <>
              <Separator className="my-6" />
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Showing {employees.length} of {employees.length} employees pending calibration
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
