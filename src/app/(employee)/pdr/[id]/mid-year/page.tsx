'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDemoPDR } from '@/hooks/use-demo-pdr';
import { midYearReviewSchema } from '@/lib/validations';
import { MidYearFormData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Send,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  MessageSquare
} from 'lucide-react';

interface MidYearPageProps {
  params: { id: string };
}

export default function MidYearPage({ params }: MidYearPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading, updatePdr } = useDemoPDR(params.id);

  const isLoading = pdrLoading;
  const canEdit = pdr && !pdr.isLocked && pdr.status === 'SUBMITTED';
  const canUpdate = pdr && !pdr.isLocked;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<MidYearFormData>({
    resolver: zodResolver(midYearReviewSchema),
    defaultValues: {
      progressSummary: '',
      blockersChallenges: '',
      supportNeeded: '',
      employeeComments: '',
    },
  });

  const handlePrevious = () => {
    router.push(`/pdr/${params.id}/review`);
  };

  const handleNext = () => {
    router.push(`/pdr/${params.id}/end-year`);
  };

  const onSubmit = async (data: MidYearFormData) => {
    setIsSubmitting(true);
    try {
      // For demo mode, simulate submission by updating PDR state
      updatePdr({
        currentStep: 5,
        status: 'UNDER_REVIEW',
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to next step after successful submission
      router.push(`/pdr/${params.id}/end-year`);
    } catch (error) {
      console.error('Failed to submit mid-year review:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    // For demo mode, just show a simple feedback
    console.log('Draft saved (demo mode)');
    // TODO: Show success toast
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

  // Skip read-only view in demo mode
  if (false) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <Calendar className="h-7 w-7 mr-3 text-green-400" />
              Mid-Year Check-In
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Review your progress and reflect on the first half of the year
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            Completed
          </Badge>
        </div>

        {/* Review Content */}
        <Card>
          <CardHeader>
            <CardTitle>Your Mid-Year Reflection</CardTitle>
            <p className="text-sm text-gray-600">
              Submitted on {new Date(midYearReview.submittedAt).toLocaleDateString('en-AU')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-base">Progress Summary</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{midYearReview.progressSummary}</p>
            </div>

            {midYearReview.blockersChallenges && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base">Blockers & Challenges</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{midYearReview.blockersChallenges}</p>
              </div>
            )}

            {midYearReview.supportNeeded && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base">Support Needed</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{midYearReview.supportNeeded}</p>
              </div>
            )}

            {midYearReview.employeeComments && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base">Additional Comments</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{midYearReview.employeeComments}</p>
              </div>
            )}

            {midYearReview.ceoFeedback && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Manager Feedback
                </h4>
                <p className="text-blue-700 whitespace-pre-wrap">{midYearReview.ceoFeedback}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button onClick={handlePrevious} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Review
          </Button>
          <Button onClick={handleNext}>
            Continue to End-Year
            <ArrowRight className="h-4 w-4 ml-2" />
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
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calendar className="h-7 w-7 mr-3 text-green-400" />
            Mid-Year Check-In
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Reflect on your progress and identify areas for support
          </p>
        </div>
        <Badge variant="outline" className="flex items-center">
          <FileText className="h-4 w-4 mr-1" />
          New Review
        </Badge>
      </div>

      {/* Instructions */}
      {true && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Mid-Year Reflection
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Take a moment to reflect on your progress so far. This is an opportunity to 
                  celebrate achievements, identify challenges, and get the support you need.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      <Card>
        <CardHeader>
          <CardTitle>Mid-Year Reflection</CardTitle>
          <p className="text-sm text-gray-600">
            Share your thoughts on progress, challenges, and support needs
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Progress Summary */}
            <div>
              <label htmlFor="progressSummary" className="block text-sm font-medium text-gray-700 mb-1">
                Progress Summary *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Summarize your key achievements and progress toward your goals
              </p>
              <textarea
                id="progressSummary"
                {...register('progressSummary')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the progress you've made on your goals and key accomplishments..."
              />
              {errors.progressSummary && (
                <p className="mt-1 text-sm text-red-600">{errors.progressSummary.message}</p>
              )}
            </div>

            {/* Blockers & Challenges */}
            <div>
              <label htmlFor="blockersChallenges" className="block text-sm font-medium text-gray-700 mb-1">
                Blockers & Challenges
              </label>
              <p className="text-xs text-gray-500 mb-2">
                What obstacles or challenges have you encountered?
              </p>
              <textarea
                id="blockersChallenges"
                {...register('blockersChallenges')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe any blockers, challenges, or obstacles you've faced..."
              />
              {errors.blockersChallenges && (
                <p className="mt-1 text-sm text-red-600">{errors.blockersChallenges.message}</p>
              )}
            </div>

            {/* Support Needed */}
            <div>
              <label htmlFor="supportNeeded" className="block text-sm font-medium text-gray-700 mb-1">
                Support Needed
              </label>
              <p className="text-xs text-gray-500 mb-2">
                What support or resources would help you succeed?
              </p>
              <textarea
                id="supportNeeded"
                {...register('supportNeeded')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What support, resources, or assistance would be most helpful..."
              />
              {errors.supportNeeded && (
                <p className="mt-1 text-sm text-red-600">{errors.supportNeeded.message}</p>
              )}
            </div>

            {/* Additional Comments */}
            <div>
              <label htmlFor="employeeComments" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Comments
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Any other thoughts or feedback you'd like to share
              </p>
              <textarea
                id="employeeComments"
                {...register('employeeComments')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Share any additional thoughts, concerns, or feedback..."
              />
              {errors.employeeComments && (
                <p className="mt-1 text-sm text-red-600">{errors.employeeComments.message}</p>
              )}
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
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review
        </Button>
      </div>
    </div>
  );
}
