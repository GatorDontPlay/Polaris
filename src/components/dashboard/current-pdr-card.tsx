'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { StepperIndicator } from '@/components/pdr/stepper-indicator';
import { PDR } from '@/types';
import { ArrowRight, Plus } from 'lucide-react';
import { getPDRDisplayName } from '@/lib/financial-year';

interface CurrentPDRCardProps {
  pdr: PDR | null;
  onContinue?: (pdrId: string) => void;
  onCreate?: () => void;
  isLoading?: boolean;
}

const PDR_STEPS = [
  { number: 1, title: 'Goals', description: 'Set your objectives' },
  { number: 2, title: 'Behaviors', description: 'Assess company values' },
  { number: 3, title: 'Review', description: 'Submit for review' },
  { number: 4, title: 'Mid-Year', description: 'Check-in assessment' },
  { number: 5, title: 'End-Year', description: 'Final evaluation' },
];

export function CurrentPDRCard({ 
  pdr, 
  onContinue, 
  onCreate,
  isLoading 
}: CurrentPDRCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current PDR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pdr) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current PDR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div 
              className="mx-auto w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 cursor-pointer hover:bg-blue-500/30 transition-colors duration-200" 
              onClick={onCreate}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCreate?.();
                }
              }}
            >
              <Plus className="h-7 w-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              No Active PDR
            </h3>
            <p className="text-foreground/80 mb-6 text-base font-medium leading-relaxed max-w-sm mx-auto">
              Start your performance review by creating a new PDR for the current period.
            </p>
            <Button onClick={onCreate} className="inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Create New PDR
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current PDR</CardTitle>
          <PDRStatusBadge status={pdr.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PDR Info */}
        <div>
          <h3 className="font-semibold text-foreground text-lg">
            {pdr.fyLabel ? getPDRDisplayName(pdr.fyLabel) : (pdr.period?.name || 'Annual Review')}
          </h3>
          <p className="text-sm text-muted-foreground/80 mt-1">
            {pdr.status === 'SUBMITTED' || pdr.status === 'MID_YEAR_SUBMITTED' || pdr.status === 'END_YEAR_SUBMITTED'
              ? 'Submitted for review - awaiting CEO feedback'
              : pdr.status === 'PLAN_LOCKED'
              ? 'Initial plan approved - proceed to mid-year review'
              : pdr.status === 'MID_YEAR_APPROVED'
              ? 'Mid-year review approved - proceed to end-year review'
              : pdr.status === 'COMPLETED'
              ? 'Review process completed'
              : `Step ${pdr.currentStep || pdr.current_step} of ${PDR_STEPS.length} - Continue your review process`
            }
          </p>
        </div>

        {/* Progress Stepper */}
        <StepperIndicator
          currentStep={pdr.currentStep}
          totalSteps={PDR_STEPS.length}
          steps={PDR_STEPS}
          pdrStatus={pdr.status}
          className="mb-4"
        />

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={() => onContinue?.(pdr.id)}
            className="inline-flex items-center"
            variant={pdr.status === 'Created' ? 'default' : 'outline'}
          >
            {pdr.status === 'Created' ? 'Edit/Continue PDR' : 'View Current PDR'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
