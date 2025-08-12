'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePDR } from '@/hooks/use-pdrs';
import { useGoals } from '@/hooks/use-goals';
import { useBehaviors } from '@/hooks/use-behaviors';
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

interface ReviewPageProps {
  params: { id: string };
}

const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
};

export default function ReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading } = usePDR(params.id);
  const { data: goals, isLoading: goalsLoading } = useGoals(params.id);
  const { data: behaviors, isLoading: behaviorsLoading } = useBehaviors(params.id);

  const isLoading = pdrLoading || goalsLoading || behaviorsLoading;
  const canSubmit = pdr && !pdr.isLocked && pdr.status === 'DRAFT';
  const canEdit = pdr && !pdr.isLocked && (pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED');

  // Calculate completion statistics
  const stats = {
    totalGoals: goals?.length || 0,
    goalsWithRating: goals?.filter(g => g.employeeRating).length || 0,
    totalBehaviors: behaviors?.length || 0,
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
      const response = await fetch(`/api/pdrs/${pdr.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'SUBMITTED',
          currentStep: 4, // Move to mid-year step
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit PDR');
      }

      // Redirect to success or next step
      router.push(`/pdr/${pdr.id}/mid-year`);
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
            <Eye className="h-6 w-6 mr-2 text-blue-600" />
            Review & Submit
          </h1>
          <p className="text-gray-600 mt-1">
            Review your goals and behaviors before submitting for manager review
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <PDRStatusBadge status={pdr?.status || 'DRAFT'} />
          {canSubmit && isComplete && (
            <Button 
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          )}
        </div>
      </div>

      {/* Completion Status */}
      <Card className={isComplete ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${isComplete ? 'text-green-800' : 'text-yellow-800'}`}>
                {isComplete ? 'Ready for Submission' : 'Completion Required'}
              </h3>
              <p className={`text-sm ${isComplete ? 'text-green-700' : 'text-yellow-700'}`}>
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
              <div className="text-2xl font-bold text-blue-600">{stats.totalGoals}</div>
              <div className="text-sm text-gray-600">Goals Set</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.totalBehaviors}</div>
              <div className="text-sm text-gray-600">Values Assessed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.averageGoalRating > 0 ? stats.averageGoalRating.toFixed(1) : '-'}
              </div>
              <div className="text-sm text-gray-600">Avg Goal Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.averageBehaviorRating > 0 ? stats.averageBehaviorRating.toFixed(1) : '-'}
              </div>
              <div className="text-sm text-gray-600">Avg Value Rating</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
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
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{goal.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={PRIORITY_COLORS[goal.priority]}>
                        {goal.priority}
                      </Badge>
                      {goal.employeeRating && (
                        <div className="flex items-center">
                          <RatingInput
                            value={goal.employeeRating}
                            onChange={() => {}}
                            disabled
                            size="sm"
                          />
                          <span className="ml-1 text-sm text-gray-600">
                            {goal.employeeRating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {goal.description && (
                    <p className="text-gray-600 text-sm mb-2">{goal.description}</p>
                  )}
                  {goal.targetOutcome && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Target: </span>
                      <span className="text-gray-600">{goal.targetOutcome}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No goals have been set yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Behaviors Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2 text-red-500" />
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
          {behaviors && behaviors.length > 0 ? (
            <div className="space-y-4">
              {behaviors.map((behavior) => (
                <div key={behavior.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                      <h4 className="font-medium text-gray-900">
                        {behavior.value?.name || 'Unknown Value'}
                      </h4>
                    </div>
                    {behavior.employeeRating && (
                      <div className="flex items-center">
                        <RatingInput
                          value={behavior.employeeRating}
                          onChange={() => {}}
                          disabled
                          size="sm"
                        />
                        <span className="ml-1 text-sm text-gray-600">
                          {behavior.employeeRating}/5
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{behavior.description}</p>
                  {behavior.examples && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Examples: </span>
                      <span className="text-gray-600">{behavior.examples}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No behaviors have been assessed yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Behaviors
        </Button>

        {pdr?.status === 'SUBMITTED' && (
          <Button onClick={() => router.push(`/pdr/${params.id}/mid-year`)}>
            Continue to Mid-Year
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-green-600">Submit PDR for Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to submit your PDR for manager review? 
                You will still be able to make changes during the review process.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <h4 className="font-medium text-blue-900 mb-1">What happens next:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
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
                  className="bg-green-600 hover:bg-green-700"
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
