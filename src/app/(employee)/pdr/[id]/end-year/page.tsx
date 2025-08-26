'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDemoPDR, useDemoGoals, useDemoBehaviors, useDemoCompanyValues } from '@/hooks/use-demo-pdr';
import { useEndYearReview, useEndYearReviewMutation } from '@/hooks/use-reviews';
import { endYearReviewSchema } from '@/lib/validations';
import { EndYearFormData, Goal, Behavior, CompanyValue } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RatingInput } from '@/components/pdr/rating-input';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Save, 
  Send,
  Award,
  CheckCircle,
  AlertCircle,
  Star,
  Trophy,
  Target,
  TrendingUp,
  MessageSquare,
  PartyPopper
} from 'lucide-react';

interface EndYearPageProps {
  params: { id: string };
}

export default function EndYearPage({ params }: EndYearPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Demo data hooks
  const { data: pdr, isLoading: pdrLoading, updatePdr } = useDemoPDR(params.id);
  const { data: goals, isLoading: goalsLoading } = useDemoGoals(params.id);
  const { data: behaviors, isLoading: behaviorsLoading } = useDemoBehaviors(params.id);
  const { data: companyValues } = useDemoCompanyValues();
  const { data: endYearReview, isLoading: reviewLoading } = useEndYearReview(params.id);
  const { create: createReview, update: updateReview } = useEndYearReviewMutation(params.id);

  // State for goal and behavior self-assessments
  const [goalSelfAssessments, setGoalSelfAssessments] = useState<Record<string, { rating: number; reflection: string }>>({});
  const [behaviorSelfAssessments, setBehaviorSelfAssessments] = useState<Record<string, { rating: number; reflection: string }>>({});
  const [ceoFeedback, setCeoFeedback] = useState('');

  const isLoading = pdrLoading || reviewLoading || goalsLoading || behaviorsLoading;
  const canEdit = pdr && !pdr.isLocked && !endYearReview;
  const canUpdate = pdr && !pdr.isLocked && endYearReview && pdr.status !== 'COMPLETED';

  // Load saved self-assessments from localStorage
  useEffect(() => {
    if (params.id) {
      // Load goal self-assessments
      const savedGoalAssessments = localStorage.getItem(`end_year_goal_assessments_${params.id}`);
      if (savedGoalAssessments) {
        try {
          setGoalSelfAssessments(JSON.parse(savedGoalAssessments));
        } catch (error) {
          console.error('Error loading goal assessments:', error);
        }
      }

      // Load behavior self-assessments
      const savedBehaviorAssessments = localStorage.getItem(`end_year_behavior_assessments_${params.id}`);
      if (savedBehaviorAssessments) {
        try {
          setBehaviorSelfAssessments(JSON.parse(savedBehaviorAssessments));
        } catch (error) {
          console.error('Error loading behavior assessments:', error);
        }
      }

      // Load CEO feedback
      const savedCeoFeedback = localStorage.getItem(`end_year_ceo_feedback_${params.id}`);
      if (savedCeoFeedback) {
        setCeoFeedback(savedCeoFeedback);
      }
    }
  }, [params.id]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<EndYearFormData>({
    resolver: zodResolver(endYearReviewSchema),
    defaultValues: endYearReview ? Object.fromEntries([
      ['achievementsSummary', endYearReview.achievementsSummary],
      ['learningsGrowth', endYearReview.learningsGrowth || ''],
      ['challengesFaced', endYearReview.challengesFaced || ''],
      ['nextYearGoals', endYearReview.nextYearGoals || ''],
      ...(endYearReview.employeeOverallRating !== null ? [['employeeOverallRating', endYearReview.employeeOverallRating]] : [])
    ]) as any : {
      achievementsSummary: '',
      learningsGrowth: '',
      challengesFaced: '',
      nextYearGoals: '',
    },
  });

  const employeeOverallRating = watch('employeeOverallRating');

  const handlePrevious = () => {
    router.push(`/pdr/${params.id}/mid-year`);
  };

  const handleRatingChange = (rating: number) => {
    setValue('employeeOverallRating', rating, { shouldDirty: true });
  };

  // Helper functions for goal and behavior assessments
  const updateGoalAssessment = (goalId: string, field: 'rating' | 'reflection', value: number | string) => {
    setGoalSelfAssessments(prev => {
      const updated = {
        ...prev,
        [goalId]: {
          ...prev[goalId],
          [field]: value
        }
      };
      localStorage.setItem(`end_year_goal_assessments_${params.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateBehaviorAssessment = (behaviorId: string, field: 'rating' | 'reflection', value: number | string) => {
    setBehaviorSelfAssessments(prev => {
      const updated = {
        ...prev,
        [behaviorId]: {
          ...prev[behaviorId],
          [field]: value
        }
      };
      localStorage.setItem(`end_year_behavior_assessments_${params.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateCeoFeedback = (feedback: string) => {
    setCeoFeedback(feedback);
    localStorage.setItem(`end_year_ceo_feedback_${params.id}`, feedback);
  };

  // Get mid-year comments from localStorage
  const getMidYearComments = () => {
    const goalComments = localStorage.getItem(`mid_year_goal_comments_${params.id}`);
    const behaviorComments = localStorage.getItem(`mid_year_behavior_comments_${params.id}`);
    return {
      goals: goalComments ? JSON.parse(goalComments) : {},
      behaviors: behaviorComments ? JSON.parse(behaviorComments) : {}
    };
  };

  const midYearComments = getMidYearComments();

  // Get CEO feedback from localStorage
  const getCeoFeedback = () => {
    const goalFeedback = localStorage.getItem(`demo_ceo_goal_feedback_${params.id}`);
    const behaviorFeedback = localStorage.getItem(`ceo_behavior_feedback_${params.id}`);
    return {
      goals: goalFeedback ? JSON.parse(goalFeedback) : {},
      behaviors: behaviorFeedback ? JSON.parse(behaviorFeedback) : {}
    };
  };

  const ceoFeedbackData = getCeoFeedback();

  // Get rating label
  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Did not achieve';
      case 2: return 'Partial - Needs Improvement';
      case 3: return 'Met Expectations';
      case 4: return 'Exceeded Expectations';
      case 5: return 'Outstanding Outcomes';
      default: return '';
    }
  };

  const onSubmit = async (data: EndYearFormData) => {
    setIsSubmitting(true);
    try {
      // Create enhanced end-year review data
      const enhancedData = {
        ...data,
        goalSelfAssessments,
        behaviorSelfAssessments,
        ceoFeedback
      };

      // Store review data directly in localStorage for demo purposes
      // This bypasses the API calls that are failing with 401 errors
      localStorage.setItem(`end_year_review_${params.id}`, JSON.stringify({
        ...enhancedData,
        id: `end-year-review-${Date.now()}`,
        pdrId: params.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Update PDR status to ready for CEO final review and mark all steps as complete
      if (pdr && updatePdr) {
        const updatedPdr = {
          ...pdr,
          status: 'SUBMITTED_FOR_REVIEW',
          submittedAt: new Date(),
          currentStep: 5, // Mark all steps as complete (total 5 steps)
          isCompleted: true // Indicate that all required steps are done
        };
        
        // Update PDR in localStorage
        localStorage.setItem(`demo_pdr_${params.id}`, JSON.stringify(updatedPdr));
        
        // Call updatePdr to update UI state
        await updatePdr({
          status: 'SUBMITTED_FOR_REVIEW',
          submittedAt: new Date(),
          currentStep: 5,
          isCompleted: true
        });
      }

      // Save the self-assessment data for dashboard display
      // Calculate combined score from goal and behavior ratings
      let totalRating = 0;
      let ratingCount = 0;
      let allRatings: number[] = [];
      
      // Add goal ratings
      Object.values(goalSelfAssessments).forEach(assessment => {
        if (assessment.rating) {
          totalRating += assessment.rating;
          ratingCount++;
          allRatings.push(assessment.rating);
        }
      });
      
      // Add behavior ratings
      Object.values(behaviorSelfAssessments).forEach(assessment => {
        if (assessment.rating) {
          totalRating += assessment.rating;
          ratingCount++;
          allRatings.push(assessment.rating);
        }
      });
      
      // Add overall self-rating if provided
      if (data.employeeOverallRating) {
        totalRating += data.employeeOverallRating;
        ratingCount++;
        allRatings.push(data.employeeOverallRating);
      }
      
      // Calculate and store the average rating and individual scores
      if (ratingCount > 0) {
        const averageRating = Number((totalRating / ratingCount).toFixed(1));
        localStorage.setItem(`self_assessed_score_${params.id}`, JSON.stringify({
          average: averageRating,
          scores: allRatings,
          lastUpdated: new Date().toISOString()
        }));
      }

      // Store all entered data for future reference
      localStorage.setItem(`end_year_complete_data_${params.id}`, JSON.stringify({
        ...data,
        goalSelfAssessments,
        behaviorSelfAssessments,
        submittedAt: new Date().toISOString()
      }));
      
      // Show completion modal
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Failed to submit end-year review:', error);
      toast({
        title: "Error",
        description: "There was a problem submitting your review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const formData = watch();
    try {
      // Save draft directly to localStorage instead of using API
      localStorage.setItem(`end_year_draft_${params.id}`, JSON.stringify({
        ...formData,
        goalSelfAssessments,
        behaviorSelfAssessments,
        lastSaved: new Date().toISOString()
      }));
      
      toast({
        title: "Draft Saved",
        description: "Your review draft has been saved successfully.",
        variant: "success"
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({
        title: "Error",
        description: "There was a problem saving your draft. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCompletionConfirm = () => {
    // Store all form data in localStorage for future reference
    const formData = watch();
    localStorage.setItem(`end_year_complete_data_${params.id}`, JSON.stringify({
      ...formData,
      goalSelfAssessments,
      behaviorSelfAssessments,
      submittedAt: new Date().toISOString()
    }));
    
    // Show toast and navigate to dashboard
    toast({
      title: "Annual Review Complete",
      description: "Thank you for completing your annual review",
      variant: "success",
      duration: 5000
    });
    
    router.push('/dashboard');
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

  // Read-only view for completed reviews
  if (endYearReview && !canUpdate) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-pdr-endyear" />
              End-Year Review
            </h1>
            <p className="text-muted-foreground mt-1">
              Your final assessment and reflection for this review period
            </p>
          </div>
          <Badge className="pdr-status-completed">
            <CheckCircle className="h-4 w-4 mr-1" />
            Completed
          </Badge>
        </div>

        {/* Review Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your End-Year Assessment</span>
              {endYearReview.employeeOverallRating && (
                <div className="flex items-center">
                  <RatingInput
                    value={endYearReview.employeeOverallRating}
                    onChange={() => {}}
                    disabled
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Overall: {endYearReview.employeeOverallRating}/5
                  </span>
                </div>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Submitted on {new Date(endYearReview.submittedAt).toLocaleDateString('en-AU')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                <Award className="h-4 w-4 mr-2 text-pdr-endyear" />
                Key Achievements
              </h4>
              <p className="text-foreground whitespace-pre-wrap">{endYearReview.achievementsSummary}</p>
            </div>

            {endYearReview.learningsGrowth && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                  <Star className="h-4 w-4 mr-2 text-status-info" />
                  Learning & Growth
                </h4>
                <p className="text-foreground whitespace-pre-wrap">{endYearReview.learningsGrowth}</p>
              </div>
            )}

            {endYearReview.challengesFaced && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-status-warning" />
                  Challenges Faced
                </h4>
                <p className="text-foreground whitespace-pre-wrap">{endYearReview.challengesFaced}</p>
              </div>
            )}

            {endYearReview.nextYearGoals && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                  <Target className="h-4 w-4 mr-2 text-status-success" />
                  Next Year Goals
                </h4>
                <p className="text-foreground whitespace-pre-wrap">{endYearReview.nextYearGoals}</p>
              </div>
            )}

            {endYearReview.ceoFinalComments && (
              <div className="bg-status-info/10 border border-status-info/20 p-4 rounded-lg">
                <h4 className="font-medium text-status-info mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Manager Final Comments
                </h4>
                <p className="text-status-info/80 whitespace-pre-wrap">{endYearReview.ceoFinalComments}</p>
                {endYearReview.ceoOverallRating && (
                  <div className="mt-3 flex items-center">
                    <span className="text-sm font-medium text-status-info mr-2">Manager Rating:</span>
                    <RatingInput
                      value={endYearReview.ceoOverallRating}
                      onChange={() => {}}
                      disabled
                      size="sm"
                    />
                    <span className="ml-2 text-sm text-status-info/80">
                      {endYearReview.ceoOverallRating}/5
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button onClick={handlePrevious} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Mid-Year
          </Button>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Trophy className="h-6 w-6 mr-2 text-pdr-endyear" />
            End-Year Review
          </h1>
          <p className="text-muted-foreground mt-1">
            Reflect on your achievements and plan for the future
          </p>
        </div>
        <Badge variant="outline" className="flex items-center pdr-status-endyear">
          <Star className="h-4 w-4 mr-1" />
          {endYearReview ? 'Update Review' : 'Final Review'}
        </Badge>
      </div>

      {/* Instructions */}
      {!endYearReview && (
        <Card className="border-pdr-endyear/20 bg-pdr-endyear/10">
          <CardContent className="py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-5 w-5 text-pdr-endyear" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-pdr-endyear">
                  Final Assessment
                </h3>
                <p className="text-sm text-pdr-endyear/80 mt-1">
                  This is your final review for this period. Take time to celebrate your achievements, 
                  reflect on your growth, and set intentions for the year ahead.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      <Card>
        <CardHeader>
          <CardTitle>End-Year Self-Assessment</CardTitle>
          <CardDescription>
            Reflect on your achievements, learning, and future goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Goals Self-Assessment */}
            {goals && goals.length > 0 && (
              <div className="space-y-6">
                <div className="border-b border-border pb-2">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-5 w-5 text-pdr-endyear" />
                    Goals Self-Assessment ({goals.length} goals)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reflect on your performance against each goal you set at the beginning of the year
                  </p>
                </div>

                {goals.map((goal, index) => {
                  const goalAssessment = goalSelfAssessments[goal.id] || { rating: 1, reflection: '' };
                  const ceoGoalFeedback = ceoFeedbackData.goals[goal.id] || {};
                  const midYearGoalComment = midYearComments.goals[goal.id] || '';

                  return (
                    <Card key={goal.id} className="border-l-4 border-l-pdr-endyear">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{goal.title}</CardTitle>
                            <CardDescription className="mt-1 text-sm">
                              {goal.description}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="ml-4 shrink-0">
                            Goal {index + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Side - Historical Information */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                              Historical Context
                            </h4>
                            
                            {/* Original Plan */}
                            <div className="bg-muted/30 p-3 rounded-md">
                              <h5 className="text-xs font-medium text-foreground mb-1">Original Plan</h5>
                              <p className="text-xs text-foreground leading-relaxed">{goal.description}</p>
                              {goal.targetOutcome && (
                                <div className="mt-2 pt-2 border-t border-muted">
                                  <span className="text-xs font-medium text-muted-foreground">Target: </span>
                                  <span className="text-xs text-foreground">{goal.targetOutcome}</span>
                                </div>
                              )}
                            </div>

                            {/* CEO Comments */}
                            {ceoGoalFeedback.ceoDescription && (
                              <div className="bg-status-info/10 p-3 rounded-md border border-status-info/20">
                                <h5 className="text-xs font-medium text-foreground mb-1">CEO Comments</h5>
                                <p className="text-xs text-foreground leading-relaxed">{ceoGoalFeedback.ceoDescription}</p>
                              </div>
                            )}

                            {/* Mid-Year Check-in */}
                            {midYearGoalComment && (
                              <div className="bg-pdr-midyear/10 p-3 rounded-md border border-pdr-midyear/20">
                                <h5 className="text-xs font-medium text-foreground mb-1">Mid-Year Check-in</h5>
                                <p className="text-xs text-foreground leading-relaxed">{midYearGoalComment}</p>
                              </div>
                            )}
                          </div>

                          {/* Right Side - Self-Assessment Inputs */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                              Your Self-Assessment
                            </h4>
                            
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Self-Rating
                              </label>
                              <div className="flex items-center gap-3">
                                <RatingInput
                                  value={goalAssessment.rating}
                                  onChange={(rating) => updateGoalAssessment(goal.id, 'rating', rating)}
                                  size="md"
                                />
                                <Badge variant="outline" className="px-2 py-1 text-xs">
                                  {goalAssessment.rating}/5 - {getRatingLabel(goalAssessment.rating)}
                                </Badge>
                              </div>
                            </div>

                            <div>
                              <label htmlFor={`goal-reflection-${goal.id}`} className="block text-sm font-medium text-foreground mb-2">
                                Your Reflection
                              </label>
                              <textarea
                                id={`goal-reflection-${goal.id}`}
                                value={goalAssessment.reflection}
                                onChange={(e) => updateGoalAssessment(goal.id, 'reflection', e.target.value)}
                                rows={4}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                placeholder="Describe what you achieved, challenges faced, and how you performed against this goal..."
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Behaviors Self-Assessment */}
            {behaviors && behaviors.length > 0 && (
              <div className="space-y-6">
                <div className="border-b border-border pb-2">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-pdr-endyear" />
                    Values & Behaviors Self-Assessment ({behaviors.length} values)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reflect on how well you demonstrated each company value throughout the year
                  </p>
                </div>

                {behaviors.map((behavior, index) => {
                  // Use valueId as the unique identifier for state management
                  const behaviorUniqueId = behavior.valueId;
                  const behaviorAssessment = behaviorSelfAssessments[behaviorUniqueId] || { rating: 1, reflection: '' };
                  const companyValue = companyValues.find(v => v.id === behavior.valueId);
                  const ceoBehaviorFeedback = ceoFeedbackData.behaviors[behavior.valueId] || {};
                  const midYearBehaviorComment = midYearComments.behaviors[behavior.valueId] || '';
                  
                  // Check if this is one of the special informational-only behaviors
                  const isInformationalOnly = 
                    companyValue?.name === 'Self Reflection' || 
                    companyValue?.name === 'CodeFish 3D - Deep Dive Development';

                  return (
                    <Card key={behaviorUniqueId} className={`border-l-4 ${isInformationalOnly ? 'border-l-status-info' : 'border-l-pdr-endyear'}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-base">{companyValue?.name}</CardTitle>
                              {isInformationalOnly && (
                                <Badge variant="outline" className="text-xs bg-status-info/10 text-status-info">
                                  Informational Only
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="mt-1 text-sm">
                              {companyValue?.description}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="ml-4 shrink-0">
                            Value {index + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Side - Historical Information */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                              Historical Context
                            </h4>
                            
                            {/* Your Original Plan */}
                            <div className="bg-muted/30 p-3 rounded-md">
                              <h5 className="text-xs font-medium text-foreground mb-1">Your Original Plan</h5>
                              <p className="text-xs text-foreground leading-relaxed">{behavior.description}</p>
                              {behavior.examples && (
                                <div className="mt-2 pt-2 border-t border-muted">
                                  <span className="text-xs font-medium text-muted-foreground">Examples: </span>
                                  <span className="text-xs text-foreground">{behavior.examples}</span>
                                </div>
                              )}
                            </div>

                            {/* CEO Comments */}
                            {ceoBehaviorFeedback.description && (
                              <div className="bg-status-info/10 p-3 rounded-md border border-status-info/20">
                                <h5 className="text-xs font-medium text-foreground mb-1">CEO Comments</h5>
                                <p className="text-xs text-foreground leading-relaxed">{ceoBehaviorFeedback.description}</p>
                              </div>
                            )}

                            {/* Mid-Year Check-in */}
                            {midYearBehaviorComment && (
                              <div className="bg-pdr-midyear/10 p-3 rounded-md border border-pdr-midyear/20">
                                <h5 className="text-xs font-medium text-foreground mb-1">Mid-Year Check-in</h5>
                                <p className="text-xs text-foreground leading-relaxed">{midYearBehaviorComment}</p>
                              </div>
                            )}
                          </div>

                          {/* Right Side - Self-Assessment Inputs */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                              Your Self-Assessment
                            </h4>
                            
                            {/* Show rating input only for standard values, not informational ones */}
                            {!isInformationalOnly && (
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Self-Rating
                                </label>
                                <div className="flex items-center gap-3">
                                  <RatingInput
                                    value={behaviorAssessment.rating}
                                    onChange={(rating) => updateBehaviorAssessment(behaviorUniqueId, 'rating', rating)}
                                    size="md"
                                  />
                                  <Badge variant="outline" className="px-2 py-1 text-xs">
                                    {behaviorAssessment.rating}/5 - {getRatingLabel(behaviorAssessment.rating)}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            <div>
                              <label htmlFor={`behavior-reflection-${behaviorUniqueId}`} className="block text-sm font-medium text-foreground mb-2">
                                Your Reflection
                              </label>
                              <textarea
                                id={`behavior-reflection-${behaviorUniqueId}`}
                                value={behaviorAssessment.reflection}
                                onChange={(e) => updateBehaviorAssessment(behaviorUniqueId, 'reflection', e.target.value)}
                                rows={4}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                placeholder="Describe how you demonstrated this value, specific examples, and areas for improvement..."
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Overall Reflection */}
            <div className="space-y-6">
              <div className="border-b border-border pb-2">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-pdr-endyear" />
                  Overall Reflection
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Provide your overall thoughts on the year and feedback for your manager
                </p>
              </div>

            {/* Achievements Summary */}
            <div>
                <label htmlFor="achievementsSummary" className="block text-sm font-medium text-foreground mb-1">
                  Key Achievements Summary *
              </label>
                <p className="text-xs text-muted-foreground mb-2">
                Highlight your most significant accomplishments this year
              </p>
              <textarea
                id="achievementsSummary"
                {...register('achievementsSummary')}
                rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe your key achievements, successes, and contributions this year..."
              />
              {errors.achievementsSummary && (
                  <p className="mt-1 text-sm text-destructive">{errors.achievementsSummary.message}</p>
              )}
            </div>

            {/* Learning & Growth */}
            <div>
                <label htmlFor="learningsGrowth" className="block text-sm font-medium text-foreground mb-1">
                Learning & Growth
              </label>
                <p className="text-xs text-muted-foreground mb-2">
                What new skills or knowledge have you gained?
              </p>
              <textarea
                id="learningsGrowth"
                {...register('learningsGrowth')}
                rows={3}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe the skills, knowledge, or capabilities you've developed..."
              />
              {errors.learningsGrowth && (
                  <p className="mt-1 text-sm text-destructive">{errors.learningsGrowth.message}</p>
              )}
            </div>

              {/* CEO Feedback */}
            <div>
                <label htmlFor="ceoFeedback" className="block text-sm font-medium text-foreground mb-1">
                  Feedback for Your Manager
              </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Share feedback about your manager's performance, support, and direction of CodeFish Studio
              </p>
              <textarea
                  id="ceoFeedback"
                  value={ceoFeedback}
                  onChange={(e) => updateCeoFeedback(e.target.value)}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Provide constructive feedback about leadership, support, communication, and overall direction..."
                />
            </div>

            {/* Overall Self-Rating */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                Overall Self-Rating
              </label>
                <p className="text-xs text-muted-foreground mb-3">
                How would you rate your overall performance this year?
              </p>
              <div className="flex items-center space-x-4">
                <RatingInput
                  value={employeeOverallRating || 0}
                  onChange={handleRatingChange}
                  showLabel
                  size="lg"
                />
                {employeeOverallRating && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                      {employeeOverallRating}/5 - {getRatingLabel(employeeOverallRating)}
                  </Badge>
                )}
              </div>
                <div className="mt-2 text-xs text-muted-foreground">
                <div className="grid grid-cols-5 gap-1 text-center">
                    <span>Did not<br/>achieve</span>
                    <span>Partial - Needs<br/>Improvement</span>
                    <span>Met<br/>Expectations</span>
                    <span>Exceeded<br/>Expectations</span>
                    <span>Outstanding<br/>Outcomes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              {(canEdit || canUpdate) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={!isDirty}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-pdr-endyear hover:bg-pdr-endyear/90 text-pdr-endyear-foreground"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit for Final Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mid-Year
        </Button>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <PartyPopper className="h-12 w-12 text-pdr-endyear mx-auto mb-4" />
              <CardTitle className="text-pdr-completed">Thank You!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-2">
                Thank you for taking the time to complete your End-Year Self-Assessment.
              </p>
              <p className="text-muted-foreground mb-4">
                Your thoughtful reflections and self-evaluation will help guide your performance review discussion.
              </p>
              <div className="bg-pdr-completed/10 border border-pdr-completed/20 p-3 rounded-lg mb-4">
                <h4 className="font-medium text-pdr-completed mb-1">Status: Complete - Pending Final Review Meeting</h4>
                <ul className="text-sm text-pdr-completed/80 space-y-1">
                  <li>• Your PDR is now ready for manager review</li>
                  <li>• A final review meeting will be scheduled</li>
                  <li>• You'll receive final ratings and development feedback</li>
                </ul>
              </div>
              <Button
                onClick={handleCompletionConfirm}
                className="w-full bg-pdr-completed hover:bg-pdr-completed/90 text-pdr-completed-foreground"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
