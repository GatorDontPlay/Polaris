'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { behaviorSchema } from '@/lib/validations';
import { Behavior, BehaviorFormData, CompanyValue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RatingInput } from '@/components/pdr/rating-input';
import { Trash2, Save, X, Edit2, Plus, Star } from 'lucide-react';
import { useState } from 'react';

interface BehaviorFormProps {
  behavior?: Behavior;
  companyValues: CompanyValue[];
  onSubmit: (data: BehaviorFormData) => Promise<void>;
  onDelete?: (behaviorId: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
}

export function BehaviorForm({ 
  behavior, 
  companyValues,
  onSubmit, 
  onDelete, 
  onCancel,
  isSubmitting = false,
  isReadOnly = false 
}: BehaviorFormProps) {
  const [isEditing, setIsEditing] = useState(!behavior);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<BehaviorFormData>({
    resolver: zodResolver(behaviorSchema),
    defaultValues: behavior ? {
      valueId: behavior.valueId,
      description: behavior.description,
      examples: behavior.examples || '',
      employeeSelfAssessment: behavior.employeeSelfAssessment || '',
      employeeRating: behavior.employeeRating || undefined,
    } : {
      valueId: '',
      description: '',
      examples: '',
      employeeSelfAssessment: '',
      employeeRating: undefined,
    },
  });

  const selectedValueId = watch('valueId');
  const employeeRating = watch('employeeRating');
  
  const selectedValue = companyValues.find(v => v.id === selectedValueId);

  const handleFormSubmit = async (data: BehaviorFormData) => {
    try {
      await onSubmit(data);
      if (!behavior) {
        reset(); // Reset form for new behaviors
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save behavior:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (!behavior) {
      onCancel?.();
    } else {
      reset(); // Reset to original values
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (behavior && onDelete) {
      try {
        await onDelete(behavior.id);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Failed to delete behavior:', error);
      }
    }
  };

  const handleRatingChange = (rating: number) => {
    setValue('employeeRating', rating, { shouldDirty: true });
  };

  // Read-only view
  if (behavior && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center">
                <div className="w-3 h-3 rounded-full bg-activity-behavior mr-3"></div>
                {behavior.value?.name || 'Unknown Value'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {behavior.value?.description}
              </p>
              {behavior.employeeRating && (
                <div className="flex items-center mt-2">
                  <RatingInput
                    value={behavior.employeeRating}
                    onChange={() => {}}
                    disabled
                    size="sm"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Self-rated: {behavior.employeeRating}/5
                  </span>
                </div>
              )}
            </div>
            {!isReadOnly && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-status-error hover:text-status-error/80"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">How I Can Meet The Values</h4>
            <p className="text-muted-foreground">{behavior.description}</p>
          </div>
          
          {behavior.examples && (
            <div>
              <h4 className="font-medium text-foreground mb-2">Specific Examples</h4>
              <p className="text-muted-foreground">{behavior.examples}</p>
            </div>
          )}
          
          {behavior.employeeSelfAssessment && (
            <div>
              <h4 className="font-medium text-foreground mb-2">Self-Assessment</h4>
              <p className="text-muted-foreground">{behavior.employeeSelfAssessment}</p>
            </div>
          )}

          {behavior.ceoComments && (
            <div className="bg-status-info/10 border border-status-info/20 p-4 rounded-lg">
              <h4 className="font-medium text-status-info mb-2">Manager Feedback</h4>
              <p className="text-status-info/80">{behavior.ceoComments}</p>
              {behavior.ceoRating && (
                <div className="mt-2 flex items-center">
                  <RatingInput
                    value={behavior.ceoRating}
                    onChange={() => {}}
                    disabled
                    size="sm"
                  />
                  <span className="ml-2 text-sm text-status-info/80">
                    Manager rating: {behavior.ceoRating}/5
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-status-error">Delete Behavior</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Are you sure you want to delete the behavior for "{behavior.value?.name}"? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Card>
    );
  }

  // Form view (editing or creating)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {behavior ? (
            <>
              <Edit2 className="h-5 w-5 mr-2" />
              Edit Behavior Assessment
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              Add Behavior Assessment
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Company Value Selection */}
          <div>
            <label htmlFor="valueId" className="block text-sm font-medium text-foreground mb-1">
              Company Value *
            </label>
            <select
              id="valueId"
              {...register('valueId')}
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="">Select a company value...</option>
              {companyValues.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.name}
                </option>
              ))}
            </select>
            {errors.valueId && (
              <p className="mt-1 text-sm text-status-error">{errors.valueId.message}</p>
            )}
            
            {selectedValue && (
              <div className="mt-2 p-3 bg-status-info/10 border border-status-info/20 rounded-md">
                <p className="text-sm text-status-info">
                  <strong>{selectedValue.name}:</strong> {selectedValue.description}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              How I Can Meet The Values *
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="Describe how you can consistently meet this company value in your work and interactions..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-status-error">{errors.description.message}</p>
            )}
          </div>

          {/* Examples */}
          <div>
            <label htmlFor="examples" className="block text-sm font-medium text-foreground mb-1">
              Specific Examples
            </label>
            <textarea
              id="examples"
              {...register('examples')}
              rows={3}
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="Provide specific examples, situations, or projects where you can meet this value..."
            />
            {errors.examples && (
              <p className="mt-1 text-sm text-status-error">{errors.examples.message}</p>
            )}
          </div>

          {/* Self-Assessment */}
          <div>
            <label htmlFor="employeeSelfAssessment" className="block text-sm font-medium text-foreground mb-1">
              Self-Assessment
            </label>
            <textarea
              id="employeeSelfAssessment"
              {...register('employeeSelfAssessment')}
              rows={3}
              className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="Reflect on your strengths and areas for improvement related to this value..."
            />
            {errors.employeeSelfAssessment && (
              <p className="mt-1 text-sm text-status-error">{errors.employeeSelfAssessment.message}</p>
            )}
          </div>

          {/* Self-Rating */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Self-Rating
            </label>
            <div className="flex items-center space-x-4">
              <RatingInput
                value={employeeRating}
                onChange={handleRatingChange}
                showLabel
              />
              {employeeRating && (
                <Badge variant="outline">
                  {employeeRating}/5
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Rate how well you feel you can meet these values (1 = Needs Improvement, 5 = Exceeds Expectations)
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : behavior ? 'Update Assessment' : 'Add Assessment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
