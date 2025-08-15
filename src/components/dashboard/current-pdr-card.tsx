'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { StepperIndicator } from '@/components/pdr/stepper-indicator';
import { PDR } from '@/types';
import { ArrowRight, Plus } from 'lucide-react';

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
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Active PDR
            </h3>
            <p className="text-gray-600 mb-4">
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
          <h3 className="font-medium text-gray-900">
            {pdr.period?.name || '2024 Annual Review'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {pdr.status === 'SUBMITTED' 
              ? 'Submitted for review - awaiting CEO feedback'
              : pdr.status === 'UNDER_REVIEW'
              ? 'Under review by CEO'
              : pdr.status === 'COMPLETED'
              ? 'Review process completed'
              : `Step ${pdr.currentStep} of ${PDR_STEPS.length} - Continue your review process`
            }
          </p>
        </div>

        {/* Progress Stepper */}
        <StepperIndicator
          currentStep={pdr.currentStep}
          totalSteps={PDR_STEPS.length}
          steps={PDR_STEPS}
          className="mb-4"
        />

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={() => onContinue?.(pdr.id)}
            className="inline-flex items-center"
            variant={pdr.status === 'SUBMITTED' || pdr.status === 'UNDER_REVIEW' || pdr.status === 'COMPLETED' ? 'outline' : 'default'}
          >
            {pdr.status === 'SUBMITTED' || pdr.status === 'UNDER_REVIEW' || pdr.status === 'COMPLETED' ? 'View PDR' : 'Continue PDR'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
