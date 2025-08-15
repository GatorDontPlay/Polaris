'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoPDR, useDemoGoals } from '@/hooks/use-demo-pdr';
import { GoalForm } from '@/components/forms/goal-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowRight, Target, CheckCircle } from 'lucide-react';
import { GoalFormData } from '@/types';

interface GoalsPageProps {
  params: { id: string };
}

export default function GoalsPage({ params }: GoalsPageProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading } = useDemoPDR(params.id);
  const { data: goals, isLoading: goalsLoading, addGoal, updateGoal, deleteGoal } = useDemoGoals(params.id);

  const isLoading = pdrLoading || goalsLoading;
  const isReadOnly = pdr?.isLocked || false;
  const canEdit = pdr && !isReadOnly && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED' || pdr.status === 'Created');

  console.log('Goals page debug:', {
    pdr: pdr,
    isLoading,
    isReadOnly,
    canEdit,
    pdrStatus: pdr?.status,
    pdrLocked: pdr?.isLocked,
    goalsCount: goals?.length
  });

  const handleCreateGoal = async (data: GoalFormData) => {
    try {
      setIsSubmitting(true);
      console.log('Creating goal with data:', data);
      addGoal(data);
      setShowAddForm(false);
      console.log('Goal created successfully');
    } catch (error) {
      console.error('Failed to create goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGoal = async (goalId: string, data: GoalFormData) => {
    try {
      setIsSubmitting(true);
      updateGoal(goalId, data);
    } catch (error) {
      console.error('Failed to update goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      setIsSubmitting(true);
      deleteGoal(goalId);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    router.push(`/pdr/${params.id}/behaviors`);
  };

  const handleAddGoal = () => {
    setShowAddForm(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Target className="h-6 w-6 mr-2 text-blue-600" />
            Goals & Objectives
          </h1>
          <p className="text-gray-600 mt-1">
            Define what you want to achieve this review period
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center">
            {goals?.length || 0} goals
          </Badge>
          {canEdit && (
            <Button onClick={handleAddGoal} disabled={showAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          )}
        </div>
      </div>

      {/* Instructions */}
      {(!goals || goals.length === 0) && !showAddForm && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Set Your Goals
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Start by defining your key objectives for this review period. 
              Focus on specific, measurable outcomes that align with your role and company objectives.
            </p>
            {canEdit && (
              <Button onClick={handleAddGoal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Goal Form */}
      {showAddForm && (
        <GoalForm
          onSubmit={handleCreateGoal}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Goals List */}
      {goals && goals.length > 0 && (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalForm
              key={goal.id}
              goal={goal}
              onSubmit={(data) => handleUpdateGoal(goal.id, data)}
              {...(canEdit && { onDelete: () => handleDeleteGoal(goal.id) })}
              isSubmitting={isSubmitting}
              isReadOnly={!canEdit}
            />
          ))}
          
          {/* Add Another Goal Button */}
          {canEdit && !showAddForm && (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="text-center py-8">
                <Button onClick={handleAddGoal} variant="outline" size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Completion Summary */}
      {goals && goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Goals Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{goals.length}</div>
                <div className="text-sm text-gray-600">Total Goals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {goals.filter(g => g.priority === 'HIGH').length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {goals.filter(g => g.employeeRating && g.employeeRating >= 4).length}
                </div>
                <div className="text-sm text-gray-600">Self-Rated 4+</div>
              </div>
            </div>
            
            {goals.length > 0 && canEdit && (
              <div className="mt-6 text-center">
                <p className="text-gray-600 mb-4">
                  Great! You've defined {goals.length} goal{goals.length !== 1 ? 's' : ''}. 
                  Next, let's assess how you demonstrate our company values.
                </p>
                <Button onClick={handleNext} size="lg">
                  Continue to Behaviors
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {!canEdit && goals && goals.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleNext} variant="outline">
            Continue to Behaviors
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
