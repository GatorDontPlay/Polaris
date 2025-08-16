'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Behavior, CompanyValue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RatingInput } from '@/components/pdr/rating-input';
import { Heart, CheckCircle2, AlertCircle, Save, Sparkles } from 'lucide-react';
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
  const [currentValueIndex, setCurrentValueIndex] = useState(0);
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
    behavior.employeeSelfAssessment && 
    behavior.employeeRating > 0
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
          (b.employeeSelfAssessment && b.employeeSelfAssessment.trim().length > 3) ||
          b.employeeRating > 0
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

  const handleRatingChange = (index: number, rating: number) => {
    setValue(`behaviors.${index}.employeeRating`, rating, { shouldValidate: true });
  };

  const nextValue = () => {
    if (currentValueIndex < companyValues.length - 1) {
      // Auto-save current progress before moving if there's substantial content
      if (onAutoSave && watchedBehaviors[currentValueIndex]) {
        const currentBehaviorData = watchedBehaviors[currentValueIndex];
        if ((currentBehaviorData.description && currentBehaviorData.description.trim().length > 3) || 
            (currentBehaviorData.examples && currentBehaviorData.examples.trim().length > 3) || 
            (currentBehaviorData.employeeSelfAssessment && currentBehaviorData.employeeSelfAssessment.trim().length > 3) ||
            currentBehaviorData.employeeRating > 0) {
          debouncedAutoSave([currentBehaviorData]);
        }
      }
      // Transition to next value
      setCurrentValueIndex(currentValueIndex + 1);
    }
  };

  const previousValue = () => {
    if (currentValueIndex > 0) {
      setCurrentValueIndex(currentValueIndex - 1);
    }
  };

  const goToValue = (index: number) => {
    setCurrentValueIndex(index);
  };

  const currentBehavior = watchedBehaviors[currentValueIndex];
  const currentValue = companyValues[currentValueIndex];
  const currentErrors = errors.behaviors?.[currentValueIndex];

  const isCurrentValueComplete = currentBehavior && 
    currentBehavior.description && 
    currentBehavior.examples && 
    currentBehavior.employeeSelfAssessment && 
    currentBehavior.employeeRating > 0;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card className={`transition-all duration-500 ${showCelebration ? 'ring-2 ring-status-success shadow-lg' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Heart className="h-5 w-5 mr-2 text-activity-behavior" />
              Company Values & Behaviors Assessment
              {showCelebration && (
                <Sparkles className="h-5 w-5 ml-2 text-status-success animate-pulse" />
              )}
            </div>
            <div className="flex items-center space-x-3">
              {isAutoSaving && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Save className="h-4 w-4 mr-1 animate-pulse" />
                  <span>Saving...</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {completedCount} of {companyValues.length} completed
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Complete your assessment for each company value. Provide specific examples and reflect on your alignment with our values.
            </p>

            {/* Value Navigation */}
            <div className="grid grid-cols-3 gap-2">
              {companyValues.map((value, index) => {
                const isCompleted = watchedBehaviors[index] && 
                  watchedBehaviors[index].description && 
                  watchedBehaviors[index].examples && 
                  watchedBehaviors[index].employeeSelfAssessment && 
                  watchedBehaviors[index].employeeRating > 0;
                
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => goToValue(index)}
                    className={`p-2 text-left rounded-md transition-colors ${
                      currentValueIndex === index
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-status-success/10 text-status-success hover:bg-status-success/20'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{value.name}</span>
                      {isCompleted && (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Value Form */}
      <div key={currentValueIndex} className="animate-in fade-in-50 duration-300">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <span className="text-primary">
                  {currentValueIndex + 1}. {currentValue.name}
                </span>
                {isCurrentValueComplete && (
                  <CheckCircle2 className="h-5 w-5 text-status-success ml-2 inline" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentValueIndex + 1} of {companyValues.length}
              </div>
            </CardTitle>
            <div className="mt-2 p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>{currentValue.name}:</strong> {currentValue.description}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div className="transition-all duration-300">
              <label 
                htmlFor={`description-${currentValueIndex}`}
                className="block text-sm font-medium text-foreground mb-1"
              >
                How I Demonstrate This Value *
              </label>
              <textarea
                id={`description-${currentValueIndex}`}
                {...register(`behaviors.${currentValueIndex}.description`)}
                placeholder="Describe how you embody this value in your daily work..."
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none transition-all duration-200"
                rows={3}
                disabled={isReadOnly}
              />
              {currentErrors?.description && (
                <p className="mt-1 text-sm text-status-error animate-in slide-in-from-top-1 duration-200">
                  {currentErrors.description.message}
                </p>
              )}
            </div>

            {/* Examples */}
            <div className="transition-all duration-300">
              <label 
                htmlFor={`examples-${currentValueIndex}`}
                className="block text-sm font-medium text-foreground mb-1"
              >
                Specific Examples *
              </label>
              <textarea
                id={`examples-${currentValueIndex}`}
                {...register(`behaviors.${currentValueIndex}.examples`)}
                placeholder="Provide concrete examples of when you demonstrated this value..."
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none transition-all duration-200"
                rows={3}
                disabled={isReadOnly}
              />
              {currentErrors?.examples && (
                <p className="mt-1 text-sm text-status-error animate-in slide-in-from-top-1 duration-200">
                  {currentErrors.examples.message}
                </p>
              )}
            </div>

            {/* Self Assessment */}
            <div className="transition-all duration-300">
              <label 
                htmlFor={`selfAssessment-${currentValueIndex}`}
                className="block text-sm font-medium text-foreground mb-1"
              >
                Self Assessment & Growth Areas *
              </label>
              <textarea
                id={`selfAssessment-${currentValueIndex}`}
                {...register(`behaviors.${currentValueIndex}.employeeSelfAssessment`)}
                placeholder="Reflect on your strengths and areas for improvement regarding this value..."
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none transition-all duration-200"
                rows={3}
                disabled={isReadOnly}
              />
              {currentErrors?.employeeSelfAssessment && (
                <p className="mt-1 text-sm text-status-error animate-in slide-in-from-top-1 duration-200">
                  {currentErrors.employeeSelfAssessment.message}
                </p>
              )}
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Self Rating *
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Rate how well you feel you demonstrate this value (1 = Needs Improvement, 5 = Exceptional)
              </p>
              <RatingInput
                value={currentBehavior?.employeeRating || 0}
                onChange={(rating) => handleRatingChange(currentValueIndex, rating)}
                disabled={isReadOnly}
              />
              {currentErrors?.employeeRating && (
                <p className="mt-1 text-sm text-status-error">
                  {currentErrors.employeeRating.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <Button
                type="button"
                variant="outline"
                onClick={previousValue}
                disabled={currentValueIndex === 0}
              >
                Previous Value
              </Button>

              {/* Completion Status */}
              <div className="flex items-center space-x-2">
                {completedCount < companyValues.length && (
                  <div className="flex items-center text-amber-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">
                      {companyValues.length - completedCount} values remaining
                    </span>
                  </div>
                )}
                {completedCount === companyValues.length && (
                  <div className="flex items-center text-status-success">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">All values completed!</span>
                  </div>
                )}
                {isAutoSaving && (
                  <div className="flex items-center text-muted-foreground">
                    <Save className="h-4 w-4 mr-1 animate-pulse" />
                    <span className="text-sm">Auto-saving...</span>
                  </div>
                )}
              </div>

              {/* Next Button (No Submit) */}
              <div className="flex space-x-2">
                {currentValueIndex < companyValues.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextValue}
                  >
                    Next Value
                  </Button>
                ) : (
                  <div className="flex items-center text-status-success">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Assessment Complete</span>
                  </div>
                )}
                
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
