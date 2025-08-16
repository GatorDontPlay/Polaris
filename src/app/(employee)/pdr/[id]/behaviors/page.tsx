'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoPDR, useDemoBehaviors, useDemoCompanyValues } from '@/hooks/use-demo-pdr';
import { StructuredBehaviorForm } from '@/components/forms/structured-behavior-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BehaviorFormData } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

interface BehaviorsPageProps {
  params: { id: string };
}

export default function BehaviorsPage({ params }: BehaviorsPageProps) {
  const router = useRouter();
  const [hasCleanedDuplicates, setHasCleanedDuplicates] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading } = useDemoPDR(params.id);
  const { data: behaviors, isLoading: behaviorsLoading, addBehavior, updateBehavior, deleteBehavior } = useDemoBehaviors(params.id);
  const { data: companyValues, isLoading: valuesLoading } = useDemoCompanyValues();

  const isLoading = pdrLoading || behaviorsLoading || valuesLoading;
  const isReadOnly = pdr?.isLocked || false;
  const canEdit = pdr && !isReadOnly && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED' || pdr.status === 'Created');

  // Clean up duplicates on first load only
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
      
      if (duplicatesExist) {
        console.log('Cleaning up duplicate behaviors...');
        const uniqueBehaviors = new Map();
        
        // Keep only the latest behavior for each valueId
        behaviors.forEach(behavior => {
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

  const handleBulkCreateBehaviors = async (behaviorsData: Array<{
    valueId: string;
    valueName: string;
    description: string;
    examples: string;
    employeeSelfAssessment: string;
    employeeRating: number;
  }>) => {
    // Remove existing behaviors for values that are being updated
    const existingBehaviorIds = behaviors?.filter(b => 
      behaviorsData.some(newB => newB.valueId === b.valueId)
    ).map(b => b.id) || [];
    
    existingBehaviorIds.forEach(id => deleteBehavior(id));
    
    // Add all new behaviors
    behaviorsData.forEach(behaviorData => {
      const formData: BehaviorFormData = {
        valueId: behaviorData.valueId,
        description: behaviorData.description,
        examples: behaviorData.examples,
        employeeSelfAssessment: behaviorData.employeeSelfAssessment,
        employeeRating: behaviorData.employeeRating,
      };
      addBehavior(formData);
    });
  };

  const handleAutoSave = async (behaviorsData: Array<{
    valueId: string;
    valueName: string;
    description: string;
    examples: string;
    employeeSelfAssessment: string;
    employeeRating: number;
  }>) => {
    // Only save behaviors with meaningful content
    const behaviorsToSave = behaviorsData.filter(b => 
      (b.description && b.description.trim().length > 3) || 
      (b.examples && b.examples.trim().length > 3) || 
      (b.employeeSelfAssessment && b.employeeSelfAssessment.trim().length > 3) ||
      b.employeeRating > 0
    );
    
    if (behaviorsToSave.length > 0) {
      // For auto-save, we want to update existing or create new, not delete and recreate
      behaviorsToSave.forEach(behaviorData => {
        // Check if behavior already exists for this value
        const existingBehavior = behaviors?.find(b => b.valueId === behaviorData.valueId);
        
        if (existingBehavior) {
          // Update existing behavior
          updateBehavior(existingBehavior.id, {
            valueId: behaviorData.valueId,
            description: behaviorData.description,
            examples: behaviorData.examples,
            employeeSelfAssessment: behaviorData.employeeSelfAssessment,
            employeeRating: behaviorData.employeeRating,
          });
        } else {
          // Create new behavior only if it doesn't exist
          const formData: BehaviorFormData = {
            valueId: behaviorData.valueId,
            description: behaviorData.description,
            examples: behaviorData.examples,
            employeeSelfAssessment: behaviorData.employeeSelfAssessment,
            employeeRating: behaviorData.employeeRating,
          };
          addBehavior(formData);
        }
      });
    }
  };

  const handleNext = () => {
    router.push(`/pdr/${params.id}/review`);
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

  const isAssessmentComplete = behaviors && behaviors.length >= (companyValues?.length || 0);
  const completedValues = behaviors?.length || 0;
  const totalValues = companyValues?.length || 0;

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <Toaster />
      
      {/* Structured Behavior Assessment Form */}
      {companyValues && companyValues.length > 0 && (
        <StructuredBehaviorForm
          companyValues={companyValues}
          existingBehaviors={behaviors || []}
          onSubmit={handleBulkCreateBehaviors}
          onAutoSave={handleAutoSave}
          isReadOnly={!canEdit}
        />
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Goals
        </Button>
        
        <Button 
          onClick={handleNext}
          disabled={!isAssessmentComplete}
          className={`flex items-center transition-all duration-300 ${
            isAssessmentComplete 
              ? 'bg-status-success hover:bg-status-success/90 text-white shadow-lg' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          title={!isAssessmentComplete ? `Complete all ${totalValues} values to continue (${completedValues}/${totalValues} done)` : 'Continue to review your PDR'}
        >
          {isAssessmentComplete ? 'Continue to Review' : `Complete Assessment (${completedValues}/${totalValues})`}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}