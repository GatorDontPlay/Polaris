import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

interface StepperIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    number: number;
    title: string;
    description: string;
  }>;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function StepperIndicator({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
  className,
}: StepperIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isClickable = onStepClick && step.number <= currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-medium transition-all duration-200',
                  {
                    'bg-primary text-primary-foreground border-primary': isActive,
                    'bg-green-500 text-white border-green-500': isCompleted,
                    'bg-muted text-muted-foreground border-border': !isActive && !isCompleted,
                    'cursor-pointer hover:bg-primary/10': isClickable,
                  }
                )}
                onClick={() => isClickable && onStepClick(step.number)}
              >
                {isCompleted ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>

              {/* Step Content */}
              <div className="ml-4 flex-1">
                <div
                  className={cn(
                    'text-sm font-medium',
                    {
                      'text-primary': isActive,
                      'text-green-600': isCompleted,
                      'text-muted-foreground': !isActive && !isCompleted,
                    }
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-12 mx-4 transition-colors',
                    {
                      'bg-primary': step.number < currentStep,
                      'bg-border': step.number >= currentStep,
                    }
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
