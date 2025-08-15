'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoPDR, useDemoBehaviors, useDemoCompanyValues } from '@/hooks/use-demo-pdr';
import { BehaviorForm } from '@/components/forms/behavior-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowRight, ArrowLeft, Heart, CheckCircle, Star } from 'lucide-react';
import { BehaviorFormData } from '@/types';

interface BehaviorsPageProps {
  params: { id: string };
}

export default function BehaviorsPage({ params }: BehaviorsPageProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading } = useDemoPDR(params.id);
  const { data: behaviors, isLoading: behaviorsLoading, addBehavior, updateBehavior, deleteBehavior } = useDemoBehaviors(params.id);
  const { data: companyValues, isLoading: valuesLoading } = useDemoCompanyValues();

  const isLoading = pdrLoading || behaviorsLoading || valuesLoading;
  const isReadOnly = pdr?.isLocked || false;
  const canEdit = pdr && !isReadOnly && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED' || pdr.status === 'Created');

  // Get available company values (not already used)
  const availableValues = companyValues?.filter(value => 
    !behaviors?.some(behavior => behavior.valueId === value.id)
  ) || [];

  const handleCreateBehavior = async (data: BehaviorFormData) => {
    addBehavior(data);
    setShowAddForm(false);
  };

  const handleUpdateBehavior = async (behaviorId: string, data: BehaviorFormData) => {
    updateBehavior(behaviorId, data);
  };

  const handleDeleteBehavior = async (behaviorId: string) => {
    deleteBehavior(behaviorId);
  };

  const handleNext = () => {
    router.push(`/pdr/${params.id}/review`);
  };

  const handlePrevious = () => {
    router.push(`/pdr/${params.id}/goals`);
  };

  const handleAddBehavior = () => {
    setShowAddForm(true);
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

  const averageRating = behaviors && behaviors.length > 0 
    ? behaviors.reduce((sum, b) => sum + (b.employeeRating || 0), 0) / behaviors.filter(b => b.employeeRating).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Heart className="h-6 w-6 mr-2 text-activity-behavior" />
            Company Values & Behaviors
          </h1>
          <p className="text-muted-foreground mt-1">
            Demonstrate how you embody our company values
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center">
            {behaviors?.length || 0} of {companyValues?.length || 0} values
          </Badge>
          {canEdit && availableValues.length > 0 && (
            <Button onClick={handleAddBehavior} disabled={showAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Instructions */}
      {(!behaviors || behaviors.length === 0) && !showAddForm && (
        <Card>
          <CardContent className="text-center py-8">
            <Heart className="h-12 w-12 text-activity-behavior mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Assess Your Values Alignment
            </h3>
            <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
              For each company value, describe how you demonstrate it in your work. 
              Provide specific examples and reflect on your strengths and areas for growth.
            </p>
            {companyValues && companyValues.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {companyValues.map((value) => (
                  <div key={value.id} className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-foreground">{value.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{value.description}</p>
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <Button onClick={handleAddBehavior}>
                <Plus className="h-4 w-4 mr-2" />
                Start Value Assessment
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Behavior Form */}
      {showAddForm && (
        <BehaviorForm
          companyValues={availableValues}
          onSubmit={handleCreateBehavior}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={false}
        />
      )}

      {/* Behaviors List */}
      {behaviors && behaviors.length > 0 && (
        <div className="space-y-4">
          {behaviors.map((behavior) => (
            <BehaviorForm
              key={behavior.id}
              behavior={behavior}
              companyValues={companyValues || []}
              onSubmit={(data) => handleUpdateBehavior(behavior.id, data)}
              {...(canEdit && { onDelete: handleDeleteBehavior })}
              isSubmitting={false}
              isReadOnly={!canEdit}
            />
          ))}
        </div>
      )}

      {/* Missing Values Alert */}
      {behaviors && companyValues && behaviors.length < companyValues.length && canEdit && (
        <Card className="border-status-warning/30 bg-status-warning/5">
          <CardContent className="py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-5 w-5 text-status-warning" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-status-warning">
                  Complete Your Values Assessment
                </h3>
                <div className="mt-2 text-sm text-status-warning/80">
                  <p>
                    You have {companyValues.length - behaviors.length} company value{companyValues.length - behaviors.length !== 1 ? 's' : ''} left to assess:
                  </p>
                  <ul className="list-disc list-inside mt-1">
                    {availableValues.map((value) => (
                      <li key={value.id}>{value.name}</li>
                    ))}
                  </ul>
                </div>
                {availableValues.length > 0 && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={handleAddBehavior}
                      disabled={showAddForm}
                      className="bg-status-warning hover:bg-status-warning/90 text-status-warning-foreground"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Assessment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Summary */}
      {behaviors && behaviors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-status-success" />
              Values Assessment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-status-info">{behaviors.length}</div>
                <div className="text-sm text-muted-foreground">Values Assessed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-status-success">
                  {behaviors.filter(b => b.employeeRating && b.employeeRating >= 4).length}
                </div>
                <div className="text-sm text-muted-foreground">Self-Rated 4+</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-activity-behavior">
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-status-warning">
                  {Math.round((behaviors.length / (companyValues?.length || 1)) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Completion</div>
              </div>
            </div>
            
            {behaviors.length === companyValues?.length && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-status-success/10 text-status-success rounded-full mb-4">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  All company values assessed!
                </div>
                <p className="text-muted-foreground mb-4">
                  Excellent! You've assessed all {companyValues.length} company values. 
                  Ready to review and submit your PDR?
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Goals
        </Button>
        
        {behaviors && behaviors.length > 0 && (
          <Button onClick={handleNext}>
            Continue to Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
