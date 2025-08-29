'use client';

import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  Award, 
  BarChart 
} from 'lucide-react';

export interface CalibrationStatsProps {
  stats: {
    totalEmployees: number;
    totalBudgetImpact: number;
    averagePerformance: number;
    belowBandCount: number;
    withinBandCount: number;
    aboveBandCount: number;
  };
}

export function CalibrationStats({ stats }: CalibrationStatsProps) {
  const statItems = [
    {
      title: 'Employees',
      value: stats.totalEmployees,
      icon: Users,
      iconColor: 'text-blue-600'
    },
    {
      title: 'Budget Impact',
      value: `$${stats.totalBudgetImpact.toLocaleString()}`,
      icon: DollarSign,
      iconColor: 'text-green-600'
    },
    {
      title: 'Average Performance',
      value: stats.averagePerformance.toFixed(1),
      icon: Award,
      iconColor: 'text-amber-600'
    },
    {
      title: 'Salary Bands',
      value: (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-500 font-medium">{stats.belowBandCount} Below</span>
          <span>•</span>
          <span className="text-green-500 font-medium">{stats.withinBandCount} Within</span>
          <span>•</span>
          <span className="text-purple-500 font-medium">{stats.aboveBandCount} Above</span>
        </div>
      ),
      icon: BarChart,
      iconColor: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {statItems.map((item, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <item.icon className={`h-8 w-8 ${item.iconColor}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </p>
                {typeof item.value === 'string' || typeof item.value === 'number' ? (
                  <p className="text-2xl font-bold">{item.value}</p>
                ) : (
                  item.value
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

