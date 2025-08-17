'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Behavior, CompanyValue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RatingInput } from '@/components/pdr/rating-input';
import { Heart, CheckCircle2, AlertCircle, Save, Sparkles, HelpCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// Schema for the structured form that handles all company values at once
const structuredBehaviorSchema = z.object({
  behaviors: z.array(z.object({
    valueId: z.string(),
    valueName: z.string(),
    description: z.string().min(1, 'Please describe how you demonstrate this value').max(1000, 'Description must be less than 1000 characters'),
    examples: z.string().min(1, 'Please provide specific examples').max(1000, 'Examples must be less than 1000 characters'),
    employeeSelfAssessment: z.string().min(1, 'Please provide your self-assessment').max(1000, 'Self-assessment must be less than 1000 characters'),
    employeeRating: z.number().min(1, 'Please provide a rating').max(5, 'Rating must be between 1 and 5'),
  })),
});

type StructuredBehaviorFormData = z.infer<typeof structuredBehaviorSchema>;

interface StructuredBehaviorFormProps {
  companyValues: CompanyValue[];
  existingBehaviors?: Behavior[];
  onSubmit: (behaviors: StructuredBehaviorFormData['behaviors']) => Promise<void>;
  onAutoSave?: (behaviors: StructuredBehaviorFormData['behaviors']) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
}

export function StructuredBehaviorForm({
  companyValues,
  existingBehaviors = [],
  onSubmit,
  onAutoSave,
  onCancel,
  isSubmitting = false,
  isReadOnly = false,
}: StructuredBehaviorFormProps) {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Initialize form with all company values
  const defaultValues = companyValues.map(value => {
    const existingBehavior = existingBehaviors.find(b => b.valueId === value.id);
    return {
      valueId: value.id,
      valueName: value.name,
      description: existingBehavior?.description || '',
      examples: existingBehavior?.examples || '',
      employeeSelfAssessment: existingBehavior?.employeeSelfAssessment || '',
      employeeRating: existingBehavior?.employeeRating || 0,
    };
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    control,
  } = useForm<StructuredBehaviorFormData>({
    resolver: zodResolver(structuredBehaviorSchema),
    defaultValues: {
      behaviors: defaultValues,
    },
    mode: 'onChange',
  });

  const { fields } = useFieldArray({
    control,
    name: 'behaviors',
  });

  const watchedBehaviors = watch('behaviors');

  // Calculate completion progress
  const completedCount = watchedBehaviors.filter(behavior => 
    behavior.description && 
    behavior.examples && 
    behavior.employeeSelfAssessment
  ).length;
  
  const progressPercentage = (completedCount / companyValues.length) * 100;

  // Auto-save functionality with debouncing
  const debouncedAutoSave = useCallback(
    async (behaviors: StructuredBehaviorFormData['behaviors']) => {
      if (!onAutoSave || isReadOnly) return;
      
      setIsAutoSaving(true);
      try {
        await onAutoSave(behaviors);
        toast.success('Progress saved', { 
          duration: 2000,
          position: 'bottom-right',
          icon: <Save className="h-4 w-4" />
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Failed to save progress');
      } finally {
        setIsAutoSaving(false);
      }
    },
    [onAutoSave, isReadOnly]
  );

  // Check for completion and trigger celebration
  useEffect(() => {
    const wasCompleted = allCompleted;
    const isNowCompleted = completedCount === companyValues.length && completedCount > 0;
    
    setAllCompleted(isNowCompleted);
    
    // Trigger celebration when first completed
    if (!wasCompleted && isNowCompleted) {
      setShowCelebration(true);
      toast.success('🎉 All values completed! Ready to continue.', {
        duration: 4000,
        position: 'top-center',
        icon: <Sparkles className="h-4 w-4" />
      });
      
      // Auto-save when completed
      if (onAutoSave) {
        debouncedAutoSave(watchedBehaviors);
      }
      
      // Hide celebration after animation
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [completedCount, companyValues.length, allCompleted, debouncedAutoSave, onAutoSave, watchedBehaviors]);

  // Auto-save when user moves between values (debounced) - only save behaviors with substantial content
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onAutoSave) {
        // Only save behaviors that have meaningful content (not just single characters or empty)
        const behaviorsWithContent = watchedBehaviors.filter(b => 
          (b.description && b.description.trim().length > 3) || 
          (b.examples && b.examples.trim().length > 3) || 
          (b.employeeSelfAssessment && b.employeeSelfAssessment.trim().length > 3)
        );
        
        if (behaviorsWithContent.length > 0) {
          debouncedAutoSave(behaviorsWithContent);
        }
      }
    }, 3000); // 3 second debounce to reduce frequency

    return () => clearTimeout(timer);
  }, [watchedBehaviors, debouncedAutoSave, onAutoSave]);

  const handleFormSubmit = async (data: StructuredBehaviorFormData) => {
    try {
      await onSubmit(data.behaviors);
      toast.success('Assessment completed successfully!');
    } catch (error) {
      console.error('Failed to save behaviors:', error);
      toast.error('Failed to save assessment');
    }
  };





  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card className={`transition-all duration-500 ${showCelebration ? 'ring-2 ring-status-success shadow-lg' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center">
              <Heart className="h-4 w-4 mr-2 text-activity-behavior" />
              Company Values & Behaviors Assessment
              {showCelebration && (
                <Sparkles className="h-4 w-4 ml-2 text-status-success animate-pulse" />
              )}
            </div>
            <div className="flex items-center space-x-3">
              {isAutoSaving && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Save className="h-3 w-3 mr-1 animate-pulse" />
                  <span>Saving...</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {completedCount} of {companyValues.length} completed
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Overall Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
            
            <p className="text-xs text-muted-foreground">
              Complete your assessment for each company value. Provide specific examples and reflect on your alignment with our values.
            </p>


          </div>
        </CardContent>
      </Card>

      {/* All Values Form - 4 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {companyValues.map((value, index) => {
          const behavior = watchedBehaviors[index] || {};
          const isCompleted = behavior.description && 
            behavior.examples && 
            behavior.employeeSelfAssessment;
          const fieldErrors = errors?.behaviors?.[index];

          return (
            <Card key={value.id} className={`h-fit ${isCompleted ? 'ring-1 ring-status-success/30' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-semibold">{value.name}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">{value.name}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {isCompleted && (
                    <CheckCircle2 className="h-4 w-4 text-status-success flex-shrink-0 mt-0.5" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`description-${index}`}
                    className="block text-xs font-medium text-foreground"
                  >
                    How I Demonstrate This Value *
                  </label>
                  <textarea
                    id={`description-${index}`}
                    {...register(`behaviors.${index}.description`)}
                    placeholder="Describe how you embody this value..."
                    className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none text-xs leading-relaxed"
                    rows={3}
                    disabled={isReadOnly}
                  />
                  {fieldErrors?.description && (
                    <p className="text-xs text-status-error">
                      {fieldErrors.description.message}
                    </p>
                  )}
                </div>

                {/* Examples */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`examples-${index}`}
                    className="block text-xs font-medium text-foreground"
                  >
                    Specific Examples *
                  </label>
                  <textarea
                    id={`examples-${index}`}
                    {...register(`behaviors.${index}.examples`)}
                    placeholder="Provide concrete examples..."
                    className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none text-xs leading-relaxed"
                    rows={3}
                    disabled={isReadOnly}
                  />
                  {fieldErrors?.examples && (
                    <p className="text-xs text-status-error">
                      {fieldErrors.examples.message}
                    </p>
                  )}
                </div>

                {/* Self Assessment */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`selfAssessment-${index}`}
                    className="block text-xs font-medium text-foreground"
                  >
                    Self Assessment & Growth *
                  </label>
                  <textarea
                    id={`selfAssessment-${index}`}
                    {...register(`behaviors.${index}.employeeSelfAssessment`)}
                    placeholder="Reflect on strengths and improvements..."
                    className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none text-xs leading-relaxed"
                    rows={3}
                    disabled={isReadOnly}
                  />
                  {fieldErrors?.employeeSelfAssessment && (
                    <p className="text-xs text-status-error">
                      {fieldErrors.employeeSelfAssessment.message}
                    </p>
                  )}
                </div>


              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Behaviors Summary - Fixed bottom right */}
      {companyValues && companyValues.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="bg-background border shadow-lg">
            <CardContent className="px-3 py-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-3 w-3 text-activity-behavior" />
                  <span className="text-xs font-medium">Values Summary</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-400">{completedCount}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-emerald-400">{Math.round(progressPercentage)}%</div>
                    <div className="text-xs text-muted-foreground">Progress</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
