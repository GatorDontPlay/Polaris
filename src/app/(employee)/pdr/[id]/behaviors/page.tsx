'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabasePDR, useSupabasePDRBehaviors, useSupabasePDRUpdate } from '@/hooks/use-supabase-pdrs';
import { useCompanyValues } from '@/hooks/use-company-values';
import { StructuredBehaviorForm, StructuredBehaviorFormHandle } from '@/components/forms/structured-behavior-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import { BehaviorFormData } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

interface BehaviorsPageProps {
  params: { id: string };
}

export default function BehaviorsPage({ params }: BehaviorsPageProps) {
  const router = useRouter();
  const formRef = useRef<StructuredBehaviorFormHandle>(null);
  const [hasCleanedDuplicates, setHasCleanedDuplicates] = useState(false);
  const [formCompletedCount, setFormCompletedCount] = useState(0);
  const [formTotalCount, setFormTotalCount] = useState(6); // 4 core behaviors + 2 development fields
  
  // Remove localStorage clearing to preserve existing data
  // useEffect(() => {
  //   console.log('🧹 Clearing localStorage for fresh test...');
  //   localStorage.removeItem('demo_behaviors_pdr-1');
  // }, []);
  
  const { data: pdr, isLoading: pdrLoading } = useSupabasePDR(params.id);
  const { 
    data: behaviors, 
    isLoading: behaviorsLoading,
    createBehavior,
    updateBehavior
  } = useSupabasePDRBehaviors(params.id);
  const { data: companyValues, isLoading: companyValuesLoading } = useCompanyValues();
  const { updatePDR } = useSupabasePDRUpdate(params.id);

  const isLoading = pdrLoading || behaviorsLoading || companyValuesLoading;
  const isReadOnly = pdr?.isLocked || false;
  const canEdit = pdr && !isReadOnly && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED' || pdr.status === 'OPEN_FOR_REVIEW' || pdr.status === 'Created');

  // Debug PDR permissions
  console.log('🔧 PDR Permissions Debug:', {
    pdr: pdr,
    pdrStatus: pdr?.status,
    isLocked: pdr?.isLocked,
    isReadOnly: isReadOnly,
    canEdit: canEdit,
    isFormReadOnly: !canEdit
  });

  // Update PDR step to 2 (Behaviors) when user reaches this page
  useEffect(() => {
    if (pdr && pdr.currentStep < 2) {
      console.log('🔧 Behaviors page - Updating PDR step from', pdr.currentStep, 'to 2');
      updatePDR({ currentStep: 2 }).catch(error => {
        console.error('Failed to update PDR step:', error);
      });
    }
  }, [pdr, updatePDR]);

  // Clean up duplicates on first load only and filter out Self Reflection and CodeFish 3D from the grid
  useEffect(() => {
    if (behaviors && behaviors.length > 0 && !hasCleanedDuplicates) {
      const valueIds = new Set();
      const duplicatesExist = behaviors.some(behavior => {
        if (valueIds.has(behavior.valueId)) {
          return true; // Found duplicate
        }
        valueIds.add(behavior.valueId);
        return false;
      });
      
      // Note: Informational values are now filtered in the form component
      
      if (duplicatesExist) {
        console.log('Duplicate behaviors detected, but cleanup disabled since deleteBehavior is not available');
        // Note: Duplicate cleanup is disabled because deleteBehavior function is not available
        // The form should handle duplicates gracefully
      }
      
      setHasCleanedDuplicates(true);
    }
  }, [behaviors, hasCleanedDuplicates, createBehavior]);

  const handleBulkCreateBehaviors = async (data: {
    behaviors: Array<{
      valueId: string;
      valueName: string;
      description: string;
    }>;
    selfReflection?: string | undefined;
    deepDiveDevelopment?: string | undefined;
  }) => {
    console.log('🔧 BULK CREATE - Starting database save for behaviors:', data.behaviors.length);
    
    try {
      // Save each behavior to the database using the API
      for (const behaviorData of data.behaviors) {
        if (behaviorData.description && behaviorData.description.trim()) {
          console.log('🔧 Creating behavior for value:', behaviorData.valueName);
          
          const behaviorFormData: BehaviorFormData = {
            valueId: behaviorData.valueId,
            description: behaviorData.description,
            examples: '',
            employeeSelfAssessment: '',
          };
          
          await createBehavior(behaviorFormData);
        }
      }
      
      console.log('✅ All behaviors saved to database successfully');
      
      // Save development data to localStorage (since there's no API endpoint for this yet)
      if (data.selfReflection || data.deepDiveDevelopment) {
        const developmentData = {
          selfReflection: data.selfReflection || '',
          deepDiveDevelopment: data.deepDiveDevelopment || '',
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`demo_development_${params.id}`, JSON.stringify(developmentData));
        console.log('✅ Development data saved to localStorage:', developmentData);
      }
      
      toast.success('Behaviors saved successfully!');
    } catch (error) {
      console.error('❌ Failed to save behaviors:', error);
      toast.error('Failed to save behaviors. Please try again.');
      throw error;
    }
  };

  const handleAutoSave = async (data: {
    behaviors: Array<{
      valueId: string;
      valueName: string;
      description: string;
    }>;
    selfReflection?: string | undefined;
    deepDiveDevelopment?: string | undefined;
  }) => {
    console.log('🔧 AUTO-SAVE - Starting database save for behaviors');
    
    try {
      // Save behaviors with any content to the database
      const behaviorsToSave = data.behaviors.filter(b => 
        (b.description && b.description.trim().length > 0)
      );
      
      if (behaviorsToSave.length > 0) {
        console.log('🔧 Auto-saving behaviors to database:', behaviorsToSave.length);
        
        for (const behaviorData of behaviorsToSave) {
          // Check if behavior already exists
          const existingBehavior = behaviors?.find(b => b.valueId === behaviorData.valueId);
          
          if (existingBehavior) {
            // Update existing behavior
            await updateBehavior({
              behaviorId: existingBehavior.id,
              updates: {
                description: behaviorData.description,
              }
            });
            console.log('🔧 Updated existing behavior for:', behaviorData.valueName);
          } else {
            // Create new behavior
            const behaviorFormData: BehaviorFormData = {
              valueId: behaviorData.valueId,
              description: behaviorData.description,
              examples: '',
              employeeSelfAssessment: '',
            };
            
            await createBehavior(behaviorFormData);
            console.log('🔧 Created new behavior for:', behaviorData.valueName);
          }
        }
        
        console.log('✅ Auto-save completed successfully');
      }
      
      // Auto-save development data to localStorage (since there's no API endpoint for this yet)
      if (data.selfReflection || data.deepDiveDevelopment) {
        const developmentData = {
          selfReflection: data.selfReflection || '',
          deepDiveDevelopment: data.deepDiveDevelopment || '',
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`demo_development_${params.id}`, JSON.stringify(developmentData));
        console.log('✅ Development data auto-saved');
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      // Don't show error toast for auto-save failures to avoid annoying the user
    }
  };

  const handleNext = async () => {
    // Force save all current form values before navigating
    console.log('🔧 Force saving all form data before navigation');
    
    try {
      // Call the form's forceSave method to ensure all data is saved
      if (formRef.current) {
        await formRef.current.forceSave();
        console.log('✅ Force save completed');
      }
      
      // Update PDR step to 3 (Review) when moving to next section
      if (pdr && pdr.currentStep < 3) {
        console.log('🔧 Updating PDR step from', pdr.currentStep, 'to 3 (Review)');
        await updatePDR({ currentStep: 3 });
        console.log('✅ PDR step updated to 3');
      }
      
      // Small delay to ensure localStorage is updated
      await new Promise(resolve => setTimeout(resolve, 200));
      
      router.push(`/pdr/${params.id}/review`);
    } catch (error) {
      console.error('Error during force save:', error);
      // Navigate anyway - auto-save should have captured most data
      router.push(`/pdr/${params.id}/review`);
    }
  };

  const handlePrevious = () => {
    router.push(`/pdr/${params.id}/goals`);
  };

  // Use form completion state instead of checking saved behaviors
  const completedValues = formCompletedCount;
  const totalValues = formTotalCount;
  const isAssessmentComplete = completedValues >= totalValues;

  // Callback to receive completion updates from the form
  const handleCompletionChange = useCallback((completed: number, total: number) => {
    console.log('📊 Form completion update:', completed, '/', total);
    setFormCompletedCount(completed);
    setFormTotalCount(total);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }
  
  // Temporarily remove debug logging
  // console.log('🔍 Completion Summary:', ...);

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <Toaster />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Heart className="h-7 w-7 mr-3 text-pink-500" />
            Company Values & Behaviors Assessment
          </h1>
          <p className="text-white mt-2">
            We encourage you to think about how you can contribute to the CodeFish Studio's Behaviours and Values during the review period.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handlePrevious} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Goals
          </Button>
          
          <Button 
            onClick={() => {
              console.log('🔧 Complete Assessment button clicked!');
              handleNext();
            }}
            disabled={!isAssessmentComplete}
            className={`flex items-center transition-all duration-300 ${
              isAssessmentComplete 
                ? 'bg-status-success hover:bg-status-success/90 text-black shadow-lg font-medium' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            title={!isAssessmentComplete ? `Complete all ${totalValues} required fields to continue (${completedValues}/${totalValues} done)` : 'Continue to review your PDR'}
          >
            {isAssessmentComplete ? 'Continue to Review' : `Complete Assessment (${completedValues}/${totalValues})`}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
      
      {/* Structured Behavior Assessment Form */}
      {companyValues && companyValues.length > 0 && (
        <>
          {/* Debug existing behaviors being passed to form */}
          {console.log('🔧 Behaviors page - passing to form:', {
            companyValuesCount: companyValues.length,
            behaviorsCount: behaviors?.length || 0,
            behaviorsData: behaviors
          })}
          <StructuredBehaviorForm
            ref={formRef}
            companyValues={companyValues}
            existingBehaviors={behaviors || []}
            onSubmit={handleBulkCreateBehaviors}
            onAutoSave={handleAutoSave}
            isReadOnly={!canEdit}
            onCompletionChange={handleCompletionChange}
          />
        </>
      )}
    </div>
  );
}