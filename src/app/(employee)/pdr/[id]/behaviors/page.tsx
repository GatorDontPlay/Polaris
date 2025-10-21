'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import { useSupabasePDR, useSupabasePDRBehaviors, useSupabasePDRUpdate } from '@/hooks/use-supabase-pdrs';
import { usePDRPermissions } from '@/hooks/use-pdr-permissions';
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
  
  const { data: pdr, isLoading: pdrLoading } = useSupabasePDR(params.id);
  const { 
    data: behaviors, 
    isLoading: behaviorsLoading,
    createBehavior,
    updateBehavior
  } = useSupabasePDRBehaviors(params.id);
  const { data: companyValues, isLoading: companyValuesLoading, error: companyValuesError } = useCompanyValues();
  const { updatePDR } = useSupabasePDRUpdate(params.id);
  const { permissions, isEditable } = usePDRPermissions({ pdr });

  const isLoading = pdrLoading || behaviorsLoading || companyValuesLoading;
  const canEdit = isEditable;

  // Debug loading states and data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [PAGE] Behaviors Page Debug:', {
      pdrLoading,
      behaviorsLoading,
      companyValuesLoading,
      companyValuesError,
      isLoading,
      behaviorsCount: behaviors?.length,
      companyValuesCount: companyValues?.length,
    });
  }

  // Update PDR step to 2 (Behaviors) when user reaches this page - only if PDR is editable
  useEffect(() => {
    if (pdr && pdr.currentStep < 2 && isEditable) {
      updatePDR({ currentStep: 2 }).catch(error => {
        console.error('Failed to update PDR step:', error);
      });
    }
  }, [pdr, updatePDR, isEditable]);

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
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 BULK CREATE - Starting database save for behaviors:', data.behaviors.length);
    }
    
    try {
      // Save each behavior to the database using the API
      for (const behaviorData of data.behaviors) {
        if (behaviorData.description && behaviorData.description.trim()) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Creating behavior for value:', behaviorData.valueName);
          }
          
          const behaviorFormData: BehaviorFormData = {
            valueId: behaviorData.valueId,
            description: behaviorData.description,
            examples: '',
            employeeSelfAssessment: '',
          };
          
          await createBehavior(behaviorFormData);
        }
      }
      
      // Save development data to database
      if (data.selfReflection || data.deepDiveDevelopment) {
        const developmentData = {
          selfReflection: data.selfReflection || '',
          deepDiveDevelopment: data.deepDiveDevelopment || '',
          updatedAt: new Date().toISOString()
        };
        
        // Save to database via PDR PATCH API
        try {
          const response = await fetch(`/api/pdrs/${params.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              employeeFields: {
                developmentFields: developmentData
              }
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to save development data: ${response.status}`);
          }
        } catch (error) {
          console.error('❌ Failed to save development data to database:', error);
          // All data is saved to database only
        }
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
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 AUTO-SAVE - Starting database save for behaviors');
    }
    
    try {
      // Save behaviors with any content to the database
      const behaviorsToSave = data.behaviors.filter(b => 
        (b.description && b.description.trim().length > 0)
      );
      
      if (behaviorsToSave.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Auto-saving behaviors to database:', behaviorsToSave.length);
        }
        
        for (const behaviorData of behaviorsToSave) {
          // Check if behavior already exists in our local data
          const existingBehavior = behaviors?.find(b => b.valueId === behaviorData.valueId);
          
          if (existingBehavior) {
            // Only update if description has actually changed
            if (existingBehavior.description !== behaviorData.description) {
              try {
                await updateBehavior({
                  behaviorId: existingBehavior.id,
                  updates: {
                    description: behaviorData.description,
                  }
                });
              } catch (updateError) {
                console.error('⚠️ Update failed for:', behaviorData.valueName, updateError);
              }
            }
          } else {
            // Create new behavior - API is now idempotent, so it will return existing if it already exists
            const behaviorFormData: BehaviorFormData = {
              valueId: behaviorData.valueId,
              description: behaviorData.description,
              examples: '',
              employeeSelfAssessment: '',
            };
            
            try {
              await createBehavior(behaviorFormData);
            } catch (createError) {
              // This shouldn't fail now that API is idempotent, but log if it does
              console.error('⚠️ Create failed for:', behaviorData.valueName, createError);
            }
          }
        }
      }
      
      // Auto-save development data to database
      if (data.selfReflection || data.deepDiveDevelopment) {
        const developmentData = {
          selfReflection: data.selfReflection || '',
          deepDiveDevelopment: data.deepDiveDevelopment || '',
          updatedAt: new Date().toISOString()
        };
        
        // Save to database via PDR PATCH API
        try {
          const response = await fetch(`/api/pdrs/${params.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              employeeFields: {
                developmentFields: developmentData
              }
            }),
          });
          
        } catch (error) {
          // Silent failure for auto-save
        }
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      // Don't show error toast for auto-save failures to avoid annoying the user
    }
  };

  const handleNext = async () => {
    // Force save all current form values before navigating
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Force saving all form data before navigation');
    }
    
    let saveSuccessful = true;
    
    try {
      // Call the form's forceSave method to ensure all data is saved
      if (formRef.current) {
        await formRef.current.forceSave();
      }
    } catch (saveError) {
      console.error('⚠️ Non-critical error during force save:', saveError);
      // Don't block navigation for save errors - auto-save has been running
      saveSuccessful = false;
    }
    
    try {
      // Update PDR step to 3 (Review) when moving to next section
      if (pdr && pdr.currentStep < 3 && isEditable) {
        await updatePDR({ currentStep: 3 });
      }
    } catch (stepError) {
      console.error('⚠️ Error updating PDR step:', stepError);
      // Continue navigation even if step update fails
    }
    
    // Show informative toast if save had issues
    if (!saveSuccessful) {
      toast.success('Navigating to review page. Most recent data saved via auto-save.', {
        duration: 3000,
      });
    }
    
    // Small delay to ensure database is fully synced
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Always navigate - don't block user
    router.push(`/pdr/${params.id}/review`);
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
    setFormCompletedCount(completed);
    setFormTotalCount(total);
  }, []);

  // Extract development fields from PDR data (stored in employeeFields.developmentFields)
  const existingDevelopmentFields = useMemo(() => {
    if (!pdr?.employeeFields) {
      return { selfReflection: '', deepDiveDevelopment: '' };
    }
    
    const devFields = (pdr.employeeFields as any).developmentFields;
    if (!devFields) {
      return { selfReflection: '', deepDiveDevelopment: '' };
    }
    
    return {
      selfReflection: devFields.selfReflection || '',
      deepDiveDevelopment: devFields.deepDiveDevelopment || '',
    };
  }, [pdr]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="text-sm text-muted-foreground mt-4">
          Loading company values... ({companyValuesLoading ? 'fetching' : 'done'})
        </div>
      </div>
    );
  }

  // Error state for company values
  if (companyValuesError) {
    return (
      <div className="space-y-6">
        <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-status-error mb-2">Error Loading Company Values</h2>
          <p className="text-foreground mb-4">
            Unable to load company values. Please check the browser console for details.
          </p>
          <p className="text-sm text-muted-foreground">
            Error: {companyValuesError instanceof Error ? companyValuesError.message : 'Unknown error'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // No company values state
  if (!companyValues || companyValues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-500 mb-2">No Company Values Found</h2>
          <p className="text-foreground mb-4">
            No active company values were found in the database. Please contact your administrator.
          </p>
          <div className="text-sm text-muted-foreground bg-background/50 p-4 rounded mt-4">
            <p className="font-mono">Debug Info:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Loading: {companyValuesLoading ? 'Yes' : 'No'}</li>
              <li>Data exists: {companyValues ? 'Yes' : 'No'}</li>
              <li>Is Array: {Array.isArray(companyValues) ? 'Yes' : 'No'}</li>
              <li>Length: {companyValues?.length || 0}</li>
            </ul>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Reload Page
          </Button>
        </div>
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
            onClick={handleNext}
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
          <StructuredBehaviorForm
            ref={formRef}
            companyValues={companyValues}
            existingBehaviors={behaviors || []}
            existingDevelopmentFields={existingDevelopmentFields}
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