'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSchema } from '@/lib/validations';
import { Goal, GoalFormData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Save, X, Edit2, Plus, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { formatFYForDisplay } from '@/lib/financial-year';

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: GoalFormData) => Promise<void>;
  onDelete?: (goalId: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
  existingGoals?: Goal[]; // For weighting validation
  fyLabel?: string; // Financial year label for display
}

// Priority colors are no longer used - replaced with weighting

export function GoalForm({ 
  goal, 
  onSubmit, 
  onDelete, 
  onCancel,
  isSubmitting = false,
  isReadOnly = false,
  existingGoals = [],
  fyLabel
}: GoalFormProps) {
  const [isEditing, setIsEditing] = useState(!goal);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

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
      goalMapping: goal.goalMapping,
      priority: goal.priority,
      weighting: goal.weighting || 0,
    } : {
      title: '',
      description: '',
      targetOutcome: '',
      successCriteria: '',
      goalMapping: '' as any, // Will trigger validation if not selected
      priority: 'MEDIUM',
      weighting: 0,
    },
  });

  const priority = watch('priority');
  const weighting = watch('weighting');
  
  // Calculate total weighting excluding current goal
  const calculateTotalWeighting = () => {
    const otherGoals = existingGoals.filter(g => g.id !== goal?.id);
    return otherGoals.reduce((sum, g) => sum + (g.weighting || 0), 0);
  };
  
  const totalWeighting = calculateTotalWeighting() + (weighting || 0);
  const remainingWeighting = 100 - calculateTotalWeighting();
  const isOverWeight = totalWeighting > 100;

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

  // Compact read-only view
  if (goal && !isEditing) {
    const truncateText = (text: string, maxLength: number = 80) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '...';
    };

    const getGoalMappingLabel = (mapping: string) => {
      switch (mapping) {
        case 'PEOPLE_CULTURE': return 'People & Culture';
        case 'VALUE_DRIVEN_INNOVATION': return 'Value-Driven Innovation';
        case 'OPERATING_EFFICIENCY': return 'Operating Efficiency';
        case 'CUSTOMER_EXPERIENCE': return 'Customer Experience';
        default: return mapping;
      }
    };

    return (
      <>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-border/50 hover:border-border relative"
          onClick={() => setShowFullDetails(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base text-foreground truncate pr-2">{goal.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                    {goal.weighting || 0}%
                  </Badge>
                  {goal.goalMapping && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                      {getGoalMappingLabel(goal.goalMapping)}
                    </Badge>
                  )}
                </div>
              </div>
              {!isReadOnly && (
                <div className="flex items-center space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {goal.description && (
              <div className="mb-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Description: </span>
                  {truncateText(goal.description)}
                </p>
              </div>
            )}
            
            {goal.targetOutcome && (
              <div className="mb-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Target: </span>
                  {truncateText(goal.targetOutcome)}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground">
                Click to view full details
              </div>
              {/* FY Label - Bottom right display */}
              {fyLabel && (
                <span className="text-xs text-muted-foreground/60 font-mono">
                  {formatFYForDisplay(fyLabel)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Full Details Modal */}
        {showFullDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto relative">
              <CardHeader>
                {/* FY Label in modal */}
                {fyLabel && (
                  <div className="absolute top-4 right-4">
                    <span className="text-xs text-muted-foreground/60 font-mono bg-muted/30 px-2 py-1 rounded">
                      {formatFYForDisplay(fyLabel)}
                    </span>
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-16">
                    <CardTitle className="text-xl">{goal.title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {goal.weighting || 0}%
                      </Badge>
                      {goal.goalMapping && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {getGoalMappingLabel(goal.goalMapping)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullDetails(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {goal.description && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 text-base">Description</h4>
                    <p className="text-foreground/90 leading-relaxed">{goal.description}</p>
                  </div>
                )}
                {goal.targetOutcome && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 text-base">Target Outcome</h4>
                    <p className="text-foreground/90 leading-relaxed">{goal.targetOutcome}</p>
                  </div>
                )}
                {goal.successCriteria && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 text-base">Success Criteria</h4>
                    <p className="text-foreground/90 leading-relaxed">{goal.successCriteria}</p>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  {!isReadOnly && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowFullDetails(false);
                        handleEdit();
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Goal
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowFullDetails(false)}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
      </>
    );
  }

  // Form view (editing or creating)
  return (
    <Card className={goal ? "col-span-full max-w-4xl mx-auto" : ""}>
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
          {/* Title, Weighting, and Goal Mapping Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Title - Takes 2/5 width on desktop */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="title" className="block text-sm font-semibold text-foreground">
                  Goal Title *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Goal Title</h4>
                      <p className="text-sm text-muted-foreground">
                        This is the short name of what you are going to try to achieve. Keep it clear and specific.
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Examples:</strong></p>
                        <p>• "Deliver ISO 27001 Accreditation"</p>
                        <p>• "Setup 10 Boiler Plates"</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <input
                id="title"
                type="text"
                maxLength={50}
                {...register('title')}
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground transition-colors"
                placeholder="Enter a clear, specific goal title"
              />
              <div className="flex justify-between mt-1">
                <div>
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {watch('title')?.length || 0}/50
                </p>
              </div>
            </div>

            {/* Weighting - Takes 1/5 width on desktop */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="weighting" className="block text-sm font-semibold text-foreground">
                  Weighting *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Goal Weighting</h4>
                      <p className="text-sm text-muted-foreground">
                        This determines how heavily this goal will weigh against your overall performance score. All goals in your PDR must total exactly 100.
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Examples:</strong></p>
                        <p>• 1 goal only = 100</p>
                        <p>• 2 goals = 60 + 40 = 100</p>
                        <p>• 3 goals = 50 + 30 + 20 = 100</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <input
                id="weighting"
                type="number"
                min="0"
                max="100"
                step="1"
                {...register('weighting', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground transition-colors"
                placeholder="0-100"
              />
              <div className="mt-1">
                {errors.weighting && (
                  <p className="text-sm text-destructive">{errors.weighting.message}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  <div>Total: {totalWeighting}/100</div>
                  {isOverWeight && (
                    <p className="text-destructive">⚠️ Over 100</p>
                  )}
                </div>
              </div>
            </div>

            {/* Goal Mapping - Takes 2/5 width on desktop */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="goalMapping" className="block text-sm font-semibold text-foreground">
                  Goal Mapping *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Goal Mapping</h4>
                      <p className="text-sm text-muted-foreground">
                        Map your goal/objective to your view of best fit to one of the company goals/pillars. This helps align your personal objectives with organizational priorities.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <select
                id="goalMapping"
                {...register('goalMapping')}
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              >
                <option value="">Select goal mapping...</option>
                <option value="PEOPLE_CULTURE">People & Culture</option>
                <option value="VALUE_DRIVEN_INNOVATION">Value-Driven Innovation</option>
                <option value="OPERATING_EFFICIENCY">Operating Efficiency</option>
                <option value="CUSTOMER_EXPERIENCE">Customer Experience</option>
              </select>
              {errors.goalMapping && (
                <p className="mt-1 text-sm text-destructive">{errors.goalMapping.message}</p>
              )}
            </div>
          </div>

          {/* Description and Target Outcome Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="description" className="block text-sm font-semibold text-foreground">
                  Description
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Goal Description</h4>
                      <p className="text-sm text-muted-foreground">
                        Describe the goal/objective that you are aiming to achieve. Provide context and details about what you want to accomplish.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground transition-colors resize-none"
                placeholder="Describe the goal/objective you are aiming to achieve"
              />
              <div className="flex justify-between mt-1">
                <div>
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {watch('description')?.length || 0}/500
                </p>
              </div>
            </div>

            {/* Target Outcome */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="targetOutcome" className="block text-sm font-semibold text-foreground">
                  Target Outcome
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Target Outcome</h4>
                      <p className="text-sm text-muted-foreground">
                        Describe individual outcomes you expected to see from performing and achieving this goal/objective.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <textarea
                id="targetOutcome"
                {...register('targetOutcome')}
                rows={4}
                maxLength={250}
                className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground transition-colors resize-none"
                placeholder="Describe expected outcomes from achieving this goal"
              />
              <div className="flex justify-between mt-1">
                <div>
                  {errors.targetOutcome && (
                    <p className="text-sm text-destructive">{errors.targetOutcome.message}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {watch('targetOutcome')?.length || 0}/250
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-border/50 mt-4">
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
