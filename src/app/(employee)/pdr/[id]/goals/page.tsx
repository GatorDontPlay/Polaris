'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoPDR, useDemoGoals } from '@/hooks/use-demo-pdr';
import { GoalForm } from '@/components/forms/goal-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowRight, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoalFormData } from '@/types';

interface GoalsPageProps {
  params: { id: string };
}

export default function GoalsPage({ params }: GoalsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading } = useDemoPDR(params.id);
  const { data: goals, isLoading: goalsLoading, addGoal, updateGoal, deleteGoal } = useDemoGoals(params.id);

  const isLoading = pdrLoading || goalsLoading;
  const isReadOnly = pdr?.isLocked || false;
  const canEdit = pdr && !isReadOnly && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED' || pdr.status === 'OPEN_FOR_REVIEW' || pdr.status === 'Created');

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
    // Calculate total weighting
    const totalWeighting = goals?.reduce((sum, goal) => sum + (goal.weighting || 0), 0) || 0;
    
    // Check if total weighting equals 100%
    if (totalWeighting !== 100) {
      toast({
        title: "Goal weighting must total 100%",
        description: `Current total: ${totalWeighting}%. Please adjust your goal weightings.`,
        variant: "destructive",
      });
      return;
    }
    
    // If validation passes, navigate to behaviors page
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
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Target className="h-7 w-7 mr-3 text-status-error" />
            Goals & Objectives
          </h1>
          <p className="text-white mt-2">
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
          {goals && goals.length > 0 && canEdit && (
            <Button 
              onClick={handleNext} 
              className="bg-status-success hover:bg-status-success/90 text-black font-medium"
            >
              Continue to Behaviors
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Goals Summary - Fixed bottom right */}
      {goals && goals.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="bg-background border shadow-lg">
            <CardContent className="px-3 py-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium">Goals Summary</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-400">{goals.length}</div>
                    <div className="text-xs text-muted-foreground">Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-emerald-400">
                      {goals.reduce((sum, goal) => sum + (goal.weighting || 0), 0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Weighting</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {(!goals || goals.length === 0) && !showAddForm && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Set Your Goals
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed">
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
          existingGoals={goals || []}
          fyLabel={pdr?.fyLabel}
        />
      )}

      {/* Goals List */}
      {goals && goals.length > 0 && (
        <div className="space-y-4">
          {/* Goals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <GoalForm
                key={goal.id}
                goal={goal}
                onSubmit={(data) => handleUpdateGoal(goal.id, data)}
                {...(canEdit && { onDelete: () => handleDeleteGoal(goal.id) })}
                isSubmitting={isSubmitting}
                isReadOnly={!canEdit}
                existingGoals={goals || []}
                fyLabel={pdr?.fyLabel}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      {!canEdit && goals && goals.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={handleNext}
            className="bg-status-success hover:bg-status-success/90 text-black font-medium"
          >
            Continue to Behaviors
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

