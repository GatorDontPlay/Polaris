'use client';

import { useState } from 'react';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/supabase-auth-provider';
import { useCalibrationData } from '@/hooks/use-calibration';

// Import custom components
import { CalibrationStats } from '@/components/calibration/calibration-stats';
import { CalibrationEmployeeTable } from '@/components/calibration/calibration-employee-table';
import { FinancialYearSelector } from '@/components/calibration/financial-year-selector';

export default function CalibrationPage() {
  const { user } = useAuth();
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>('current');
  const { 
    employees, 
    stats, 
    isLoading, 
    financialYears,
    refreshCalibrationData
  } = useCalibrationData(selectedFinancialYear);

  // Handle financial year selection
  const handleFYChange = (fy: string) => {
    setSelectedFinancialYear(fy);
  };

  return (
    <div className="flex h-full flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Calibration' }
        ]}
      />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Salary Calibration" 
            description="Review employee performance and manage salary adjustments"
          />
          
          <div className="flex items-center gap-4">
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refreshCalibrationData()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            
            {/* Financial Year Selector */}
            <FinancialYearSelector 
              financialYears={financialYears}
              selectedYear={selectedFinancialYear}
              onYearChange={handleFYChange}
            />
          </div>
        </div>
        
        {/* Stats Overview */}
        <CalibrationStats stats={stats} />
        
        {/* Employee Calibration Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Calibrations</CardTitle>
            <CardDescription>
              Review and adjust employee salary calibrations based on performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading calibration data...</p>
                </div>
              </div>
            ) : (
              <CalibrationEmployeeTable employees={employees} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
