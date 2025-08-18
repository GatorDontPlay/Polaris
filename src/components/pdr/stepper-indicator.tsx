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
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar - Moved to top for better hierarchy */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
          <span className="font-medium">Progress</span>
          <span className="font-semibold text-foreground">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-status-success to-status-success/80 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps Container - Responsive design */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0">
        {steps.map((step, index) => {
          // Mark a step as completed if it's less than the current step
          // This ensures previous steps are shown as completed
          const isCompleted = step.number < currentStep || 
            // Special case: Force step 2 (behaviors) to be completed when on step 3 (review)
            (currentStep === 3 && step.number === 2);
          const isActive = step.number === currentStep;
          const isClickable = onStepClick && step.number <= currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1 group">
              {/* Step Circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full border-2 text-sm font-bold transition-all duration-300 shadow-lg',
                  {
                    'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary shadow-primary/25': isActive,
                    'bg-gradient-to-br from-status-success to-status-success/80 text-status-success-foreground border-status-success shadow-status-success/25': isCompleted,
                    'bg-background text-muted-foreground border-border hover:border-border/80': !isActive && !isCompleted,
                    'cursor-pointer hover:scale-105 hover:shadow-xl': isClickable,
                    'ring-4 ring-primary/20': isActive,
                  }
                )}
                onClick={() => isClickable && onStepClick(step.number)}
              >
                {isCompleted ? (
                  <CheckIcon className="w-6 h-6" />
                ) : (
                  step.number
                )}
              </div>

              {/* Step Content */}
              <div className="ml-4 flex-1 min-w-0">
                <div
                  className={cn(
                    'text-base font-semibold leading-tight',
                    {
                      'text-foreground': isActive,
                      'text-status-success': isCompleted,
                      'text-muted-foreground': !isActive && !isCompleted,
                    }
                  )}
                >
                  {step.title}
                </div>
                <div 
                  className={cn(
                    'text-sm mt-1 leading-relaxed',
                    {
                      'text-muted-foreground/90': isActive,
                      'text-muted-foreground/70': isCompleted,
                      'text-muted-foreground/60': !isActive && !isCompleted,
                    }
                  )}
                >
                  {step.description}
                </div>
              </div>

              {/* Connector Line - Hidden on mobile, visible on desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex items-center mx-6">
                  <div
                    className={cn(
                      'h-1 w-16 rounded-full transition-all duration-300',
                      {
                        'bg-gradient-to-r from-status-success to-primary': step.number < currentStep,
                        'bg-border/50': step.number >= currentStep,
                      }
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}