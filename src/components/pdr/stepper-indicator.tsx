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
  // Calculate progress percentage based on the current step
  // This matches the original application's behavior, showing a percentage of progress
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);
  const normalizedProgress = progressPercentage;

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar - Moved to top for better hierarchy */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
          <span className="font-medium">Progress</span>
          <span className="font-semibold text-foreground">{normalizedProgress}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
          <div
            className="glow-effect h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
      </div>

      {/* Steps Container - Responsive design */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-0">
        {steps.map((step, index) => {
          // Mark a step as completed if it's less than the current step
          // This ensures previous steps are shown as completed
          const isCompleted = step.number < currentStep || 
            // Special case: Force step 2 (behaviors) to be completed when on step 3 (review)
            (currentStep >= 3 && step.number === 2);
          
          // Special case: Make Behaviors step flash when on Review page
          const isBehaviorsOnReviewPage = step.number === 2 && currentStep === 3;
          const isActive = step.number === currentStep;
          // Only allow clicking on steps that are completed or current
          const isClickable = onStepClick && step.number <= currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1 group relative">
              {/* Mobile Vertical Connector */}
              {index > 0 && (
                <div className="absolute top-[-24px] left-8 h-6 w-2 bg-gray-700 lg:hidden">
                  {step.number <= currentStep && (
                    <div className="absolute inset-0 bg-emerald-400 rounded-full" />
                  )}
                </div>
              )}
              {/* Step Circle */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => isClickable && onStepClick && onStepClick(step.number)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    isClickable && onStepClick && onStepClick(step.number);
                  }
                }}
                className={cn(
                  'flex items-center justify-center w-16 h-16 rounded-full border-2 text-base font-bold transition-all duration-300 shadow-lg',
                  {
                    'bg-gradient-to-br from-primary to-primary/80 text-white border-primary shadow-primary/25 scale-110 ring-4 ring-primary/30 animate-pulse': isActive,
                    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400 shadow-emerald-500/40 animate-pulse': isBehaviorsOnReviewPage,
                    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400 shadow-emerald-500/40': isCompleted && !isBehaviorsOnReviewPage,
                    'bg-gray-800 text-white border-gray-600 hover:border-white/80': !isActive && !isCompleted,
                    'cursor-pointer hover:scale-105 hover:shadow-xl': isClickable,
                  }
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="w-8 h-8 text-emerald-400 stroke-[3]" />
                ) : isActive ? (
                  <span className="text-xl text-white font-bold">{step.number}</span>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Step Content */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => isClickable && onStepClick && onStepClick(step.number)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    isClickable && onStepClick && onStepClick(step.number);
                  }
                }}
                className={cn(
                  "ml-4 flex-1 min-w-0 cursor-pointer",
                  isClickable && "hover:opacity-80"
                )}
              >
                <div
                  className={cn(
                    'font-semibold leading-tight',
                    {
                      'text-lg text-white font-bold underline decoration-primary decoration-2 underline-offset-4': isActive,
                      'text-base text-emerald-400 font-bold animate-pulse': isBehaviorsOnReviewPage,
                      'text-base text-emerald-400 font-bold': isCompleted && !isBehaviorsOnReviewPage,
                      'text-base text-white font-medium': !isActive && !isCompleted,
                    }
                  )}
                >
                  {step.title}
                </div>
                <div 
                  className={cn(
                    'text-sm mt-1 leading-relaxed',
                    {
                      'text-white/90': isActive,
                      'text-gray-300/90': isCompleted,
                      'text-white/80': !isActive && !isCompleted,
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
                      'h-2 w-16 rounded-full transition-all duration-300',
                      {
                        'bg-gradient-to-r from-emerald-500 to-emerald-400': step.number < currentStep,
                        'bg-gray-700': step.number >= currentStep,
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