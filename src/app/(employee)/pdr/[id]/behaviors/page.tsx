'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoPDR, useDemoBehaviors, useDemoCompanyValues } from '@/hooks/use-demo-pdr';
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
  
  const { data: pdr, isLoading: pdrLoading, updatePdr } = useDemoPDR(params.id);
  const { data: behaviors, isLoading: behaviorsLoading, addBehavior, updateBehavior, deleteBehavior } = useDemoBehaviors(params.id);
  const { data: companyValues, isLoading: valuesLoading } = useDemoCompanyValues();

  const isLoading = pdrLoading || behaviorsLoading || valuesLoading;
  const isReadOnly = pdr?.isLocked || false;
  const canEdit = pdr && !isReadOnly && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED' || pdr.status === 'Created');

  // Debug PDR permissions
  console.log('🔧 PDR Permissions Debug:', {
    pdr: pdr,
    pdrStatus: pdr?.status,
    isLocked: pdr?.isLocked,
    isReadOnly: isReadOnly,
    canEdit: canEdit,
    isFormReadOnly: !canEdit
  });

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
      
      // Filter out Self Reflection and CodeFish 3D from the grid
      // These IDs correspond to the informational-only values that should only appear in the dedicated section
      const informationalValueIds = [
        '550e8400-e29b-41d4-a716-446655440005', // Self Reflection
        '550e8400-e29b-41d4-a716-446655440006'  // CodeFish 3D
      ];
      
      if (duplicatesExist) {
        console.log('Cleaning up duplicate behaviors...');
        const uniqueBehaviors = new Map();
        
        // Keep only the latest behavior for each valueId, excluding informational values from the grid
        behaviors.forEach(behavior => {
          // Skip informational values - they'll be handled in the dedicated section
          if (informationalValueIds.includes(behavior.valueId)) {
            return;
          }
          
          const existing = uniqueBehaviors.get(behavior.valueId);
          if (!existing || new Date(behavior.updatedAt) > new Date(existing.updatedAt)) {
            uniqueBehaviors.set(behavior.valueId, behavior);
          }
        });
        
        const cleanedBehaviors = Array.from(uniqueBehaviors.values());
        
        // Clear all behaviors and add back only the unique ones
        behaviors.forEach(b => deleteBehavior(b.id));
        setTimeout(() => {
          cleanedBehaviors.forEach(b => {
            const formData: BehaviorFormData = {
              valueId: b.valueId,
              description: b.description,
              examples: b.examples || '',
              employeeSelfAssessment: b.employeeSelfAssessment || '',
              employeeRating: b.employeeRating || undefined,
            };
            addBehavior(formData);
          });
        }, 100); // Small delay to ensure cleanup completes
      }
      
      setHasCleanedDuplicates(true);
    }
  }, [behaviors, hasCleanedDuplicates, deleteBehavior, addBehavior]);

  const handleBulkCreateBehaviors = async (data: {
    behaviors: Array<{
      valueId: string;
      valueName: string;
      description: string;
    }>;
    selfReflection?: string;
    deepDiveDevelopment?: string;
  }) => {
    // BATCH CREATE: Build complete behaviors array and save once
    const currentBehaviors = behaviors || [];
    let updatedBehaviors = [...currentBehaviors];
    
    data.behaviors.forEach(behaviorData => {
      const existingIndex = updatedBehaviors.findIndex(b => b.valueId === behaviorData.valueId);
      
      if (existingIndex !== -1) {
        // Update existing behavior
        updatedBehaviors[existingIndex] = {
          ...updatedBehaviors[existingIndex],
          description: behaviorData.description,
          updatedAt: new Date(),
        };
      } else {
        // Add new behavior
        const newBehavior = {
          id: `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12)}`,
          pdrId: params.id,
          valueId: behaviorData.valueId,
          description: behaviorData.description,
          examples: '',
          employeeSelfAssessment: '',
          employeeRating: null,
          ceoComments: null,
          ceoRating: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        updatedBehaviors.push(newBehavior);
      }
    });
    
    // Single localStorage write for all behaviors
    localStorage.setItem(`demo_behaviors_${params.id}`, JSON.stringify(updatedBehaviors));
    console.log('🔧 BULK CREATE - Saved all behaviors to localStorage:', updatedBehaviors.length);
    
    // Save selfReflection and deepDiveDevelopment to localStorage as part of PDR data
    if (data.selfReflection || data.deepDiveDevelopment) {
      const developmentData = {
        selfReflection: data.selfReflection || '',
        deepDiveDevelopment: data.deepDiveDevelopment || '',
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`demo_development_${params.id}`, JSON.stringify(developmentData));
      console.log('Saved development data:', developmentData);
    }
  };

  const handleAutoSave = async (data: {
    behaviors: Array<{
      valueId: string;
      valueName: string;
      description: string;
    }>;
    selfReflection?: string;
    deepDiveDevelopment?: string;
  }) => {
    // Debug: Log what data is being auto-saved
    console.log('🔧 SIMPLE DEBUG - Auto-save called with data:', {
      pdrId: params.id,
      localStorageKey: `demo_behaviors_${params.id}`,
      allBehaviors: data.behaviors,
      behaviorsWithAnyContent: data.behaviors.filter(b => (b.description && b.description.trim().length > 0))
    });
    
    // Save behaviors with any content (even short descriptions)
    const behaviorsToSave = data.behaviors.filter(b => 
      (b.description && b.description.trim().length > 0)
    );
    
    if (behaviorsToSave.length > 0) {
      // BATCH SAVE: Build the complete behaviors array and save once
      const currentBehaviors = behaviors || [];
      let updatedBehaviors = [...currentBehaviors];
      
      behaviorsToSave.forEach(behaviorData => {
        const existingIndex = updatedBehaviors.findIndex(b => b.valueId === behaviorData.valueId);
        
        if (existingIndex !== -1) {
          // Update existing behavior
          updatedBehaviors[existingIndex] = {
            ...updatedBehaviors[existingIndex],
            description: behaviorData.description,
            updatedAt: new Date(),
          };
        } else {
          // Add new behavior
          const newBehavior = {
            id: `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12)}`,
            pdrId: params.id,
            valueId: behaviorData.valueId,
            description: behaviorData.description,
            examples: '',
            employeeSelfAssessment: '',
            employeeRating: null,
            ceoComments: null,
            ceoRating: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          updatedBehaviors.push(newBehavior);
        }
      });
      
      // Single localStorage write for all behaviors
      localStorage.setItem(`demo_behaviors_${params.id}`, JSON.stringify(updatedBehaviors));
      console.log('🔧 BATCH SAVED all behaviors to localStorage:', updatedBehaviors.length);
    }
    
    // Debug: Check what's actually in localStorage after save
    setTimeout(() => {
      const stored = localStorage.getItem(`demo_behaviors_${params.id}`);
      console.log('🔧 SIMPLE DEBUG - After auto-save, localStorage contains:', {
        key: `demo_behaviors_${params.id}`,
        rawData: stored,
        parsedData: stored ? JSON.parse(stored) : null
      });
    }, 100);
    
    // Auto-save selfReflection and deepDiveDevelopment
    if (data.selfReflection || data.deepDiveDevelopment) {
      const developmentData = {
        selfReflection: data.selfReflection || '',
        deepDiveDevelopment: data.deepDiveDevelopment || '',
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`demo_development_${params.id}`, JSON.stringify(developmentData));
      console.log('Auto-saving development data:', developmentData);
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
      
      // Update PDR status to mark behaviors step as completed
      if (pdr) {
        console.log('🔧 Current PDR step before update:', pdr.currentStep);
        
        // IMPORTANT: Always update to step 3 (Review) when moving from behaviors to review
        // This ensures the stepper indicator shows behaviors as completed
        await updatePdr({
          currentStep: 3, // Move to step 3 (Review)
        });
        console.log('✅ Updated PDR step to 3 (Review)');
        
        // Verify the update was applied by re-fetching the PDR
        const updatedPdr = localStorage.getItem(`demo_pdr_${params.id}`);
        if (updatedPdr) {
          const parsedPdr = JSON.parse(updatedPdr);
          console.log('🔧 Updated PDR step verification:', parsedPdr.currentStep);
        }
        
        // Trigger an event to ensure UI updates
        window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
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