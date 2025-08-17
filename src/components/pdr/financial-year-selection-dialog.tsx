'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle } from 'lucide-react';
import { createFYFromLabel, formatFYDateRange, generateFinancialYearOptions } from '@/lib/financial-year';

export interface FinancialYearOption {
  label: string;
  displayName: string;
  startDate: Date;
  endDate: Date;
}

interface FinancialYearSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedFY: FinancialYearOption) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

// Use the utility function to generate financial year options
const getFinancialYearOptions = (): FinancialYearOption[] => {
  return generateFinancialYearOptions(2025, 5);
};

export function FinancialYearSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isCreating = false,
}: FinancialYearSelectionDialogProps) {
  const [selectedFY, setSelectedFY] = useState<string>('');
  const financialYears = getFinancialYearOptions();

  const handleConfirm = () => {
    const selected = financialYears.find(fy => fy.label === selectedFY);
    if (selected) {
      onConfirm(selected);
    }
  };

  const handleCancel = () => {
    setSelectedFY('');
    onCancel();
  };

  const selectedFYData = financialYears.find(fy => fy.label === selectedFY);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Financial Year
          </DialogTitle>
          <DialogDescription>
            Choose the financial year for your Performance Development Review (PDR).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="financial-year" className="text-sm font-medium text-foreground mb-2 block">
              Financial Year Period
            </label>
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger>
                <SelectValue placeholder="Select a financial year..." />
              </SelectTrigger>
              <SelectContent>
                {financialYears.map((fy) => (
                  <SelectItem key={fy.label} value={fy.label}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{fy.displayName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({fy.label})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFYData && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      Financial Year {selectedFYData.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFYDateRange(selectedFYData, 'long')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your PDR will track performance and development goals for this 12-month period.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFY || isCreating}
          >
            {isCreating ? 'Creating PDR...' : 'Create PDR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
