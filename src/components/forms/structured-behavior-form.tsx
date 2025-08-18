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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';

// Schema for the structured form that handles all company values at once
const structuredBehaviorSchema = z.object({
  behaviors: z.array(z.object({
    valueId: z.string(),
    valueName: z.string(),
    description: z.string().min(1, 'Please describe how you can meet the values').max(1000, 'Description must be less than 1000 characters'),
  })),
  // Self Reflection / Development fields
  selfReflection: z.string().max(500, 'Self reflection must be less than 500 characters').optional(),
  deepDiveDevelopment: z.string().max(1000, 'Development plan must be less than 1000 characters').optional(),
});

type StructuredBehaviorFormData = z.infer<typeof structuredBehaviorSchema>;

interface StructuredBehaviorFormProps {
  companyValues: CompanyValue[];
  existingBehaviors?: Behavior[];
  onSubmit: (data: StructuredBehaviorFormData) => Promise<void>;
  onAutoSave?: (data: StructuredBehaviorFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
  onCompletionChange?: (completed: number, total: number) => void;
}

export function StructuredBehaviorForm({
  companyValues,
  existingBehaviors = [],
  onSubmit,
  onAutoSave,
  onCancel,
  isSubmitting = false,
  isReadOnly = false,
  onCompletionChange,
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
    };
  });

  // Load existing development data
  const getExistingDevelopmentData = () => {
    if (typeof window === 'undefined') return { selfReflection: '', deepDiveDevelopment: '' };
    
    try {
      // This should match the behaviors page's PDR ID pattern
      const pdrId = window.location.pathname.split('/')[2]; // Extract PDR ID from URL
      const data = localStorage.getItem(`demo_development_${pdrId}`);
      const parsed = data ? JSON.parse(data) : null;
      return {
        selfReflection: parsed?.selfReflection || '',
        deepDiveDevelopment: parsed?.deepDiveDevelopment || ''
      };
    } catch (error) {
      console.error('Error loading existing development data:', error);
      return { selfReflection: '', deepDiveDevelopment: '' };
    }
  };

  const existingDevData = getExistingDevelopmentData();

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
      selfReflection: existingDevData.selfReflection,
      deepDiveDevelopment: existingDevData.deepDiveDevelopment,
    },
    mode: 'onChange',
  });

  const { fields, replace } = useFieldArray({
    control,
    name: 'behaviors',
  });

  // Ensure field array is synced with all company values and loads existing data
  useEffect(() => {
    console.log('🔧 Sync Check - Fields:', fields.length, 'CompanyValues:', companyValues.length, 'ExistingBehaviors:', existingBehaviors.length);
    
    // Always sync if we have company values, regardless of field count
    if (companyValues.length > 0) {
      console.log('🔧 SYNCING field array - Current fields:', fields.length, 'Expected:', companyValues.length);
      console.log('🔧 Full Existing behaviors data:', JSON.stringify(existingBehaviors, null, 2));
      
      const syncedValues = companyValues.map(value => {
        const existingBehavior = existingBehaviors.find(b => b.valueId === value.id);
        console.log(`🔧 Value ${value.name} (${value.id}): found behavior =`, existingBehavior);
        console.log(`🔧 Setting description to: "${existingBehavior?.description || 'EMPTY'}"`);
        return {
          valueId: value.id,
          valueName: value.name,
          description: existingBehavior?.description || '',
        };
      });
      
      console.log('🔧 Final synced values:', syncedValues);
      replace(syncedValues);
    } else {
      console.log('🔧 No company values yet');
    }
  }, [companyValues, existingBehaviors, replace]); // Removed fields.length dependency

  const watchedBehaviors = watch('behaviors');

  // Debug: Log the watched behaviors to verify all 4 are tracked
  useEffect(() => {
    console.log('🔍 Form Debug - Watched Behaviors:', JSON.stringify({
      fieldsLength: fields.length,
      watchedBehaviorsLength: watchedBehaviors.length,
      companyValuesLength: companyValues.length,
      watchedBehaviors: watchedBehaviors.map(b => ({
        valueId: b.valueId,
        valueName: b.valueName,
        hasDescription: !!b.description,
        descriptionLength: b.description?.length || 0
      }))
    }, null, 2));
  }, [fields.length, watchedBehaviors, companyValues.length]);

  // Calculate completion progress for all 6 fields (4 behaviors + 2 development fields)
  const completedBehaviors = watchedBehaviors.filter(behavior => 
    behavior.description && behavior.description.trim().length > 3
  ).length;
  
  const selfReflection = watch('selfReflection');
  const deepDiveDevelopment = watch('deepDiveDevelopment');
  
  const completedDevelopmentFields = [
    selfReflection && selfReflection.trim().length > 3,
    deepDiveDevelopment && deepDiveDevelopment.trim().length > 3
  ].filter(Boolean).length;
  
  const totalCompletedCount = completedBehaviors + completedDevelopmentFields;
  const totalFieldCount = companyValues.length + 2; // 4 behaviors + 2 development fields = 6 total
  
  const progressPercentage = (totalCompletedCount / totalFieldCount) * 100;

  // Notify parent of completion changes (now includes all 6 fields)
  useEffect(() => {
    if (onCompletionChange) {
      onCompletionChange(totalCompletedCount, totalFieldCount);
    }
  }, [totalCompletedCount, totalFieldCount, onCompletionChange]);

  // Auto-save functionality with debouncing
  const debouncedAutoSave = useCallback(
    async (data: StructuredBehaviorFormData) => {
      if (!onAutoSave || isReadOnly) return;
      
      setIsAutoSaving(true);
      try {
        await onAutoSave(data);
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
    const isNowCompleted = totalCompletedCount === totalFieldCount && totalCompletedCount > 0;
    
    setAllCompleted(isNowCompleted);
    
    // Trigger celebration when first completed
    if (!wasCompleted && isNowCompleted) {
      setShowCelebration(true);
      toast.success('🎉 All values completed! Ready to continue.', {
        duration: 4000,
        position: 'top-center',
        icon: <Sparkles className="h-4 w-4" />
      });
      
      // Remove auto-save from celebration to prevent data loss
      // The regular auto-save logic will handle saving the data
      
      // Hide celebration after animation
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [totalCompletedCount, totalFieldCount, allCompleted]);

  // Track previous values to prevent unnecessary saves
  const previousValuesRef = useRef<string>('');
  
  // Create a stable key for the current data
  const currentDataKey = useMemo(() => {
    const behaviorsKey = watchedBehaviors.map(b => `${b.valueId}:${b.description || ''}`).join('|');
    const selfReflectionKey = watch('selfReflection') || '';
    const deepDiveKey = watch('deepDiveDevelopment') || '';
    return `${behaviorsKey}::${selfReflectionKey}::${deepDiveKey}`;
  }, [watchedBehaviors, watch('selfReflection'), watch('deepDiveDevelopment')]);

  // Auto-save when data actually changes (debounced) - only save behaviors with substantial content
  useEffect(() => {
    if (!onAutoSave || currentDataKey === previousValuesRef.current) return;
    
    const timer = setTimeout(() => {
      // Only save behaviors that have meaningful content (not just single characters or empty)
      const behaviorsWithContent = watchedBehaviors.filter(b => 
        (b.description && b.description.trim().length > 3)
      );
      
      const selfReflection = watch('selfReflection');
      const deepDiveDevelopment = watch('deepDiveDevelopment');
      
      // Only auto-save if there's actually meaningful content to save
      const hasContentToSave = behaviorsWithContent.length > 0 || 
        (selfReflection && selfReflection.trim().length > 3) ||
        (deepDiveDevelopment && deepDiveDevelopment.trim().length > 3);
      
      if (hasContentToSave) {
        previousValuesRef.current = currentDataKey;
        debouncedAutoSave({
          behaviors: behaviorsWithContent,
          selfReflection,
          deepDiveDevelopment
        });
      }
    }, 3000); // 3 second debounce to reduce frequency

    return () => clearTimeout(timer);
  }, [currentDataKey, onAutoSave, debouncedAutoSave, watchedBehaviors, watch]);

  const handleFormSubmit = async (data: StructuredBehaviorFormData) => {
    try {
      await onSubmit(data);
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
                {totalCompletedCount} of {totalFieldCount} completed
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
        {fields.map((field, index) => {
          const value = companyValues.find(v => v.id === field.valueId);
          if (!value) return null;
          
          const behavior = watchedBehaviors[index] || {};
          const isCompleted = behavior.description && behavior.description.trim().length > 3;
          const fieldErrors = errors?.behaviors?.[index];

          return (
            <Card key={field.id} className={`h-fit ${isCompleted ? 'ring-1 ring-status-success/30' : ''}`}>
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
                {/* Hidden fields for valueId and valueName */}
                <input type="hidden" {...register(`behaviors.${index}.valueId`)} value={value.id} />
                <input type="hidden" {...register(`behaviors.${index}.valueName`)} value={value.name} />
                
                {/* Description */}
                <div className="space-y-1">
                  <label 
                    htmlFor={`description-${index}`}
                    className="block text-xs font-medium text-foreground"
                  >
                    How I Can Meet The Values *
                  </label>
                  <textarea
                    id={`description-${index}`}
                    {...register(`behaviors.${index}.description`)}
                    placeholder="Describe how you embody this value..."
                    className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none text-xs leading-relaxed"
                    rows={4}
                    disabled={isReadOnly}
                  />
                  {fieldErrors?.description && (
                    <p className="text-xs text-status-error">
                      {fieldErrors.description.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Self Reflection / Development Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-semibold">
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            Self Reflection / Development
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Reflect on your development goals and how you'd like to grow.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Self Reflection */}
          <div className="space-y-1">
            <label 
              htmlFor="selfReflection"
              className="block text-xs font-medium text-foreground"
            >
              Self Reflection
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Share your thoughts on how you could develop yourself academically or personally.
            </p>
            <textarea
              id="selfReflection"
              {...register('selfReflection')}
              placeholder="Reflect on areas where you'd like to grow and develop..."
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none text-xs leading-relaxed"
              rows={3}
              maxLength={500}
              disabled={isReadOnly}
            />
            <div className="flex justify-between items-center">
              {errors.selfReflection && (
                <p className="text-xs text-status-error">
                  {errors.selfReflection.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {watch('selfReflection')?.length || 0}/500
              </p>
            </div>
          </div>

          {/* CodeFish 3D - Deep Dive Development */}
          <div className="space-y-1">
            <label 
              htmlFor="deepDiveDevelopment"
              className="block text-xs font-medium text-foreground"
            >
              CodeFish 3D - Deep Dive Development
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              You have up to $1000 per financial year to invest in your learning and growth. 
              This could include courses, tools, workshops, or any learning experience that sparks your curiosity and aligns with our goals. 
              We encourage you to share what you learn with the team to create a culture of continuous improvement.
            </p>
            <textarea
              id="deepDiveDevelopment"
              {...register('deepDiveDevelopment')}
              placeholder="Describe what you'd like to learn or explore with your $1000 development budget..."
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none text-xs leading-relaxed"
              rows={4}
              maxLength={1000}
              disabled={isReadOnly}
            />
            <div className="flex justify-between items-center">
              {errors.deepDiveDevelopment && (
                <p className="text-xs text-status-error">
                  {errors.deepDiveDevelopment.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {watch('deepDiveDevelopment')?.length || 0}/1000
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
