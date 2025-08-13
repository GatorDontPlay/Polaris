'use client';

import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Award,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Demo analytics data
const analyticsData = {
  overview: {
    totalPDRs: 156,
    completionRate: 84,
    avgRating: 4.2,
    onTimeCompletion: 78,
  },
  departmentStats: [
    { department: 'Engineering', employees: 15, completedPDRs: 12, avgRating: 4.3, trend: '+5%' },
    { department: 'Marketing', employees: 8, completedPDRs: 7, avgRating: 4.1, trend: '+2%' },
    { department: 'Sales', employees: 12, completedPDRs: 10, avgRating: 4.0, trend: '-1%' },
    { department: 'Design', employees: 6, completedPDRs: 5, avgRating: 4.5, trend: '+8%' },
    { department: 'HR', employees: 4, completedPDRs: 4, avgRating: 4.2, trend: '+3%' },
  ],
  goalCategories: [
    { category: 'Technical Skills', count: 45, avgProgress: 78 },
    { category: 'Leadership', count: 32, avgProgress: 65 },
    { category: 'Communication', count: 28, avgProgress: 82 },
    { category: 'Innovation', count: 22, avgProgress: 71 },
    { category: 'Team Collaboration', count: 38, avgProgress: 85 },
  ],
  trends: {
    pdrCompletionTrend: [65, 72, 78, 84, 89, 84], // Last 6 months
    ratingTrend: [3.8, 4.0, 4.1, 4.2, 4.3, 4.2], // Last 6 months
  }
};

export default function AnalyticsPage() {
  const { overview, departmentStats, goalCategories } = analyticsData;

  return (
    <div className="flex h-full flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Analytics' }
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        <PageHeader 
          title="Performance Analytics"
          description="Insights and trends across all performance development reviews"
        />

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total PDRs</p>
                  <p className="text-2xl font-bold">{overview.totalPDRs}</p>
                  <p className="text-xs text-green-600">+12% from last quarter</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{overview.completionRate}%</p>
                  <p className="text-xs text-green-600">+5% from last quarter</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{overview.avgRating}/5</p>
                  <p className="text-xs text-green-600">+0.2 from last quarter</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">On-Time Rate</p>
                  <p className="text-2xl font-bold">{overview.onTimeCompletion}%</p>
                  <p className="text-xs text-red-600">-3% from last quarter</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analytics</CardTitle>
            <CardDescription>
              Comprehensive performance insights across departments and goal categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="departments" className="space-y-4">
              <TabsList>
                <TabsTrigger value="departments">By Department</TabsTrigger>
                <TabsTrigger value="goals">Goal Categories</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="departments" className="space-y-4">
                <div className="grid gap-4">
                  {departmentStats.map((dept) => (
                    <Card key={dept.department}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{dept.department}</h3>
                            <p className="text-sm text-muted-foreground">
                              {dept.employees} employees
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              Rating: {dept.avgRating}/5
                            </Badge>
                            <Badge 
                              className={dept.trend.startsWith('+') ? 
                                'bg-green-100 text-green-800' : 
                                'bg-red-100 text-red-800'
                              }
                            >
                              {dept.trend}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>PDR Completion</span>
                            <span>{dept.completedPDRs}/{dept.employees} ({Math.round(dept.completedPDRs/dept.employees*100)}%)</span>
                          </div>
                          <Progress value={dept.completedPDRs/dept.employees*100} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="goals" className="space-y-4">
                <div className="grid gap-4">
                  {goalCategories.map((category) => (
                    <Card key={category.category}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{category.category}</h3>
                            <p className="text-sm text-muted-foreground">
                              {category.count} goals set across organization
                            </p>
                          </div>
                          <Badge variant="outline">
                            {category.avgProgress}% avg progress
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Average Progress</span>
                            <span>{category.avgProgress}%</span>
                          </div>
                          <Progress value={category.avgProgress} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5" />
                        PDR Completion Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                        <p>Interactive chart showing completion rates over time</p>
                        <p className="text-sm">Would display actual chart component in production</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Award className="mr-2 h-5 w-5" />
                        Rating Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                        <p>Interactive chart showing average ratings over time</p>
                        <p className="text-sm">Would display actual chart component in production</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quarterly PDR Report</CardTitle>
                      <CardDescription>
                        Comprehensive performance review summary for Q4 2024
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Period:</strong> Oct - Dec 2024</p>
                        <p className="text-sm"><strong>Participants:</strong> 45 employees</p>
                        <p className="text-sm"><strong>Completion:</strong> 84%</p>
                        <Button className="w-full mt-4">
                          <Download className="mr-2 h-4 w-4" />
                          Download Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Goal Achievement Report</CardTitle>
                      <CardDescription>
                        Analysis of goal completion and performance metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Total Goals:</strong> 187</p>
                        <p className="text-sm"><strong>Completed:</strong> 142 (76%)</p>
                        <p className="text-sm"><strong>In Progress:</strong> 32 (17%)</p>
                        <Button className="w-full mt-4">
                          <Download className="mr-2 h-4 w-4" />
                          Download Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Department Comparison</CardTitle>
                      <CardDescription>
                        Cross-department performance analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Top Performer:</strong> Design (4.5/5)</p>
                        <p className="text-sm"><strong>Most Improved:</strong> Engineering (+5%)</p>
                        <p className="text-sm"><strong>Focus Area:</strong> Sales Completion Rate</p>
                        <Button className="w-full mt-4">
                          <Download className="mr-2 h-4 w-4" />
                          Download Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Custom Report Builder</CardTitle>
                      <CardDescription>
                        Create custom reports with specific criteria
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Build reports filtered by department, date range, performance metrics, and more.
                        </p>
                        <Button className="w-full mt-4" variant="outline">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Build Custom Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
