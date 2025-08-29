'use client';

import { Badge } from '@/components/ui/badge';

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

interface CalibrationEmployeeTableProps {
  employees: EmployeeCalibrationData[];
}

export function CalibrationEmployeeTable({ employees }: CalibrationEmployeeTableProps) {
  // Determine band color based on position
  const getBandColor = (category: string) => {
    switch(category) {
      case 'below': return 'text-red-500';
      case 'lower': return 'text-yellow-500';
      case 'middle': return 'text-green-500';
      case 'upper': return 'text-blue-500';
      case 'above': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  // Display band position as text
  const getBandText = (category: string) => {
    switch(category) {
      case 'below': return 'Below Band';
      case 'lower': return 'Lower Band';
      case 'middle': return 'Mid Band';
      case 'upper': return 'Upper Band';
      case 'above': return 'Above Band';
      default: return 'Unknown';
    }
  };

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="h-10 px-4 text-left font-medium">Employee</th>
            <th className="h-10 px-4 text-left font-medium">Department</th>
            <th className="h-10 px-4 text-left font-medium">Role</th>
            <th className="h-10 px-4 text-left font-medium">Current Salary</th>
            <th className="h-10 px-4 text-left font-medium">Performance</th>
            <th className="h-10 px-4 text-left font-medium">Band Position</th>
            <th className="h-10 px-4 text-left font-medium">Impact</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr className="border-b transition-colors hover:bg-muted/50">
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                No calibration data available for this period.
              </td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{employee.name}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{employee.department}</Badge>
                </td>
                <td className="px-4 py-3">{employee.role}</td>
                <td className="px-4 py-3">${employee.currentSalary.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{employee.performance.toFixed(1)}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span 
                          key={star} 
                          className={`w-2 h-2 rounded-full ${
                            star <= employee.performance ? 
                              'bg-amber-400' : 
                              star - 0.5 <= employee.performance ?
                                'bg-gradient-to-r from-amber-400 to-gray-200' : 
                                'bg-gray-200'
                          } mx-0.5 transition-colors`}
                        ></span>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getBandColor(employee.bandCategory)}`}>
                      {getBandText(employee.bandCategory)}
                    </span>
                    <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getBandColor(employee.bandCategory).replace('text', 'bg')} transition-all duration-500`}
                        style={{ width: `${employee.bandPosition}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-green-600">
                  +${employee.calibrationImpact.toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
