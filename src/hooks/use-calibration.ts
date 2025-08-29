'use client';

import { useState, useEffect } from 'react';
import { createFYFromLabel, generateFinancialYearOptions } from '@/lib/financial-year';
import type { PDR, Goal, Behavior } from '@/types';

export interface EmployeeCalibrationData {
  id: string;
  name: string;
  role: string;
  currentSalary: number;
  department: string;
  performance: number;
  bandPosition: number;
  bandCategory: 'below' | 'lower' | 'middle' | 'upper' | 'above';
  calibrationImpact: number;
  pdrStatus: string;
  pdrId: string;
  averageGoalRating: number;
  averageBehaviorRating: number;
}

export interface CalibrationStats {
  totalEmployees: number;
  totalBudgetImpact: number;
  averagePerformance: number;
  belowBandCount: number;
  withinBandCount: number;
  aboveBandCount: number;
}

export function useCalibrationData(financialYear?: string) {
  // If financialYear is 'current', we want to show data for all years
  const actualFinancialYear = financialYear === 'current' ? undefined : financialYear;
  const [employees, setEmployees] = useState<EmployeeCalibrationData[]>([]);
  const [stats, setStats] = useState<CalibrationStats>({
    totalEmployees: 0,
    totalBudgetImpact: 0,
    averagePerformance: 0,
    belowBandCount: 0,
    withinBandCount: 0,
    aboveBandCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [financialYears] = useState(generateFinancialYearOptions(2023, 3));
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to calculate salary band category based on position
  const calculateBandCategory = (position: number): 'below' | 'lower' | 'middle' | 'upper' | 'above' => {
    if (position < 0) return 'below';
    if (position < 33) return 'lower';
    if (position < 66) return 'middle';
    if (position <= 100) return 'upper';
    return 'above';
  };

  // Function to calculate calibration impact based on performance
  const calculateCalibrationImpact = (salary: number, performance: number): number => {
    if (performance >= 4.5) {
      return Math.round(salary * 0.075); // 7.5% for outstanding
    } else if (performance >= 4.0) {
      return Math.round(salary * 0.05); // 5% for exceeding expectations
    } else if (performance >= 3.5) {
      return Math.round(salary * 0.04); // 4% for meeting expectations
    } else if (performance >= 3.0) {
      return Math.round(salary * 0.03); // 3% for meeting most expectations
    } else if (performance >= 2.0) {
      return Math.round(salary * 0.02); // 2% for developing
    } else {
      return 0; // No increase for performance issues
    }
  };

  // Force a refresh of the data
  const refreshCalibrationData = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const loadCalibrationData = () => {
      setIsLoading(true);
      
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        // Get PDRs from localStorage
        const pdrs: PDR[] = [];
        const allKeys = Object.keys(localStorage);
        const pdrKeys = allKeys.filter(key => key.startsWith('demo_pdr_'));
        
        for (const key of pdrKeys) {
          try {
            const pdrString = localStorage.getItem(key);
            if (pdrString) {
              const pdr = JSON.parse(pdrString);
              
              // Filter by financial year if specified
              if (actualFinancialYear && pdr.fyLabel !== actualFinancialYear) {
                continue;
              }
              
              pdrs.push(pdr);
            }
          } catch (error) {
            console.error(`Error parsing PDR ${key}:`, error);
          }
        }
        
        // Process PDRs into employee calibration data
        const calibrationData: EmployeeCalibrationData[] = [];
        
        for (const pdr of pdrs) {
          // Calculate performance metrics
          let goalRatings: number[] = [];
          let behaviorRatings: number[] = [];
          
          try {
            // Extract goals
            if (pdr.goals) {
              const parsedGoals = typeof pdr.goals === 'string' ? JSON.parse(pdr.goals) : pdr.goals;
              goalRatings = parsedGoals
                .filter((g: any) => g.ceoRating)
                .map((g: any) => g.ceoRating);
            }
            
            // Extract behaviors
            if (pdr.behaviors) {
              const parsedBehaviors = typeof pdr.behaviors === 'string' ? JSON.parse(pdr.behaviors) : pdr.behaviors;
              behaviorRatings = parsedBehaviors
                .filter((b: any) => b.ceoRating)
                .map((b: any) => b.ceoRating);
            }
          } catch (error) {
            console.error(`Error processing PDR ratings for ${pdr.id}:`, error);
          }
          
          // Calculate average ratings
          const avgGoalRating = goalRatings.length > 0
            ? goalRatings.reduce((sum, rating) => sum + rating, 0) / goalRatings.length
            : 0;
            
          const avgBehaviorRating = behaviorRatings.length > 0
            ? behaviorRatings.reduce((sum, rating) => sum + rating, 0) / behaviorRatings.length
            : 0;
          
          // Calculate overall performance (60% goals, 40% behaviors)
          const performance = (avgGoalRating * 0.6) + (avgBehaviorRating * 0.4);
          
          // Use mock data for salary and band position
          const baseSalary = 85000 + Math.floor(Math.random() * 30000);
          const bandPosition = Math.floor(Math.random() * 110) - 5; // -5 to 105 for band position
          
          const bandCategory = calculateBandCategory(bandPosition);
          const calibrationImpact = calculateCalibrationImpact(baseSalary, performance);
          
          // Create employee name from PDR or use default
          const employeeName = pdr.employeeName || 'Demo Employee';
          const employeeRole = pdr.employeeRole || 'Developer';
          
          // Randomly assign department
          const departments = ['Development', 'Design', 'Operations'];
          const department = departments[Math.floor(Math.random() * departments.length)];
          
          calibrationData.push({
            id: pdr.id,
            name: employeeName,
            role: employeeRole,
            currentSalary: baseSalary,
            department,
            performance: Math.round(performance * 10) / 10,
            bandPosition: Math.max(0, Math.min(100, bandPosition)),
            bandCategory,
            calibrationImpact,
            pdrStatus: pdr.status,
            pdrId: pdr.id,
            averageGoalRating: Math.round(avgGoalRating * 10) / 10,
            averageBehaviorRating: Math.round(avgBehaviorRating * 10) / 10
          });
        }
        
        // If no PDRs found, create mock data
        if (calibrationData.length === 0) {
          calibrationData.push({
            id: 'emp-1',
            name: 'John Smith',
            role: 'Senior Developer',
            currentSalary: 95000,
            department: 'Development',
            performance: 4.5,
            bandPosition: 75,
            bandCategory: 'upper',
            calibrationImpact: 7125,
            pdrStatus: 'COMPLETED',
            pdrId: 'pdr-1',
            averageGoalRating: 4.3,
            averageBehaviorRating: 4.7
          });
          
          calibrationData.push({
            id: 'emp-2',
            name: 'Jane Doe',
            role: 'UX Designer',
            currentSalary: 85000,
            department: 'Design',
            performance: 3.8,
            bandPosition: 60,
            bandCategory: 'middle',
            calibrationImpact: 3400,
            pdrStatus: 'COMPLETED',
            pdrId: 'pdr-2',
            averageGoalRating: 3.7,
            averageBehaviorRating: 3.9
          });
          
          calibrationData.push({
            id: 'emp-3',
            name: 'Michael Johnson',
            role: 'Product Manager',
            currentSalary: 105000,
            department: 'Operations',
            performance: 4.2,
            bandPosition: 90,
            bandCategory: 'upper',
            calibrationImpact: 7350,
            pdrStatus: 'COMPLETED',
            pdrId: 'pdr-3',
            averageGoalRating: 4.0,
            averageBehaviorRating: 4.4
          });
        }
        
        // Calculate statistics
        const totalEmployees = calibrationData.length;
        const totalBudgetImpact = calibrationData.reduce((sum, emp) => sum + emp.calibrationImpact, 0);
        const totalPerformance = calibrationData.reduce((sum, emp) => sum + emp.performance, 0);
        const avgPerformance = totalEmployees > 0 ? totalPerformance / totalEmployees : 0;
        
        const belowBandCount = calibrationData.filter(emp => emp.bandCategory === 'below').length;
        const withinBandCount = calibrationData.filter(emp => ['lower', 'middle', 'upper'].includes(emp.bandCategory)).length;
        const aboveBandCount = calibrationData.filter(emp => emp.bandCategory === 'above').length;
        
        setEmployees(calibrationData);
        setStats({
          totalEmployees,
          totalBudgetImpact,
          averagePerformance: avgPerformance,
          belowBandCount,
          withinBandCount,
          aboveBandCount
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading calibration data:', error);
        setIsLoading(false);
      }
    };
    
    loadCalibrationData();
  }, [actualFinancialYear, refreshKey]);

  return {
    employees,
    stats,
    isLoading,
    financialYears,
    refreshCalibrationData
  };
}
