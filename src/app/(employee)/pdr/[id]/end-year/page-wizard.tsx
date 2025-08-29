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
  ArrowRight,
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
  
  // State for step-by-step card wizard
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardSteps, setWizardSteps] = useState<Array<{ type: string; id?: string }>>([]);
  
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
  
  // Initialize wizard steps when data is loaded
  useEffect(() => {
    if (goals && companyValues) {
      const steps = calculateWizardSteps();
      setWizardSteps(steps);
    }
  }, [goals, companyValues]);
  
  // Calculate total steps after data is loaded
  const calculateWizardSteps = () => {
    const steps = [];
    
    // Individual goal cards (if any)
    if (goals && goals.length) {
      goals.forEach(goal => {
        steps.push({ type: 'goal', id: goal.id });
      });
    }
    
    // Individual behavior cards (if any)
    if (companyValues && companyValues.length) {
      companyValues.filter(value => {
        // Filter out Self Reflection and CodeFish 3D from the main map
        const isSelfReflection = value.id === '550e8400-e29b-41d4-a716-446655440005';
        const isCodeFish3D = value.id === '550e8400-e29b-41d4-a716-446655440006';
        return !isSelfReflection && !isCodeFish3D;
      }).forEach(value => {
        steps.push({ type: 'behavior', id: value.id });
      });
    }
    
    // Overall reflection card (always present)
    steps.push({ type: 'reflection' });
    
    return steps;
  };

  // Function to get mid-year review comments
  const getMidYearComments = () => {
    const midYearReview = localStorage.getItem(`mid_year_review_${params.id}`);
    if (!midYearReview) return { progressSummary: '', blockersChallenges: '', supportNeeded: '' };
    try {
      const parsed = JSON.parse(midYearReview);
      return {
        progressSummary: parsed.progressSummary || '',
        blockersChallenges: parsed.blockersChallenges || '',
        supportNeeded: parsed.supportNeeded || '',
      };
    } catch (error) {
      console.error('Error parsing mid-year review:', error);
      return { progressSummary: '', blockersChallenges: '', supportNeeded: '' };
    }
  };

  // Get CEO feedback data (if any)
  const getCeoFeedbackData = () => {
    const goalFeedback = localStorage.getItem(`ceo_goal_feedback_${params.id}`);
    const behaviorFeedback = localStorage.getItem(`ceo_behavior_feedback_${params.id}`);
    
    return {
      goals: goalFeedback ? JSON.parse(goalFeedback) : {},
      behaviors: behaviorFeedback ? JSON.parse(behaviorFeedback) : {},
    };
  };

  // Form setup
  const midYearComments = getMidYearComments();
  const ceoFeedbackData = getCeoFeedbackData();

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
      ['employeeOverallRating', endYearReview.employeeOverallRating || 0],
    ]) : {
      achievementsSummary: '',
      learningsGrowth: '',
      challengesFaced: '',
      nextYearGoals: '',
      employeeOverallRating: 0,
    },
  });

  const employeeOverallRating = watch('employeeOverallRating');

  const handlePrevious = () => {
    if (currentStep === 0) {
      router.push(`/pdr/${params.id}/mid-year`);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleRatingChange = (rating: number) => {
    setValue('employeeOverallRating', rating, { shouldDirty: true });
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Did not achieve';
      case 2: return 'Partially achieved';
      case 3: return 'Met expectations';
      case 4: return 'Exceeded expectations';
      case 5: return 'Outstanding';
      default: return '';
    }
  };

  const handleSaveDraft = () => {
    // Get all form data as a draft
    const formData = watch();
    
    // Store as draft
    localStorage.setItem(`end_year_review_draft_${params.id}`, JSON.stringify({
      ...formData,
      lastSaved: new Date().toISOString(),
    }));
    
    toast({
      title: "Draft saved",
      description: "Your end-year review has been saved as a draft.",
    });
  };

  // Function to render the current step
  const renderCurrentStep = () => {
    if (!wizardSteps.length || wizardSteps.length <= currentStep) {
      return null;
    }
    
    const step = wizardSteps[currentStep];
    
    switch(step.type) {
      case 'goal':
        // Render a specific goal card
        const goal = goals?.find(g => g.id === step.id);
        if (!goal) return null;
        
        const goalAssessment = goalSelfAssessments[goal.id] || { rating: 1, reflection: '' };
        const ceoGoalFeedback = ceoFeedbackData.goals[goal.id] || {};
        const midYearGoalComment = midYearComments.goals ? midYearComments.goals[goal.id] || '' : '';
        
        return (
          <div className="space-y-6">
            <div className="border-b border-border pb-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-pdr-endyear" />
                Goal Self-Assessment
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Reflect on your performance against this goal
              </p>
            </div>
            
            <Card key={goal.id} className="border-l-4 border-l-pdr-endyear">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {goal.description}
                    </CardDescription>
                  </div>
                  <Badge className="ml-4 shrink-0">Goal {currentStep + 1}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                      Historical Context
                    </h4>
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
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                      Your Self-Assessment
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Self-Rating</label>
                      <div className="flex items-center gap-3">
                        <RatingInput
                          value={goalAssessment.rating}
                          onChange={(rating) => {
                            const updatedAssessments = {
                              ...goalSelfAssessments,
                              [goal.id]: {
                                ...goalSelfAssessments[goal.id],
                                rating,
                              }
                            };
                            setGoalSelfAssessments(updatedAssessments);
                            localStorage.setItem(
                              `end_year_goal_assessments_${params.id}`,
                              JSON.stringify(updatedAssessments)
                            );
                          }}
                          disabled={!canEdit && !canUpdate}
                        />
                        {goalAssessment.rating && (
                          <Badge className="px-2 py-1 text-xs">
                            {goalAssessment.rating}/5 - {getRatingLabel(goalAssessment.rating)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label
                        htmlFor={`goal-reflection-${goal.id}`}
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Your Reflection
                      </label>
                      <textarea
                        id={`goal-reflection-${goal.id}`}
                        rows={4}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        placeholder="Describe what you achieved, challenges faced, and how you performed against this goal..."
                        value={goalAssessment.reflection || ''}
                        onChange={(e) => {
                          const updatedAssessments = {
                            ...goalSelfAssessments,
                            [goal.id]: {
                              ...goalSelfAssessments[goal.id] || { rating: 1 },
                              reflection: e.target.value,
                            }
                          };
                          setGoalSelfAssessments(updatedAssessments);
                          localStorage.setItem(
                            `end_year_goal_assessments_${params.id}`,
                            JSON.stringify(updatedAssessments)
                          );
                        }}
                        disabled={!canEdit && !canUpdate}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'behavior':
        // Render a specific behavior card
        const value = companyValues?.find(v => v.id === step.id);
        if (!value) return null;
        
        const behavior = behaviors?.find(b => b.valueId === value.id);
        const behaviorAssessment = behaviorSelfAssessments[value.id] || { rating: 1, reflection: '' };
        const ceoBehaviorFeedback = ceoFeedbackData.behaviors[value.id] || {};
        
        return (
          <div className="space-y-6">
            <div className="border-b border-border pb-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-pdr-endyear" />
                Value & Behavior Self-Assessment
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Reflect on how well you demonstrated this company value throughout the year
              </p>
            </div>
            
            <Card className="border-l-4 border-l-pdr-endyear">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-base">{value.name}</CardTitle>
                    </div>
                    <CardDescription className="mt-1 text-sm">
                      {value.description}
                    </CardDescription>
                  </div>
                  <Badge className="ml-4 shrink-0">Value {currentStep + 1 - (goals?.length || 0)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                      Historical Context
                    </h4>
                    <div className="bg-muted/30 p-3 rounded-md">
                      <h5 className="text-xs font-medium text-foreground mb-1">Your Original Plan</h5>
                      <p className="text-xs text-foreground leading-relaxed">{behavior?.description || 'No response provided'}</p>
                    </div>
                    
                    {ceoBehaviorFeedback.comments && (
                      <div className="bg-status-info/10 p-3 rounded-md border border-status-info/20">
                        <h5 className="text-xs font-medium text-foreground mb-1">CEO Comments</h5>
                        <p className="text-xs text-foreground leading-relaxed">{ceoBehaviorFeedback.comments}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                      Your Self-Assessment
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Self-Rating</label>
                      <div className="flex items-center gap-3">
                        <RatingInput
                          value={behaviorAssessment.rating}
                          onChange={(rating) => {
                            const updatedAssessments = {
                              ...behaviorSelfAssessments,
                              [value.id]: {
                                ...behaviorSelfAssessments[value.id],
                                rating,
                              }
                            };
                            setBehaviorSelfAssessments(updatedAssessments);
                            localStorage.setItem(
                              `end_year_behavior_assessments_${params.id}`,
                              JSON.stringify(updatedAssessments)
                            );
                          }}
                          disabled={!canEdit && !canUpdate}
                        />
                        {behaviorAssessment.rating && (
                          <Badge className="px-2 py-1 text-xs">
                            {behaviorAssessment.rating}/5 - {getRatingLabel(behaviorAssessment.rating)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label
                        htmlFor={`behavior-reflection-${value.id}`}
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Your Reflection
                      </label>
                      <textarea
                        id={`behavior-reflection-${value.id}`}
                        rows={4}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        placeholder="Describe how you demonstrated this value, specific examples, and areas for improvement..."
                        value={behaviorAssessment.reflection || ''}
                        onChange={(e) => {
                          const updatedAssessments = {
                            ...behaviorSelfAssessments,
                            [value.id]: {
                              ...behaviorSelfAssessments[value.id] || { rating: 1 },
                              reflection: e.target.value,
                            }
                          };
                          setBehaviorSelfAssessments(updatedAssessments);
                          localStorage.setItem(
                            `end_year_behavior_assessments_${params.id}`,
                            JSON.stringify(updatedAssessments)
                          );
                        }}
                        disabled={!canEdit && !canUpdate}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'reflection':
        // Render overall reflection section
        return (
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
                <p className="text-destructive text-sm mt-1">{errors.achievementsSummary.message}</p>
              )}
            </div>
            
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
            </div>
            
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
                onChange={(e) => {
                  setCeoFeedback(e.target.value);
                  localStorage.setItem(`end_year_ceo_feedback_${params.id}`, e.target.value);
                }}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Provide constructive feedback about leadership, support, communication, and overall direction..."
                disabled={!canEdit && !canUpdate}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Overall Self-Rating</label>
              <p className="text-xs text-muted-foreground mb-3">
                How would you rate your overall performance this year?
              </p>
              <div className="flex items-center space-x-4">
                <RatingInput
                  value={employeeOverallRating || 0}
                  onChange={handleRatingChange}
                  disabled={!canEdit && !canUpdate}
                  size="lg"
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <div className="grid grid-cols-5 gap-1 text-center">
                  <span>Did not<br />achieve</span>
                  <span>Partial - Needs<br />Improvement</span>
                  <span>Met<br />Expectations</span>
                  <span>Exceeded<br />Expectations</span>
                  <span>Outstanding<br />Outcomes</span>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
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

        // Store updated PDR
        localStorage.setItem(`demo_pdr_${pdr.id}`, JSON.stringify(updatedPdr));
        localStorage.setItem('demo_current_pdr', JSON.stringify(updatedPdr));
        
        // Trigger update event
        window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
        
        // Update the store
        updatePdr({
          status: 'SUBMITTED_FOR_REVIEW',
          currentStep: 5,
          submittedAt: new Date(),
          isCompleted: true
        });
      }

      // Store all form data in localStorage for future reference
      const formData = watch();
      localStorage.setItem(`end_year_review_submitted_${params.id}`, JSON.stringify({
        ...formData,
        submittedAt: new Date().toISOString()
      }));

      // Show success modal/message
      setShowCompletionModal(true);
      
      // Simulate submission delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Redirect to dashboard after successful submission
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to submit end-year review:', error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "An error occurred while submitting your review. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
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

  // Read-only view if the review has already been submitted
  if (endYearReview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-pdr-endyear" />
            End-Year Review
          </h1>
          <Badge variant="outline" className="bg-pdr-completed/10 text-pdr-completed border-pdr-completed/30">
            <CheckCircle className="h-4 w-4 mr-2 text-pdr-completed" />
            Submitted
          </Badge>
        </div>

        <Card className="border-pdr-completed/20 bg-pdr-completed/5">
          <CardContent className="py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-white">
                  Final Assessment
                </h3>
                <p className="text-sm text-white mt-1">
                  This is your final review for this period. Take time to celebrate your achievements, 
                  reflect on your growth, and set intentions for the year ahead.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form view for creating/editing end year review
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-pdr-endyear" />
            End-Year Review
          </h1>
          <p className="text-muted-foreground mt-1">
            Reflect on your achievements, learning, and future goals
          </p>
        </div>
        {canEdit && !endYearReview && (
          <Badge variant="outline" className="bg-pdr-endyear/10 text-pdr-endyear border-pdr-endyear/30">
            <FileText className="h-4 w-4 mr-2 text-pdr-endyear" />
            New Self-Assessment
          </Badge>
        )}
      </div>

      {!endYearReview && (
        <Card className="border-pdr-endyear/20 bg-pdr-endyear/10">
          <CardContent className="py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-white">
                  Final Assessment
                </h3>
                <p className="text-sm text-white mt-1">
                  This is your final review for this period. Take time to celebrate your achievements, 
                  reflect on your growth, and set intentions for the year ahead.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form - Step-by-Step Wizard */}
      <Card>
        <CardHeader>
          {/* Progress indicator */}
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {wizardSteps.length}
            </p>
            <div className="h-2 bg-gray-200 rounded-full w-full max-w-xs ml-4">
              <div 
                className="h-full bg-pdr-endyear rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / wizardSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Render the current step */}
            {renderCurrentStep()}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-8">
              <Button type="button" onClick={handlePrevious} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" /> 
                {currentStep === 0 ? 'Back to Mid-Year' : 'Previous'}
              </Button>
              
              {currentStep < wizardSteps.length - 1 ? (
                <Button type="button" onClick={handleNext} className="bg-pdr-endyear hover:bg-pdr-endyear/90 text-pdr-endyear-foreground">
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting || (endYearReview && !canUpdate)} 
                  className="bg-pdr-endyear hover:bg-pdr-endyear/90 text-pdr-endyear-foreground"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Final Review
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <PartyPopper className="h-12 w-12 text-pdr-endyear mx-auto mb-4" />
              <CardTitle className="text-pdr-completed">Thank You!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {/* End-Year Self-Assessment text removed as requested */}
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
                onClick={() => router.push('/dashboard')}
                className="bg-pdr-completed hover:bg-pdr-completed/90 text-pdr-completed-foreground"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

