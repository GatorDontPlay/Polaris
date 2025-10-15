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
  pdrStatus?: string; // Optional PDR status to help determine completion
}

export function StepperIndicator({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
  className,
  pdrStatus,
}: StepperIndicatorProps) {
  console.log('🎯 STEPPER CALLED! pdrStatus:', pdrStatus, 'currentStep:', currentStep);
  
  // Handle undefined/null currentStep with fallback
  const safeCurrentStep = currentStep || 1;
  
  // Determine completion status based on PDR status
  const midYearCompletedByStatus = pdrStatus && ['MID_YEAR_APPROVED', 'END_YEAR_SUBMITTED', 'COMPLETED'].includes(pdrStatus);
  const reviewCompletedByStatus = pdrStatus && ['MID_YEAR_APPROVED', 'END_YEAR_SUBMITTED', 'COMPLETED'].includes(pdrStatus);
  const allStepsCompletedByStatus = pdrStatus && ['COMPLETED'].includes(pdrStatus);
  
  console.log('🎯 STEPPER STATUS CHECK:', {
    pdrStatus,
    midYearCompletedByStatus,
    reviewCompletedByStatus,
    allStepsCompletedByStatus,
    safeCurrentStep
  });
  
  // Calculate progress percentage based on the current step
  const progressPercentage = Math.round((safeCurrentStep / totalSteps) * 100);
  const normalizedProgress = progressPercentage;

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
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

      {/* Steps Container */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-0">
        {steps.map((step, index) => {
          // Explicitly check special step conditions using safe current step
          const isMidYearStep = safeCurrentStep === 4;
          const isEndYearStep = safeCurrentStep === 5;
          const isPostEndYear = safeCurrentStep > 5; // If somehow beyond step 5
          
          // Mark steps as completed with enhanced logic:
          // 1. Normal rule: All previous steps are completed
          // 2. Status-based completion: Use PDR status to determine what's been completed
          // 3. Step-based completion: Use current step position
          const isCompleted = 
            step.number < safeCurrentStep ||  // Normal completion rule for all steps before current
            (step.number <= 3 && allStepsCompletedByStatus) || // All initial steps completed if PDR is submitted/completed
            (step.number === 3 && (isMidYearStep || isEndYearStep || isPostEndYear || reviewCompletedByStatus)) || // Mark Review as completed
            (step.number === 4 && (isEndYearStep || isPostEndYear || midYearCompletedByStatus)) || // Mark Mid-Year as completed
            (step.number <= 5 && allStepsCompletedByStatus); // All steps completed if PDR is fully submitted
            
          const isActive = step.number === safeCurrentStep;
          const isClickable = onStepClick && step.number <= safeCurrentStep;
          
          // Debug logging for each step
          if (step.number === 4) {
            console.log('🎯 MID-YEAR STEP 4 CHECK:', {
              stepNumber: step.number,
              stepTitle: step.title,
              isCompleted,
              isActive,
              pdrStatus,
              midYearCompletedByStatus,
              safeCurrentStep,
              'step.number < safeCurrentStep': step.number < safeCurrentStep,
              'step.number === 4 && midYearCompletedByStatus': step.number === 4 && midYearCompletedByStatus
            });
          }

          return (
            <div key={step.number} className="flex items-center flex-1 group relative">
              {/* Mobile Vertical Connector */}
              {index > 0 && (
                <div className="absolute top-[-24px] left-8 h-6 w-2 bg-gray-700 lg:hidden">
                  {step.number <= safeCurrentStep && (
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
                    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400 shadow-emerald-500/40': isCompleted,
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
                      'text-base text-emerald-400 font-bold': isCompleted,
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

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex items-center mx-6">
                  <div
                    className={cn(
                      'h-2 w-16 rounded-full transition-all duration-300',
                      {
                        'bg-gradient-to-r from-emerald-500 to-emerald-400': step.number < safeCurrentStep,
                        'bg-gray-700': step.number >= safeCurrentStep,
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
