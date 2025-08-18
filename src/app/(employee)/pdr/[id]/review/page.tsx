'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoPDR, useDemoGoals, useDemoBehaviors, useDemoCompanyValues } from '@/hooks/use-demo-pdr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { RatingInput } from '@/components/pdr/rating-input';
import { 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Target,
  Heart,
  FileText
} from 'lucide-react';
import { formatFYForDisplay } from '@/lib/financial-year';

interface ReviewPageProps {
  params: { id: string };
}

// Helper function to get development data from localStorage
const getDevelopmentData = (pdrId: string) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(`demo_development_${pdrId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving development data:', error);
    return null;
  }
};

// Priority colors are no longer needed - using weighting instead

export default function ReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [developmentData, setDevelopmentData] = useState<any>(null);
  
  const { data: pdr, isLoading: pdrLoading, updatePdr } = useDemoPDR(params.id);
  const { data: goals, isLoading: goalsLoading } = useDemoGoals(params.id);
  const { data: behaviors, isLoading: behaviorsLoading } = useDemoBehaviors(params.id);
  const { data: companyValues, isLoading: valuesLoading } = useDemoCompanyValues();

  const isLoading = pdrLoading || goalsLoading || behaviorsLoading || valuesLoading;
  const canSubmit = pdr && !pdr.isLocked && (pdr.status === 'DRAFT' || pdr.status === 'Created');
  const canEdit = pdr && !pdr.isLocked && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED' || pdr.status === 'Created');

  // Load development data
  useEffect(() => {
    const devData = getDevelopmentData(params.id);
    setDevelopmentData(devData);
    
    // Debug: Check what behavior data exists in localStorage
    const storedBehaviors = localStorage.getItem(`demo_behaviors_${params.id}`);
    console.log('🔍 SIMPLE DEBUG - Review page loading:', {
      pdrId: params.id,
      localStorageKey: `demo_behaviors_${params.id}`,
      storedBehaviorsRaw: storedBehaviors,
      storedBehaviorsParsed: storedBehaviors ? JSON.parse(storedBehaviors) : null,
      hookBehaviorsData: behaviors,
      totalBehaviorsCount: behaviors?.length || 0
    });
  }, [params.id, behaviors]);
  
  // Ensure the PDR currentStep is updated to at least 3 (Review) when on the review page
  useEffect(() => {
    if (pdr && pdr.currentStep < 3) {
      console.log('🔧 Review page - PDR step needs update:', pdr.currentStep);
      updatePdr({
        currentStep: 3, // Ensure we're at least at step 3 (Review)
      });
      console.log('✅ Review page - Updated PDR step to 3');
    } else if (pdr) {
      console.log('🔧 Review page - PDR step already correct:', pdr.currentStep);
    }
  }, [pdr, updatePdr]);

  console.log('Review page debug:', {
    pdrId: params.id,
    pdr: pdr,
    pdrStatus: pdr?.status,
    canSubmit,
    canEdit,
    isLoading,
    submittedAt: pdr?.submittedAt
  });

  // Debug: Check what behaviors are loaded and what company values exist
  console.log('🔍 Behaviors vs Company Values Debug:', {
    behaviors: behaviors,
    companyValues: companyValues,
    behaviorsCount: behaviors?.length || 0,
    companyValuesCount: companyValues?.length || 0,
    behaviorValueIds: behaviors?.map(b => ({ id: b.valueId, name: 'unknown' })) || [],
    companyValueIds: companyValues?.map(v => ({ id: v.id, name: v.name })) || []
  });

  // Helper function to get company value name
  const getValueName = (valueId: string) => {
    return companyValues?.find(value => value.id === valueId)?.name || 'Unknown Value';
  };

  // Calculate completion statistics including development fields
  const developmentFieldsCount = developmentData ? 
    (developmentData.selfReflection ? 1 : 0) + (developmentData.deepDiveDevelopment ? 1 : 0) : 0;
    
  // Count total behaviors as all 4 company values + development fields, regardless of what's saved
  const totalCompanyValues = companyValues?.length || 4; // Always 4 company values
  const totalBehaviorsForDisplay = totalCompanyValues + developmentFieldsCount;
    
  const stats = {
    totalGoals: goals?.length || 0,
    goalsWithRating: goals?.filter(g => g.employeeRating).length || 0,
    totalBehaviors: totalBehaviorsForDisplay, // Show all 6 fields (4 company values + 2 development)
    behaviorsWithRating: behaviors?.filter(b => b.employeeRating).length || 0,
    averageGoalRating: goals && goals.length > 0 
      ? goals.reduce((sum, g) => sum + (g.employeeRating || 0), 0) / goals.filter(g => g.employeeRating).length
      : 0,
    averageBehaviorRating: behaviors && behaviors.length > 0
      ? behaviors.reduce((sum, b) => sum + (b.employeeRating || 0), 0) / behaviors.filter(b => b.employeeRating).length
      : 0,
  };

  const isComplete = stats.totalGoals > 0 && stats.totalBehaviors > 0;

  const handlePrevious = () => {
    router.push(`/pdr/${params.id}/behaviors`);
  };

  const handleEditGoals = () => {
    router.push(`/pdr/${params.id}/goals`);
  };

  const handleEditBehaviors = () => {
    router.push(`/pdr/${params.id}/behaviors`);
  };

  const handleSubmit = async () => {
    if (!pdr) {return;}
    
    setIsSubmitting(true);
    try {
      // For demo mode, simulate submission by updating PDR state
      updatePdr({
        status: 'SUBMITTED',
        currentStep: 4,
        submittedAt: new Date(),
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect back to dashboard after successful submission
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to submit PDR:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Eye className="h-6 w-6 mr-2 text-status-info" />
            Review & Submit
          </h1>
          <p className="text-muted-foreground mt-1">
            Review your goals and behaviors before submitting for manager review
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handlePrevious} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Behaviors
          </Button>
          <PDRStatusBadge status={pdr?.status || 'DRAFT'} />
          {canSubmit && isComplete && (
            <Button 
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting}
              className="bg-status-success hover:bg-status-success/90 text-status-success-foreground"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          )}
        </div>
      </div>

      {/* Completion Status */}
      <Card className={isComplete ? 'border-status-success/30 bg-status-success/5' : 'border-status-warning/30 bg-status-warning/5'}>
        <CardContent className="py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-status-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-status-warning" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${isComplete ? 'text-status-success' : 'text-status-warning'}`}>
                {isComplete ? 'Ready for Submission' : 'Completion Required'}
              </h3>
              <p className={`text-sm ${isComplete ? 'text-status-success/80' : 'text-status-warning/80'}`}>
                {isComplete 
                  ? 'Your PDR is complete and ready for manager review.'
                  : 'Please complete all sections before submitting.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            PDR Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-status-info">{stats.totalGoals}</div>
              <div className="text-sm text-muted-foreground">Goals Set</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-error">{stats.totalBehaviors}</div>
              <div className="text-sm text-muted-foreground">Values Assessed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-success">
                {stats.averageGoalRating > 0 ? stats.averageGoalRating.toFixed(1) : '-'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Goal Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-activity-behavior">
                {stats.averageBehaviorRating > 0 ? stats.averageBehaviorRating.toFixed(1) : '-'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Value Rating</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-status-info" />
              Goals & Objectives ({stats.totalGoals})
            </CardTitle>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={handleEditGoals}>
                Edit Goals
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {goals && goals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <div key={goal.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{goal.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {goal.weighting || 0}%
                      </Badge>
                      {goal.employeeRating && (
                        <div className="flex items-center">
                          <RatingInput
                            value={goal.employeeRating}
                            onChange={() => {}}
                            disabled
                            size="sm"
                          />
                          <span className="ml-1 text-sm text-muted-foreground">
                            {goal.employeeRating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {goal.description && (
                    <p className="text-muted-foreground text-sm mb-2">{goal.description}</p>
                  )}
                  {goal.targetOutcome && (
                    <div className="text-sm mb-2">
                      <span className="font-medium text-foreground/80">Target: </span>
                      <span className="text-muted-foreground">{goal.targetOutcome}</span>
                    </div>
                  )}
                  
                  {/* FY Label - Bottom right display */}
                  {pdr?.fyLabel && (
                    <div className="flex justify-end mt-2">
                      <span className="text-xs text-muted-foreground/60 font-mono">
                        {formatFYForDisplay(pdr.fyLabel)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Goals Set Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start by setting your goals and objectives for this review period.
              </p>
              {canEdit && (
                <Button onClick={handleEditGoals}>
                  <Target className="h-4 w-4 mr-2" />
                  Set Your Goals
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behaviors Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2 text-activity-behavior" />
              Company Values & Behaviors ({stats.totalBehaviors})
            </CardTitle>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={handleEditBehaviors}>
                Edit Behaviors
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {companyValues && companyValues.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {companyValues.map((value) => {
                // Find the saved behavior for this company value
                const savedBehavior = behaviors?.find(b => b.valueId === value.id);
                

                
                return (
                  <div key={value.id} className="border border-border rounded-lg p-4 h-32 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-activity-behavior mr-3 flex-shrink-0"></div>
                        <h4 className="font-medium text-foreground text-sm leading-tight">
                          {value.name}
                        </h4>
                      </div>
                      {savedBehavior?.employeeRating && (
                        <div className="flex items-center flex-shrink-0">
                          <RatingInput
                            value={savedBehavior.employeeRating}
                            onChange={() => {}}
                            disabled
                            size="sm"
                          />
                          <span className="ml-1 text-xs text-muted-foreground">
                            {savedBehavior.employeeRating}/5
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">
                        {savedBehavior?.description || 'No response provided'}
                      </p>
                    </div>
                    {savedBehavior?.examples && (
                      <div className="text-xs mt-2 pt-2 border-t border-border/50">
                        <span className="font-medium text-foreground/80">Examples: </span>
                        <span className="text-muted-foreground">{savedBehavior.examples}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Self Reflection Field */}
              {developmentData?.selfReflection && (
                <div className="border border-border rounded-lg p-4 h-32 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-3 flex-shrink-0"></div>
                      <h4 className="font-medium text-foreground text-sm leading-tight">Self Reflection</h4>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">
                      {developmentData.selfReflection}
                    </p>
                  </div>
                </div>
              )}
              
              {/* CodeFish 3D Development Field */}
              {developmentData?.deepDiveDevelopment && (
                <div className="border border-border rounded-lg p-4 h-32 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-3 flex-shrink-0"></div>
                      <h4 className="font-medium text-foreground text-sm leading-tight">CodeFish 3D - Deep Dive Development</h4>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">
                      {developmentData.deepDiveDevelopment}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Behaviors Assessed Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Assess how you can meet our company values in your daily work.
              </p>
              {canEdit && (
                <Button onClick={handleEditBehaviors}>
                  <Heart className="h-4 w-4 mr-2" />
                  Assess Your Behaviors
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-status-success">Submit PDR for Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to submit your PDR for manager review? 
                You will still be able to make changes during the review process.
              </p>
              <div className="bg-status-info/10 border border-status-info/20 p-3 rounded-lg mb-4">
                <h4 className="font-medium text-status-info mb-1">What happens next:</h4>
                <ul className="text-sm text-status-info/80 space-y-1">
                  <li>• Your manager will review your goals and behaviors</li>
                  <li>• You'll receive feedback and ratings</li>
                  <li>• You can continue to mid-year check-in</li>
                </ul>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-status-success hover:bg-status-success/90 text-status-success-foreground"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit PDR'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
