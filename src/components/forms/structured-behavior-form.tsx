'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Behavior, CompanyValue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RatingInput } from '@/components/pdr/rating-input';
import { Heart, CheckCircle2, AlertCircle, Save, Sparkles, HelpCircle, TrendingUp, Star, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
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

export interface StructuredBehaviorFormHandle {
  forceSave: () => Promise<void>;
}

interface StructuredBehaviorFormProps {
  companyValues: CompanyValue[];
  existingBehaviors?: Behavior[];
  onSubmit: (data: StructuredBehaviorFormData) => Promise<void>;
  onAutoSave?: (data: StructuredBehaviorFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
  onCompletionChange?: (completed: number, total: number) => void;
  onForceSave?: () => Promise<void>;
}

export const StructuredBehaviorForm = forwardRef<StructuredBehaviorFormHandle, StructuredBehaviorFormProps>(({
  companyValues,
  existingBehaviors = [],
  onSubmit,
  onAutoSave,
  onCancel,
  isSubmitting = false,
  isReadOnly = false,
  onCompletionChange,
  onForceSave,
}, ref) => {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isCurrentlySaving, setIsCurrentlySaving] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isGrantInfoOpen, setIsGrantInfoOpen] = useState(false);

  // Debug: Log received props
  console.log('🔍 [FORM] StructuredBehaviorForm received props:', {
    companyValuesCount: companyValues?.length,
    companyValuesType: typeof companyValues,
    companyValuesIsArray: Array.isArray(companyValues),
    companyValuesData: companyValues,
    existingBehaviorsCount: existingBehaviors?.length
  });

  // Initialize form with all company values
  const defaultValues = companyValues.map(value => {
    const existingBehavior = existingBehaviors.find(b => b.valueId === value.id);
    console.log(`🔍 [FORM] Mapping value ${value.name}:`, {
      valueId: value.id,
      existingBehavior: existingBehavior ? 'found' : 'not found',
      description: existingBehavior?.description || 'empty'
    });
    return {
      valueId: value.id,
      valueName: value.name,
      description: existingBehavior?.description || '',
    };
  });

  console.log('🔍 [FORM] Default values for form:', defaultValues);

  // Load existing development data
  const getExistingDevelopmentData = () => {
    if (typeof window === 'undefined') return { selfReflection: '', deepDiveDevelopment: '' };
    
    try {
      // This should match the behaviors page's PDR ID pattern
      const pdrId = window.location.pathname.split('/')[2]; // Extract PDR ID from URL
      const data = localStorage.getItem(`development_draft_${pdrId}`);
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
    getValues,
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
    
              // Don't sync during save operations to prevent field clearing
          if (isCurrentlySaving) {
            console.log('🔧 SKIPPING sync - currently saving');
            return;
          }
          
          // Don't sync if all fields are already populated with user data
          const allFieldsHaveContent = companyValues.every((value, index) => {
            const fieldValue = watch(`behaviors.${index}.description`);
            return fieldValue && fieldValue.trim().length > 0;
          });
          
          if (allFieldsHaveContent) {
            console.log('🔧 SKIPPING sync - all fields already have content');
            return;
          }
    
          // Skip sync entirely if user is actively typing (any field has focus)
          const activeElement = document.activeElement;
          const isUserTyping = activeElement && (
            activeElement.tagName === 'TEXTAREA' || 
            (activeElement.tagName === 'INPUT' && activeElement.type === 'text')
          );
          
          if (isUserTyping) {
            console.log('🔧 SKIPPING sync - user is actively typing');
            return;
          }
    
              // Only skip sync if user has typed NEW content in fields that already have existing data
          const currentFormValues = watch('behaviors') || [];
          const hasConflictingContent = currentFormValues.some((behavior, index) => {
            if (!behavior?.description || behavior.description.trim().length === 0) {
              return false; // Empty fields can always be synced
            }
            
            // Check if this field already has existing data that would conflict
            const correspondingValue = companyValues[index];
            const existingBehavior = existingBehaviors.find(b => b.valueId === correspondingValue?.id);
            
            // If there's existing data and user typed something different, that's a conflict
            if (existingBehavior && behavior.description !== existingBehavior.description) {
              return true;
            }
            
            return false;
          });
          
          if (hasConflictingContent) {
            console.log('🔧 SKIPPING sync - user has conflicting content that would be lost');
            return;
          }
    
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
  }, [companyValues, existingBehaviors, replace, isCurrentlySaving]); // Prevent sync during saves

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
        descriptionLength: b.description?.length || 0,
        actualDescription: b.description || 'EMPTY'
      }))
    }, null, 2));

    // DEBUG: Also check individual field values directly
    console.log('🔍 Direct field check:', {
      behavior0: watch('behaviors.0.description') || 'EMPTY',
      behavior1: watch('behaviors.1.description') || 'EMPTY', 
      behavior2: watch('behaviors.2.description') || 'EMPTY',
      behavior3: watch('behaviors.3.description') || 'EMPTY'
    });
  }, [fields.length, watchedBehaviors, companyValues.length, watch]);

  // Calculate completion progress for only the 6 required fields (4 core behaviors + 2 development fields)
  // Filter for only the 4 specific core company values that should be included
  const coreValueNames = [
    'Craftsmanship',
    'Lean Thinking', 
    'Value-Centric Innovation',
    'Blameless Problem-Solving'
  ];
  
  const coreBehaviors = watchedBehaviors.filter(behavior => {
    const behaviorValue = companyValues?.find(v => v.id === behavior.valueId);
    return behaviorValue && coreValueNames.includes(behaviorValue.name);
  });
  
  // Count completed core behaviors
  const completedBehaviors = coreBehaviors.filter(behavior => 
    behavior.description && behavior.description.trim().length > 0
  ).length;
  
  const selfReflection = watch('selfReflection');
  const deepDiveDevelopment = watch('deepDiveDevelopment');
  
  const completedDevelopmentFields = [
    selfReflection && selfReflection.trim().length > 0,
    deepDiveDevelopment && deepDiveDevelopment.trim().length > 0
  ].filter(Boolean).length;
  
  const totalCompletedCount = completedBehaviors + completedDevelopmentFields;
  const totalFieldCount = coreBehaviors.length + 2; // Dynamic core behaviors count + 2 development fields
  
  const progressPercentage = (totalCompletedCount / totalFieldCount) * 100;

  // Debug completion calculation
  console.log('🔍 Completion Debug:', {
    allBehaviors: watchedBehaviors.length,
    coreBehaviors: coreBehaviors.length,
    completedBehaviors,
    completedDevelopmentFields,
    totalCompletedCount,
    totalFieldCount,
    coreValueNames,
    coreBehaviorNames: coreBehaviors.map(b => {
      const value = companyValues?.find(v => v.id === b.valueId);
      return value?.name || 'Unknown';
    }),
    completedBehaviorNames: coreBehaviors.filter(b => b.description && b.description.trim().length > 0).map(b => {
      const value = companyValues?.find(v => v.id === b.valueId);
      return value?.name || 'Unknown';
    })
  });

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
      setIsCurrentlySaving(true);
      try {
        await onAutoSave(data);
        // TEMPORARILY DISABLE SUCCESS TOAST - it was causing form field clearing
        // toast.success('Progress saved', { 
        //   duration: 2000,
        //   position: 'bottom-right',
        //   icon: <Save className="h-4 w-4" />
        // });
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Failed to save progress');
      } finally {
        setIsAutoSaving(false);
        setIsCurrentlySaving(false);
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
      // Only save behaviors that have any content (including short descriptions)
      const behaviorsWithContent = watchedBehaviors.filter(b => 
        (b.description && b.description.trim().length > 0)
      );
      
      console.log('🔧 Auto-save triggered:', {
        allBehaviors: watchedBehaviors,
        behaviorsWithContent: behaviorsWithContent,
        currentDataKey: currentDataKey,
        previousKey: previousValuesRef.current
      });
      
      // ADDITIONAL DEBUG: Check what getValues() sees vs watch()
      const formValues = getValues();
      console.log('🔧 getValues() vs watch() comparison:', {
        getValuesResult: formValues.behaviors,
        watchResult: watchedBehaviors,
        directFieldAccess: {
          behavior0: getValues('behaviors.0.description'),
          behavior1: getValues('behaviors.1.description'),
          behavior2: getValues('behaviors.2.description'),
          behavior3: getValues('behaviors.3.description')
        }
      });
      
      const selfReflection = watch('selfReflection');
      const deepDiveDevelopment = watch('deepDiveDevelopment');
      
      // Only auto-save if there's actually meaningful content to save
      // OR if any behavior field has been touched (including partially typed)
      const hasAnyTyping = watchedBehaviors.some(behavior => 
        behavior.description && behavior.description.trim().length > 0
      );
      const hasContentToSave = behaviorsWithContent.length > 0 || 
        hasAnyTyping ||
        (selfReflection && selfReflection.trim().length > 0) ||
        (deepDiveDevelopment && deepDiveDevelopment.trim().length > 0);
      
      if (hasContentToSave) {
        console.log('🔧 Auto-saving with data:', {
          behaviors: watchedBehaviors, // Save ALL behaviors, not just ones with content
          selfReflection,
          deepDiveDevelopment
        });
        previousValuesRef.current = currentDataKey;
        debouncedAutoSave({
          behaviors: watchedBehaviors, // Save ALL behaviors, including empty ones
          selfReflection,
          deepDiveDevelopment
        });
      } else {
        console.log('🔧 No meaningful content to save');
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

  // Manual save function for the Save Progress button
  const handleAutosave = useCallback(async () => {
    if (!onAutoSave) {
      toast.error('Unable to save at this time');
      return;
    }
    
    setIsAutoSaving(true);
    
    try {
      const currentData = getValues();
      const currentBehaviors = currentData.behaviors || [];
      
      // Save all behaviors (including empty ones) and development data
      await onAutoSave({
        behaviors: currentBehaviors,
        selfReflection: currentData.selfReflection || '',
        deepDiveDevelopment: currentData.deepDiveDevelopment || '',
      });
      
      // Update the previous values ref to prevent immediate re-save
      const behaviorsKey = currentBehaviors.map(b => `${b.valueId}:${b.description || ''}`).join('|');
      const selfReflectionKey = currentData.selfReflection || '';
      const deepDiveKey = currentData.deepDiveDevelopment || '';
      previousValuesRef.current = `${behaviorsKey}::${selfReflectionKey}::${deepDiveKey}`;
      
      toast.success('Progress saved successfully');
    } catch (error) {
      console.error('Failed to save progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setIsAutoSaving(false);
    }
  }, [onAutoSave, getValues]);
  
  // Create a force save function that can be called by parent components
  const forceSave = useCallback(async () => {
    if (!onAutoSave) {
      console.log('❌ No onAutoSave function provided');
      return;
    }
    
    console.log('🔧 Force saving current form data');
    
    const currentData = getValues();
    const currentBehaviors = currentData.behaviors || [];
    
    console.log('🔧 Current form data captured:', {
      behaviors: currentBehaviors,
      selfReflection: currentData.selfReflection,
      deepDiveDevelopment: currentData.deepDiveDevelopment,
      behaviorCount: currentBehaviors.length
    });
    
    // Save all behaviors (including empty ones) and development data
    await onAutoSave({
      behaviors: currentBehaviors,
      selfReflection: currentData.selfReflection || '',
      deepDiveDevelopment: currentData.deepDiveDevelopment || '',
    });
    
    console.log('✅ Force save onAutoSave call completed');
  }, [onAutoSave, getValues]);

  // Expose forceSave method to parent components via ref
  useImperativeHandle(ref, () => ({
    forceSave,
  }), [forceSave]);





  return (
    <div className="space-y-6">
      {/* Auto-save indicator - Floating in the top-right corner */}
      {isAutoSaving && (
        <div className="flex items-center text-xs text-muted-foreground fixed top-4 right-4 bg-background/80 backdrop-blur-sm border border-border/50 px-3 py-1.5 rounded-full shadow-sm z-10">
          <Save className="h-3 w-3 mr-1.5 animate-pulse" />
          <span>Saving...</span>
        </div>
      )}

      {/* Core Company Values - 2 Column Layout for Better Readability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fields.map((field, index) => {
          const value = companyValues.find(v => v.id === field.valueId);
          if (!value) return null;
          
          // Only show the 4 core company values
          const coreValueNames = [
            'Craftsmanship',
            'Lean Thinking', 
            'Value-Centric Innovation',
            'Blameless Problem-Solving'
          ];
          if (!coreValueNames.includes(value.name)) {
            return null;
          }
          
          const behavior = watchedBehaviors[index] || {};
          const isCompleted = behavior.description && behavior.description.trim().length > 0;
          const fieldErrors = errors?.behaviors?.[index];
          
          // Define icons for each value to enhance visual recognition
          const getValueIcon = (valueId: string) => {
            switch (valueId) {
              case '550e8400-e29b-41d4-a716-446655440001': // Lean Thinking
                return <TrendingUp className="h-4 w-4 text-primary" />;
              case '550e8400-e29b-41d4-a716-446655440002': // Craftsmanship
                return <CheckCircle2 className="h-4 w-4 text-primary" />;
              case '550e8400-e29b-41d4-a716-446655440003': // Value-Centric Innovation
                return <Sparkles className="h-4 w-4 text-primary" />;
              case '550e8400-e29b-41d4-a716-446655440004': // Blameless Problem-Solving
                return <Heart className="h-4 w-4 text-primary" />;
              default:
                return null;
            }
          };

          return (
            <Card 
              key={field.id} 
              className={`h-fit transition-all duration-200 hover:shadow-md ${
                isCompleted ? 'ring-1 ring-status-success/30 border-status-success/20' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getValueIcon(value.id)}
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
                    className="block text-sm font-medium text-foreground"
                  >
                    How I plan to contribute *
                  </label>
                  <textarea
                    id={`description-${index}`}
                    {...register(`behaviors.${index}.description`)}
                    placeholder="Describe how you plan to contribute to this value..."
                    className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none text-sm leading-relaxed"
                    rows={5}
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

      {/* Self Reflection / Development Section - Enhanced UI */}
      <Card className="mt-8 bg-gradient-to-b from-status-info/5 to-transparent border-status-info/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-base font-semibold">
            <Sparkles className="h-5 w-5 mr-2 text-yellow-400" />
            Professional Development
          </CardTitle>

        </CardHeader>
        <CardContent className="space-y-6">
          {/* Self Reflection */}
          <div className="space-y-2 bg-background p-4 rounded-lg border border-border/80 shadow-sm">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="selfReflection"
                className="block text-sm font-medium text-foreground flex items-center"
              >
                <Star className="h-4 w-4 mr-2 text-status-info" />
                Self Reflection
              </label>

            </div>
            <p className="text-sm text-white mb-2">
              Share your thoughts on how you could develop yourself academically or personally.
            </p>
            <textarea
              id="selfReflection"
              {...register('selfReflection')}
              placeholder="Reflect on areas where you'd like to grow and develop..."
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-status-info/30 focus:border-status-info/30 resize-none text-sm leading-relaxed"
              rows={4}
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
          <div className="space-y-2 bg-background p-4 rounded-lg border border-border/80 shadow-sm">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="deepDiveDevelopment"
                className="block text-sm font-medium text-foreground flex items-center"
              >
                <Sparkles className="h-4 w-4 mr-2 text-status-info" />
                CodeFish 3D - Deep Dive Development
              </label>

            </div>
            <div className="mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center justify-between w-full text-left mb-2 border-dashed border-yellow-400/50 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                onClick={() => setIsGrantInfoOpen(!isGrantInfoOpen)}
              >
                <div className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  What is Deep Dive Development Grant?
                </div>
                {isGrantInfoOpen ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
              
              {isGrantInfoOpen && (
                <div className="bg-status-info/5 border border-status-info/10 rounded-md p-3 mb-3 animate-fadeIn">
                  <p className="text-sm text-white">
                    <strong>Development Budget: $1000</strong> per financial year to invest in your learning and growth. 
                    This could include courses, tools, workshops, or any learning experience that sparks your curiosity and aligns with our goals. 
                    We encourage you to share what you learn with the team to create a culture of continuous improvement.
                  </p>
                </div>
              )}
            </div>
            <textarea
              id="deepDiveDevelopment"
              {...register('deepDiveDevelopment')}
              placeholder="Describe what you'd like to learn or explore with your $1000 development budget..."
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-status-info/30 focus:border-status-info/30 resize-none text-sm leading-relaxed"
              rows={5}
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
          
          {/* Save Progress Button - Added for better UX */}
          <div className="flex justify-end">
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              className="text-status-info border-status-info/30 hover:bg-status-info/5"
              onClick={handleAutosave}
              disabled={isAutoSaving || isReadOnly}
            >
              {isAutoSaving ? (
                <>
                  <Save className="h-3 w-3 mr-2 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
                  Save Progress
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>


    </div>
  );
});

StructuredBehaviorForm.displayName = 'StructuredBehaviorForm';
