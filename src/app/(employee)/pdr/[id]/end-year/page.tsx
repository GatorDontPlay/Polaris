'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePDR } from '@/hooks/use-pdrs';
import { useEndYearReview, useEndYearReviewMutation } from '@/hooks/use-reviews';
import { endYearReviewSchema } from '@/lib/validations';
import { EndYearFormData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RatingInput } from '@/components/pdr/rating-input';
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
  MessageSquare,
  PartyPopper
} from 'lucide-react';

interface EndYearPageProps {
  params: { id: string };
}

export default function EndYearPage({ params }: EndYearPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading } = usePDR(params.id);
  const { data: endYearReview, isLoading: reviewLoading } = useEndYearReview(params.id);
  const { create: createReview, update: updateReview } = useEndYearReviewMutation(params.id);

  const isLoading = pdrLoading || reviewLoading;
  const canEdit = pdr && !pdr.isLocked && !endYearReview;
  const canUpdate = pdr && !pdr.isLocked && endYearReview && pdr.status !== 'COMPLETED';

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

  const onSubmit = async (data: EndYearFormData) => {
    setIsSubmitting(true);
    try {
      if (endYearReview) {
        await updateReview.mutateAsync(data);
      } else {
        await createReview.mutateAsync(data);
      }
      // Show completion modal
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Failed to submit end-year review:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const formData = watch();
    try {
      if (endYearReview) {
        await updateReview.mutateAsync(formData);
      } else {
        await createReview.mutateAsync(formData);
      }
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to save draft:', error);
      // TODO: Show error toast
    }
  };

  const handleCompletionConfirm = () => {
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
              <Trophy className="h-6 w-6 mr-2 text-yellow-600" />
              End-Year Review
            </h1>
            <p className="text-gray-600 mt-1">
              Your final assessment and reflection for this review period
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
            <p className="text-sm text-gray-600">
              Submitted on {new Date(endYearReview.submittedAt).toLocaleDateString('en-AU')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                <Award className="h-4 w-4 mr-2 text-yellow-600" />
                Key Achievements
              </h4>
              <p className="text-gray-700 whitespace-pre-wrap">{endYearReview.achievementsSummary}</p>
            </div>

            {endYearReview.learningsGrowth && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                  <Star className="h-4 w-4 mr-2 text-blue-600" />
                  Learning & Growth
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap">{endYearReview.learningsGrowth}</p>
              </div>
            )}

            {endYearReview.challengesFaced && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-orange-600" />
                  Challenges Faced
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap">{endYearReview.challengesFaced}</p>
              </div>
            )}

            {endYearReview.nextYearGoals && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base flex items-center">
                  <Target className="h-4 w-4 mr-2 text-green-600" />
                  Next Year Goals
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap">{endYearReview.nextYearGoals}</p>
              </div>
            )}

            {endYearReview.ceoFinalComments && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Manager Final Comments
                </h4>
                <p className="text-blue-700 whitespace-pre-wrap">{endYearReview.ceoFinalComments}</p>
                {endYearReview.ceoOverallRating && (
                  <div className="mt-3 flex items-center">
                    <span className="text-sm font-medium text-blue-900 mr-2">Manager Rating:</span>
                    <RatingInput
                      value={endYearReview.ceoOverallRating}
                      onChange={() => {}}
                      disabled
                      size="sm"
                    />
                    <span className="ml-2 text-sm text-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trophy className="h-6 w-6 mr-2 text-yellow-600" />
            End-Year Review
          </h1>
          <p className="text-gray-600 mt-1">
            Reflect on your achievements and plan for the future
          </p>
        </div>
        <Badge variant="outline" className="flex items-center">
          <Star className="h-4 w-4 mr-1" />
          {endYearReview ? 'Update Review' : 'Final Review'}
        </Badge>
      </div>

      {/* Instructions */}
      {!endYearReview && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Final Assessment
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
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
          <p className="text-sm text-gray-600">
            Reflect on your achievements, learning, and future goals
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Achievements Summary */}
            <div>
              <label htmlFor="achievementsSummary" className="block text-sm font-medium text-gray-700 mb-1">
                Key Achievements *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Highlight your most significant accomplishments this year
              </p>
              <textarea
                id="achievementsSummary"
                {...register('achievementsSummary')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your key achievements, successes, and contributions this year..."
              />
              {errors.achievementsSummary && (
                <p className="mt-1 text-sm text-red-600">{errors.achievementsSummary.message}</p>
              )}
            </div>

            {/* Learning & Growth */}
            <div>
              <label htmlFor="learningsGrowth" className="block text-sm font-medium text-gray-700 mb-1">
                Learning & Growth
              </label>
              <p className="text-xs text-gray-500 mb-2">
                What new skills or knowledge have you gained?
              </p>
              <textarea
                id="learningsGrowth"
                {...register('learningsGrowth')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the skills, knowledge, or capabilities you've developed..."
              />
              {errors.learningsGrowth && (
                <p className="mt-1 text-sm text-red-600">{errors.learningsGrowth.message}</p>
              )}
            </div>

            {/* Challenges Faced */}
            <div>
              <label htmlFor="challengesFaced" className="block text-sm font-medium text-gray-700 mb-1">
                Challenges Faced
              </label>
              <p className="text-xs text-gray-500 mb-2">
                What significant challenges did you overcome?
              </p>
              <textarea
                id="challengesFaced"
                {...register('challengesFaced')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the main challenges you faced and how you addressed them..."
              />
              {errors.challengesFaced && (
                <p className="mt-1 text-sm text-red-600">{errors.challengesFaced.message}</p>
              )}
            </div>

            {/* Next Year Goals */}
            <div>
              <label htmlFor="nextYearGoals" className="block text-sm font-medium text-gray-700 mb-1">
                Next Year Goals
              </label>
              <p className="text-xs text-gray-500 mb-2">
                What are your aspirations and goals for the coming year?
              </p>
              <textarea
                id="nextYearGoals"
                {...register('nextYearGoals')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Outline your goals and aspirations for the next review period..."
              />
              {errors.nextYearGoals && (
                <p className="mt-1 text-sm text-red-600">{errors.nextYearGoals.message}</p>
              )}
            </div>

            {/* Overall Self-Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Self-Rating
              </label>
              <p className="text-xs text-gray-500 mb-3">
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
                    {employeeOverallRating}/5
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <div className="grid grid-cols-5 gap-1 text-center">
                  <span>Needs<br/>Improvement</span>
                  <span>Below<br/>Expectations</span>
                  <span>Meets<br/>Expectations</span>
                  <span>Exceeds<br/>Expectations</span>
                  <span>Outstanding<br/>Performance</span>
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
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Complete PDR'}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <PartyPopper className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle className="text-green-600">PDR Completed!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Congratulations! You've successfully completed your Performance & Development Review.
              </p>
              <div className="bg-green-50 p-3 rounded-lg mb-4">
                <h4 className="font-medium text-green-900 mb-1">What's Next:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Your manager will review your assessment</li>
                  <li>• You'll receive final ratings and feedback</li>
                  <li>• Use insights to plan your development</li>
                </ul>
              </div>
              <Button
                onClick={handleCompletionConfirm}
                className="w-full bg-green-600 hover:bg-green-700"
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
