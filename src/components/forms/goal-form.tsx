'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSchema } from '@/lib/validations';
import { Goal, GoalFormData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Save, X, Edit2, Plus } from 'lucide-react';
import { useState } from 'react';

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: GoalFormData) => Promise<void>;
  onDelete?: (goalId: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
}

const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800', 
  LOW: 'bg-green-100 text-green-800',
};

export function GoalForm({ 
  goal, 
  onSubmit, 
  onDelete, 
  onCancel,
  isSubmitting = false,
  isReadOnly = false 
}: GoalFormProps) {
  const [isEditing, setIsEditing] = useState(!goal);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal ? {
      title: goal.title,
      description: goal.description || '',
      targetOutcome: goal.targetOutcome || '',
      successCriteria: goal.successCriteria || '',
      priority: goal.priority,
    } : {
      title: '',
      description: '',
      targetOutcome: '',
      successCriteria: '',
      priority: 'MEDIUM',
    },
  });

  const priority = watch('priority');

  const handleFormSubmit = async (data: GoalFormData) => {
    try {
      await onSubmit(data);
      if (!goal) {
        reset(); // Reset form for new goals
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (!goal) {
      onCancel?.();
    } else {
      reset(); // Reset to original values
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (goal && onDelete) {
      try {
        await onDelete(goal.id);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Failed to delete goal:', error);
      }
    }
  };

  // Read-only view
  if (goal && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={PRIORITY_COLORS[goal.priority]}>
                  {goal.priority}
                </Badge>
              </div>
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
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goal.description && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <p className="text-gray-700">{goal.description}</p>
            </div>
          )}
          {goal.targetOutcome && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Target Outcome</h4>
              <p className="text-gray-700">{goal.targetOutcome}</p>
            </div>
          )}
          {goal.successCriteria && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Success Criteria</h4>
              <p className="text-gray-700">{goal.successCriteria}</p>
            </div>
          )}
        </CardContent>
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Delete Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete "{goal.title}"? This action cannot be undone.
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
          {goal ? (
            <>
              <Edit2 className="h-5 w-5 mr-2" />
              Edit Goal
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              Add New Goal
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Goal Title *
            </label>
            <input
              id="title"
              type="text"
              {...register('title')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter a clear, specific goal title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              {...register('priority')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <div className="mt-1">
              <Badge className={PRIORITY_COLORS[priority]}>
                {priority}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide context and details about this goal"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Target Outcome */}
          <div>
            <label htmlFor="targetOutcome" className="block text-sm font-medium text-gray-700 mb-1">
              Target Outcome
            </label>
            <textarea
              id="targetOutcome"
              {...register('targetOutcome')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What specific outcome are you aiming to achieve?"
            />
            {errors.targetOutcome && (
              <p className="mt-1 text-sm text-red-600">{errors.targetOutcome.message}</p>
            )}
          </div>

          {/* Success Criteria */}
          <div>
            <label htmlFor="successCriteria" className="block text-sm font-medium text-gray-700 mb-1">
              Success Criteria
            </label>
            <textarea
              id="successCriteria"
              {...register('successCriteria')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="How will you measure success? What are the key metrics?"
            />
            {errors.successCriteria && (
              <p className="mt-1 text-sm text-red-600">{errors.successCriteria.message}</p>
            )}
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
              {isSubmitting ? 'Saving...' : goal ? 'Update Goal' : 'Add Goal'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
