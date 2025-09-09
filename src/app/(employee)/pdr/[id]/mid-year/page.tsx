'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabasePDR, useSupabasePDRGoals } from '@/hooks/use-supabase-pdrs';
import { midYearReviewSchema } from '@/lib/validations';
import { MidYearFormData } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBlockingModal } from '@/components/ui/status-blocking-modal';
import { 
  ArrowLeft, 
  Save, 
  Send,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronRight,
  User,
  Lock
} from 'lucide-react';

interface MidYearPageProps {
  params: { id: string };
}

export default function MidYearPage({ params }: MidYearPageProps) {
  const router = useRouter();
  
  // Add global helper for debugging localStorage
  useEffect(() => {
    (window as any).checkMidYearData = () => {
      const data = localStorage.getItem(`demo_midyear_${params.id}`);
      console.log('📋 Mid-year data check:', data ? JSON.parse(data) : 'No data found');
      return data ? JSON.parse(data) : null;
    };
  }, [params.id]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());
  const [existingReviewData, setExistingReviewData] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showAccessDeniedView, setShowAccessDeniedView] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading } = useSupabasePDR(params.id);
  const { data: goals, isLoading: goalsLoading } = useSupabasePDRGoals(params.id);
  
  // Initialize form
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    reset,
    formState: { errors, isDirty } 
  } = useForm<MidYearFormData>({
    resolver: zodResolver(midYearReviewSchema),
    defaultValues: {
      progressSummary: existingReviewData?.progressSummary || '',
      blockersChallenges: existingReviewData?.blockersChallenges || '',
      supportNeeded: existingReviewData?.supportNeeded || '',
      employeeComments: existingReviewData?.employeeComments || '',
    }
  });

  const isLoading = pdrLoading || goalsLoading;

  // Load draft data on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for existing draft
      const draftData = localStorage.getItem(`mid_year_draft_${params.id}`);
      
      if (draftData) {
        try {
          const parsed = JSON.parse(draftData);
          // Load draft data into form
          reset({
            progressSummary: parsed.progressSummary || '',
            blockersChallenges: parsed.blockersChallenges || '',
            supportNeeded: parsed.supportNeeded || '',
            employeeComments: parsed.employeeComments || '',
          });
          
          toast({
            title: "📝 Draft Loaded",
            description: "Your previously saved draft has been loaded.",
            variant: "default",
          });
        } catch (error) {
          console.error('Failed to load draft data:', error);
        }
      }
      
      // Check for existing submitted review
      const existingReview = localStorage.getItem(`demo_midyear_${params.id}`);
      if (existingReview) {
        try {
          const parsed = JSON.parse(existingReview);
          if (parsed.status === 'SUBMITTED' || parsed.status === 'OPEN_FOR_REVIEW') {
            // Clear the old submitted data to allow new submission
            localStorage.removeItem(`demo_midyear_${params.id}`);
            localStorage.removeItem(`mid_year_review_${params.id}`);
          }
        } catch (error) {
          console.error('Failed to load existing review data:', error);
        }
      }
    }
  }, [params.id, reset]);



  // Utility functions
  const getCeoFeedbackData = () => {
    if (typeof window === 'undefined') return { goals: {}, behaviors: {} };
    
    const ceoGoalFeedback = localStorage.getItem(`ceo_goal_feedback_${params.id}`);
    const ceoBehaviorFeedback = localStorage.getItem(`ceo_behavior_feedback_${params.id}`);
    
    return {
      goals: ceoGoalFeedback ? JSON.parse(ceoGoalFeedback) : {},
      behaviors: ceoBehaviorFeedback ? JSON.parse(ceoBehaviorFeedback) : {},
    };
  };

  const getEmployeeBehaviorData = () => {
    if (typeof window === 'undefined') return {};
    const employeeBehaviors = localStorage.getItem(`demo_behaviors_${params.id}`);
    if (employeeBehaviors) {
      try {
        const behaviorsArray = JSON.parse(employeeBehaviors);
        const behaviorsMap: { [key: string]: any } = {};
        behaviorsArray.forEach((behavior: any) => {
          behaviorsMap[behavior.valueId] = behavior;
        });
        return behaviorsMap;
      } catch (error) {
        console.error('Error parsing employee behaviors:', error);
        return {};
      }
    }
    return {};
  };

  const ceoFeedback = getCeoFeedbackData();
  const employeeBehaviors = getEmployeeBehaviorData();

  // Toggle functions
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const toggleBehavior = (behaviorId: string) => {
    const newExpanded = new Set(expandedBehaviors);
    if (newExpanded.has(behaviorId)) {
      newExpanded.delete(behaviorId);
    } else {
      newExpanded.add(behaviorId);
    }
    setExpandedBehaviors(newExpanded);
  };

  // Form handlers
  const onSubmit = async (data: MidYearFormData) => {
    setIsSubmitting(true);
    try {
      // Call the actual Supabase API
      const response = await fetch(`/api/pdrs/${params.id}/mid-year`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progressSummary: data.progressSummary,
          blockersChallenges: data.blockersChallenges,
          supportNeeded: data.supportNeeded,
          employeeComments: data.employeeComments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if this is a status blocking error
        if (response.status === 400 && errorData.code === 'INVALID_STATUS') {
          setShowStatusModal(true);
          return; // Don't throw error, just show modal
        }
        
        throw new Error(errorData.error || 'Failed to submit mid-year review');
      }

      const result = await response.json();
      console.log('✅ Mid-year review submitted successfully:', result);

      // Invalidate React Query cache to refresh dashboard
      if (typeof window !== 'undefined') {
        // Trigger cache invalidation for dashboard
        window.dispatchEvent(new CustomEvent('pdr-updated', { 
          detail: { pdrId: params.id, step: 5, status: 'MID_YEAR_CHECK' } 
        }));
      }

      // Clear any draft data
      localStorage.removeItem(`mid_year_draft_${params.id}`);
      
      // Show success message
      toast({
        title: "✅ Mid-Year Review Submitted",
        description: "Your mid-year check-in has been saved successfully! Moving to the end-year review phase.",
        variant: "default",
      });
      
      // Navigate to end-year review
      router.push(`/pdr/${params.id}/end-year`);
    } catch (error) {
      console.error('❌ Failed to submit mid-year review:', error);
      
      // Show error message
      toast({
        title: "❌ Submission Failed",
        description: error instanceof Error ? error.message : "There was an error submitting your mid-year review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const formData = watch();
      const draftData = {
        ...formData,
        lastSaved: new Date().toISOString(),
        pdrId: params.id
      };
      
      localStorage.setItem(`mid_year_draft_${params.id}`, JSON.stringify(draftData));
      
      // Show success toast
      toast({
        title: "💾 Draft Saved",
        description: "Your progress has been saved as a draft.",
        variant: "default",
      });
      

    } catch (error) {
      console.error('Failed to save mid-year review draft:', error);
      
      // Show error toast
      toast({
        title: "❌ Save Failed",
        description: "There was an error saving your draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    router.push(`/pdr/${params.id}/review`);
  };

  // Mid-year should be editable once initial PDR is submitted (OPEN_FOR_REVIEW or later stages)
  const canEdit = pdr && !pdr.isLocked && pdr.status !== 'Created' && pdr.status !== 'DRAFT';
  const canUpdate = pdr && !pdr.isLocked;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calendar className="h-7 w-7 mr-3 text-green-400" />
            Mid-Year Check-In
          </h1>
          <p className="text-muted-foreground mt-2">
            Reflect on your progress and identify areas for support
          </p>
        </div>
        <Badge variant="outline" className="flex items-center">
          <FileText className="h-4 w-4 mr-1" />
          New Review
        </Badge>
      </div>

      {/* Instructions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-foreground">
                Mid-Year Reflection
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Take a moment to reflect on your progress so far. This is an opportunity to 
                celebrate achievements, identify challenges, and get the support you need.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Enhanced Mid-Year Reflection Form */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Mid-Year Reflection</h2>
              <p className="text-sm text-muted-foreground">Share your thoughts on progress, challenges, and support needs</p>
            </div>
          </div>

          <Card className="border-l-4 border-l-green-500/50">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Progress Summary */}
                <div className="space-y-4 p-6 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="progressSummary" className="text-base font-semibold text-foreground">
                        Progress Summary *
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Summarize your key achievements and progress toward your goals
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="progressSummary"
                    {...register('progressSummary')}
                    rows={4}
                    className="border-green-200 dark:border-green-800 focus:border-green-500 focus:ring-green-500/20"
                    placeholder="Describe the progress you've made on your goals and key accomplishments..."
                  />
                  {errors.progressSummary && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.progressSummary.message}
                    </p>
                  )}
                </div>

                {/* Blockers & Challenges */}
                <div className="space-y-4 p-6 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="blockersChallenges" className="text-base font-semibold text-foreground">
                        Blockers & Challenges
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        What obstacles or challenges have you encountered?
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="blockersChallenges"
                    {...register('blockersChallenges')}
                    rows={3}
                    className="border-orange-200 dark:border-orange-800 focus:border-orange-500 focus:ring-orange-500/20"
                    placeholder="Describe any blockers, challenges, or obstacles you've faced..."
                  />
                  {errors.blockersChallenges && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.blockersChallenges.message}
                    </p>
                  )}
                </div>

                {/* Support Needed */}
                <div className="space-y-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="supportNeeded" className="text-base font-semibold text-foreground">
                        Support Needed
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        What support or resources would help you succeed?
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="supportNeeded"
                    {...register('supportNeeded')}
                    rows={3}
                    className="border-blue-200 dark:border-blue-800 focus:border-blue-500 focus:ring-blue-500/20"
                    placeholder="What support, resources, or assistance would be most helpful..."
                  />
                  {errors.supportNeeded && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.supportNeeded.message}
                    </p>
                  )}
                </div>

                {/* Additional Comments */}
                <div className="space-y-4 p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="employeeComments" className="text-base font-semibold text-foreground">
                        Additional Comments
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Any other thoughts or feedback you'd like to share
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="employeeComments"
                    {...register('employeeComments')}
                    rows={3}
                    className="border-purple-200 dark:border-purple-800 focus:border-purple-500 focus:ring-purple-500/20"
                    placeholder="Share any additional thoughts, concerns, or feedback..."
                  />
                  {errors.employeeComments && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.employeeComments.message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                  <div className="flex-1">
                    {(canEdit || canUpdate) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={!isDirty}
                        className="w-full sm:w-auto"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Draft
                      </Button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}

                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto px-8"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button onClick={handlePrevious} variant="outline" className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Review</span>
        </Button>
        <div className="text-sm text-muted-foreground">
          Step 4 of 5 - Mid-Year Check-In
        </div>
      </div>

      {/* Status Blocking Modal */}
      <StatusBlockingModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        currentStatus={pdr?.status || 'UNKNOWN'}
        requiredStatus="PLAN_LOCKED"
        title="CEO Approval Required"
        description="Your PDR has been submitted and is waiting for your manager's approval and plan lock-in before you can proceed to the mid-year check-in."
        nextSteps={[
          "Your manager will review your submitted PDR",
          "Once approved, your manager will lock in your plan for the year",
          "Your PDR status will be updated to 'Plan Locked'",
          "You'll then be able to access the mid-year check-in",
          "You'll receive a notification when this happens"
        ]}
        actionButton={{
          label: "Return to Dashboard",
          onClick: () => router.push('/dashboard')
        }}
      />
    </div>
  );
}
