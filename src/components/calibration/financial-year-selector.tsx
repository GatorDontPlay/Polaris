'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { formatFYDateRange } from '@/lib/financial-year';

export interface FinancialYearOption {
  label: string;
  displayName: string;
  startDate: Date;
  endDate: Date;
}

interface FinancialYearSelectorProps {
  financialYears: FinancialYearOption[];
  selectedYear: string;
  onYearChange: (year: string) => void;
}

export function FinancialYearSelector({
  financialYears,
  selectedYear,
  onYearChange
}: FinancialYearSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedYear} onValueChange={onYearChange}>
        <SelectTrigger className="w-[250px] bg-muted/20 border-muted-foreground/20">
          <SelectValue placeholder="Current Financial Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current" className="text-primary font-medium">
            Current Financial Year
          </SelectItem>
          <div className="py-1">
            {financialYears.map(fy => {
              const isCurrentFY = new Date() >= fy.startDate && new Date() <= fy.endDate;
              return (
                <SelectItem 
                  key={fy.label} 
                  value={fy.label}
                  className={isCurrentFY ? "text-primary font-medium" : ""}
                >
                  <div className="flex flex-col">
                    <span>FY {fy.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFYDateRange(fy, 'short')}
                      {isCurrentFY && " (Current)"}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
