'use client';

import { useParams, useRouter } from 'next/navigation';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Calendar,
  Target,
  TrendingUp,
  FileText,
  CheckCircle,
  Clock,
  MessageSquare,
  Lock,
  Unlock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { formatDateAU, getPDRStatusLabel } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BehaviorReviewSection, type BehaviorReviewSectionRef } from '@/components/ceo/behavior-review-section';

interface PDRData {
  id: string;
  userId: string;
  status: string;
  currentStep: number;
  isLocked: boolean;
  meetingBooked: boolean;
  fyLabel: string;
  fyStartDate: string;
  fyEndDate: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  ceoFields?: Record<string, any>;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progress: number;
}

interface Behavior {
  id: string;
  title?: string;
  description: string;
  examples?: string;
  selfRating: number;
  managerRating?: number;
  comments?: string;
  valueId?: string;
  value?: {
    id: string;
    name: string;
    description?: string;
  };
}

export default function CEOPDRReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const pdrId = params.id as string;

  const [pdr, setPdr] = useState<PDRData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("goals");
  
  // Ref for the behavior review section
  const behaviorReviewRef = useRef<BehaviorReviewSectionRef>(null);
  
  // CEO feedback state
  const [ceoGoalFeedback, setCeoGoalFeedback] = useState<Record<string, {
    ceoTitle?: string;
    ceoDescription?: string;
    ceoProgress?: number;
    ceoComments?: string;
    ceoRating?: number;
  }>>({});
  
  const [ceoBehaviorFeedback, setCeoBehaviorFeedback] = useState<Record<string, {
    ceoRating?: number;
    ceoComments?: string;
    ceoExamples?: string;
  }>>({});

  // Comments dialog state
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [ceoComments, setCeoComments] = useState('');
  
  // Mid-year check-in comments state
  const [midYearGoalComments, setMidYearGoalComments] = useState<Record<string, string>>({});
  const [midYearBehaviorComments, setMidYearBehaviorComments] = useState<Record<string, string>>({});
  
  // Final review state
  const [finalGoalReviews, setFinalGoalReviews] = useState<Record<string, {
    rating: number;
    comments: string;
  }>>({});
  const [finalBehaviorReviews, setFinalBehaviorReviews] = useState<Record<string, {
    rating: number;
    comments: string;
  }>>({});
  
  // Save & Lock confirmation dialog state
  const [isLockConfirmDialogOpen, setIsLockConfirmDialogOpen] = useState(false);
  
  // Validation error dialog state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidationErrorDialogOpen, setIsValidationErrorDialogOpen] = useState(false);

  // State to force re-render of metrics when localStorage changes
  const [metricsRefreshKey, setMetricsRefreshKey] = useState(0);

  // Function to refresh metrics
  const refreshMetrics = useCallback(() => {
    setMetricsRefreshKey(prev => prev + 1);
  }, []);

  // Listen for storage events and custom events to refresh metrics
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes(`ceo_goal_feedback_${pdrId}`) || e.key?.includes(`ceo_behavior_feedback_${pdrId}`)) {
        refreshMetrics();
      }
    };

    const handleCustomRefresh = () => {
      refreshMetrics();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ceo-feedback-updated', handleCustomRefresh);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ceo-feedback-updated', handleCustomRefresh);
    };
  }, [pdrId, refreshMetrics]);
  
  // Mid-year save and close confirmation dialog state
  const [isMidYearSaveConfirmDialogOpen, setIsMidYearSaveConfirmDialogOpen] = useState(false);

  // Functions to handle CEO feedback
  const updateCeoGoalFeedback = (goalId: string, field: string, value: string | number) => {
    setCeoGoalFeedback(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value
      }
    }));
    
    // Save to localStorage
    const feedbackKey = `ceo_goal_feedback_${pdrId}`;
    const updatedFeedback = {
      ...ceoGoalFeedback,
      [goalId]: {
        ...ceoGoalFeedback[goalId],
        [field]: value
      }
    };
    localStorage.setItem(feedbackKey, JSON.stringify(updatedFeedback));
  };

  const updateCeoBehaviorFeedback = (behaviorId: string, field: string, value: string | number) => {
    setCeoBehaviorFeedback(prev => ({
      ...prev,
      [behaviorId]: {
        ...prev[behaviorId],
        [field]: value
      }
    }));
    
    // Save to localStorage
    const feedbackKey = `ceo_behavior_feedback_${pdrId}`;
    const updatedFeedback = {
      ...ceoBehaviorFeedback,
      [behaviorId]: {
        ...ceoBehaviorFeedback[behaviorId],
        [field]: value
      }
    };
    localStorage.setItem(feedbackKey, JSON.stringify(updatedFeedback));
  };

  // Handle CEO comments
  const handleSaveComments = () => {
    const commentsKey = `ceo_comments_${pdrId}`;
    localStorage.setItem(commentsKey, ceoComments);
    setIsCommentsDialogOpen(false);
    console.log('✅ CEO comments saved as draft');
  };

  // Handle save comments and submit (lock) the review
  const handleSaveAndSubmitFromComments = () => {
    // First save the comments
    const commentsKey = `ceo_comments_${pdrId}`;
    localStorage.setItem(commentsKey, ceoComments);
    
    // Close the comments dialog
    setIsCommentsDialogOpen(false);
    
    // Now attempt to save and lock the review
    setTimeout(() => {
      // Small delay to ensure dialog closes before validation
      const errors = validateCEOFeedback();
      if (errors.length > 0) {
        setValidationErrors(errors);
        setIsValidationErrorDialogOpen(true);
        return;
      }
      
      // If validation passes, open the confirmation dialog
      setIsLockConfirmDialogOpen(true);
    }, 100);
  };

  const handleOpenCommentsDialog = () => {
    setIsCommentsDialogOpen(true);
  };

  // Save mid-year check-in comment
  const saveMidYearComment = (itemId: string, comment: string, type: 'goal' | 'behavior') => {
    if (type === 'goal') {
      const updatedComments = { ...midYearGoalComments, [itemId]: comment };
      setMidYearGoalComments(updatedComments);
      localStorage.setItem(`mid_year_goal_comments_${pdrId}`, JSON.stringify(updatedComments));
    } else {
      const updatedComments = { ...midYearBehaviorComments, [itemId]: comment };
      setMidYearBehaviorComments(updatedComments);
      localStorage.setItem(`mid_year_behavior_comments_${pdrId}`, JSON.stringify(updatedComments));
    }
  };

  // Save final review data
  const saveFinalGoalReview = (goalId: string, field: 'rating' | 'comments', value: number | string) => {
    const updatedReviews = {
      ...finalGoalReviews,
      [goalId]: {
        ...finalGoalReviews[goalId],
        [field]: value
      }
    };
    setFinalGoalReviews(updatedReviews);
    localStorage.setItem(`final_goal_reviews_${pdrId}`, JSON.stringify(updatedReviews));
  };

  const saveFinalBehaviorReview = (behaviorId: string, field: 'rating' | 'comments', value: number | string) => {
    const updatedReviews = {
      ...finalBehaviorReviews,
      [behaviorId]: {
        ...finalBehaviorReviews[behaviorId],
        [field]: value
      }
    };
    setFinalBehaviorReviews(updatedReviews);
    localStorage.setItem(`final_behavior_reviews_${pdrId}`, JSON.stringify(updatedReviews));
  };

  // Save mid-year check-in and update status to Final Review
  const handleMidYearSaveAndClose = () => {
    if (!pdr) return;
    
    console.log('🎯 Mid-Year Review: Starting save and close process');
    console.log('📋 PDR ID:', pdrId);
    
    // Update PDR status to END_YEAR_REVIEW (Final Review phase)
    const updatedPDR = {
      ...pdr,
      status: 'END_YEAR_REVIEW',
      midYearCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setPdr(updatedPDR);
    localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(updatedPDR));
    localStorage.setItem('demo_current_pdr', JSON.stringify(updatedPDR));
    
    console.log('💾 Updated PDR status to END_YEAR_REVIEW for Final Review phase');
    console.log('📊 Updated PDR:', updatedPDR);
    
    // Trigger a storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: `demo_pdr_${pdrId}`,
      newValue: JSON.stringify(updatedPDR),
      storageArea: localStorage
    }));
    
    setIsMidYearSaveConfirmDialogOpen(false);
    console.log('✅ Mid-Year Review: Completed and PDR moved to Final Review phase');
  };

  // Validate that CEO has provided comprehensive feedback for planning stage
  const validateCEOFeedback = () => {
    console.log('🔍 Validation: Starting CEO feedback validation for planning stage');
    
    const validationErrors: string[] = [];
    
    // Get real CEO feedback data from localStorage (same as metrics)
    const getCeoGoalFeedback = () => {
      if (typeof window === 'undefined') return {};
      const savedData = localStorage.getItem(`ceo_goal_feedback_${pdrId}`);
      return savedData ? JSON.parse(savedData) : {};
    };

    const getCeoBehaviorFeedback = () => {
      if (typeof window === 'undefined') return {};
      const savedData = localStorage.getItem(`ceo_behavior_feedback_${pdrId}`);
      return savedData ? JSON.parse(savedData) : {};
    };

    const realCeoGoalFeedback = getCeoGoalFeedback();
    const realCeoBehaviorFeedback = getCeoBehaviorFeedback();
    
    console.log('📊 Real CEO Goal Feedback:', realCeoGoalFeedback);
    console.log('📊 Real CEO Behavior Feedback:', realCeoBehaviorFeedback);
    
    // Check goals feedback - only require some form of CEO input (not ratings)
    goals.forEach((goal) => {
      const feedback = realCeoGoalFeedback[goal.id];
      console.log(`🎯 Validating goal "${goal.title}":`, feedback);
      
      // For planning stage, require at least one form of CEO feedback
      const hasFeedback = feedback && (
        (feedback.ceoTitle && feedback.ceoTitle.trim()) ||
        (feedback.ceoDescription && feedback.ceoDescription.trim()) ||
        (feedback.ceoComments && feedback.ceoComments.trim())
      );
      
      if (!hasFeedback) {
        validationErrors.push(`Goal "${goal.title}" - Missing CEO feedback`);
      }
    });
    
    // Check behaviors feedback - require description or comments (not ratings)
    const totalBehaviors = 6; // 6 company values
    const behaviorsFeedbackCount = Object.keys(realCeoBehaviorFeedback).filter(valueId => {
      const feedback = realCeoBehaviorFeedback[valueId];
      return feedback && (
        (feedback.description && feedback.description.trim()) ||
        (feedback.comments && feedback.comments.trim())
      );
    }).length;
    
    if (behaviorsFeedbackCount < totalBehaviors) {
      const missingCount = totalBehaviors - behaviorsFeedbackCount;
      validationErrors.push(`${missingCount} behavior(s) missing CEO feedback`);
    }
    
    console.log('❌ Validation errors:', validationErrors);
    return validationErrors;
  };

  // Save all CEO feedback and lock the review
  const handleSaveAndLockReview = () => {
    if (!pdr) return;
    
    console.log('🔒 CEO Review: Starting save and lock process');
    console.log('📋 PDR ID:', pdrId);
    console.log('📊 Current PDR:', pdr);
    
    // Validate feedback completeness
    const errors = validateCEOFeedback();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsValidationErrorDialogOpen(true);
      setIsLockConfirmDialogOpen(false); // Close confirmation dialog
      return;
    }
    
    // Save all CEO feedback to localStorage
    const ceoReviewData = {
      goalFeedback: ceoGoalFeedback,
      behaviorFeedback: ceoBehaviorFeedback,
      comments: ceoComments,
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'CEO' // In a real app, this would be the current user
    };
    
    // Save CEO review data
    localStorage.setItem(`ceo_review_${pdrId}`, JSON.stringify(ceoReviewData));
    
    // Update PDR status to locked
    const updatedPDR = {
      ...pdr,
      status: 'PLAN_LOCKED',
      isLocked: true,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setPdr(updatedPDR);
    localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(updatedPDR));
    localStorage.setItem('demo_current_pdr', JSON.stringify(updatedPDR));
    
    console.log('💾 Saved PDR to localStorage keys:');
    console.log(`  - demo_pdr_${pdrId}`);
    console.log('  - demo_current_pdr');
    console.log('🔓 Updated PDR status to:', updatedPDR.status);
    
    // Trigger a storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: `demo_pdr_${pdrId}`,
      newValue: JSON.stringify(updatedPDR),
      storageArea: localStorage
    }));
    
    setIsLockConfirmDialogOpen(false);
    console.log('✅ CEO Review: Review completed and PDR locked');
    console.log('📊 CEO Review Data:', ceoReviewData);
    
    // Show success message
    setTimeout(() => {
      console.log('🎉 PDR is now locked and ready for mid-year review! Navigate to Reviews page to see the updated status.');
    }, 1000);
  };

  const handleOpenLockConfirmDialog = () => {
    console.log('🔒 Attempting to open lock confirmation dialog');
    const errors = validateCEOFeedback();
    if (errors.length > 0) {
      console.log('❌ Validation failed, showing errors:', errors);
      setValidationErrors(errors);
      setIsValidationErrorDialogOpen(true);
      return;
    }
    console.log('✅ Validation passed, opening lock confirmation dialog');
    setIsLockConfirmDialogOpen(true);
  };

  useEffect(() => {
    const loadPDRData = () => {
      console.log('🔍 CEO Review: Loading PDR data for ID:', pdrId);
      
      // Load PDR data from localStorage - prioritize specific PDR storage
      let pdrData = null;
      
      // Check specific PDR storage FIRST (this is the most up-to-date)
      const specificPDR = localStorage.getItem(`demo_pdr_${pdrId}`);
      if (specificPDR) {
        try {
          pdrData = JSON.parse(specificPDR);
          console.log('📋 CEO Review: Loading from specific PDR storage:', { id: pdrData.id, status: pdrData.status });
        } catch (error) {
          console.error('Error parsing specific PDR:', error);
        }
      }
      
      // Fallback to current PDR only if specific PDR not found
      if (!pdrData) {
        const currentPDR = localStorage.getItem('demo_current_pdr');
        if (currentPDR) {
          try {
            const parsed = JSON.parse(currentPDR);
            if (parsed.id === pdrId) {
              pdrData = parsed;
              console.log('📋 CEO Review: Loading from current PDR storage:', { id: pdrData.id, status: pdrData.status });
            }
          } catch (error) {
            console.error('Error parsing current PDR:', error);
          }
        }
      }

      if (pdrData) {
        console.log('✅ CEO Review: Found PDR data:', { id: pdrData.id, status: pdrData.status });
        setPdr({
          ...pdrData,
          user: {
            firstName: 'Employee',
            lastName: 'Demo',
            email: 'employee@demo.com'
          }
        });

        // Load goals
        const goalsData = localStorage.getItem(`demo_goals_${pdrId}`);
        if (goalsData) {
          try {
            const parsedGoals = JSON.parse(goalsData);
            setGoals(parsedGoals);
            console.log('✅ CEO Review: Found goals:', parsedGoals.length);
          } catch (error) {
            console.error('Error parsing goals:', error);
          }
        }

        // Load behaviors
        const behaviorsData = localStorage.getItem(`demo_behaviors_${pdrId}`);
        if (behaviorsData) {
          try {
            const parsedBehaviors = JSON.parse(behaviorsData);
            
            // Load company values to associate with behaviors
            const DEMO_COMPANY_VALUES = [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                name: 'Lean Thinking',
                description: 'We embrace a lean mindset, always seeking ways to eliminate waste and improve productivity.',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440002',
                name: 'Craftsmanship',
                description: 'We take pride in creating high-quality products and services.',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440003',
                name: 'Value-Centric Innovation',
                description: 'We focus on creating products and services that add significant value to our customers\' lives.',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440004',
                name: 'Blameless Problem-Solving',
                description: 'We approach every challenge with a forward-looking, solution-driven mindset.',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440005',
                name: 'Self Reflection',
                description: 'We regularly reflect on our actions and decisions to continuously improve.',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440006',
                name: 'CodeFish 3D - Deep Dive Development',
                description: 'We dive deep into complex problems and develop comprehensive solutions.',
              }
            ];
            
            // Associate company values with behaviors
            const behaviorsWithValues = parsedBehaviors.map(behavior => {
              const companyValue = DEMO_COMPANY_VALUES.find(value => value.id === behavior.valueId);
              return {
                ...behavior,
                value: companyValue || null
              };
            });
            
            setBehaviors(behaviorsWithValues);
            console.log('✅ CEO Review: Found behaviors:', behaviorsWithValues.length);
            console.log('✅ CEO Review: Behaviors with values:', behaviorsWithValues);
          } catch (error) {
            console.error('Error parsing behaviors:', error);
          }
        }
              } else {
          console.error('❌ CEO Review: PDR not found for ID:', pdrId);
        }

        // Load CEO feedback data
        const goalFeedbackKey = `ceo_goal_feedback_${pdrId}`;
        const savedGoalFeedback = localStorage.getItem(goalFeedbackKey);
        if (savedGoalFeedback) {
          try {
            setCeoGoalFeedback(JSON.parse(savedGoalFeedback));
            console.log('✅ CEO Review: Loaded goal feedback');
          } catch (error) {
            console.error('Error parsing CEO goal feedback:', error);
          }
        }

        const behaviorFeedbackKey = `ceo_behavior_feedback_${pdrId}`;
        const savedBehaviorFeedback = localStorage.getItem(behaviorFeedbackKey);
        if (savedBehaviorFeedback) {
          try {
            setCeoBehaviorFeedback(JSON.parse(savedBehaviorFeedback));
            console.log('✅ CEO Review: Loaded behavior feedback');
          } catch (error) {
            console.error('Error parsing CEO behavior feedback:', error);
          }
        }

        // Load CEO comments
        const commentsKey = `ceo_comments_${pdrId}`;
        const savedComments = localStorage.getItem(commentsKey);
        if (savedComments) {
          setCeoComments(savedComments);
          console.log('✅ CEO Review: Loaded comments');
        }

        // Load mid-year check-in comments
        const midYearGoalCommentsKey = `mid_year_goal_comments_${pdrId}`;
        const savedMidYearGoalComments = localStorage.getItem(midYearGoalCommentsKey);
        if (savedMidYearGoalComments) {
          try {
            setMidYearGoalComments(JSON.parse(savedMidYearGoalComments));
            console.log('✅ CEO Review: Loaded mid-year goal comments');
          } catch (error) {
            console.error('Error parsing mid-year goal comments:', error);
          }
        }

        const midYearBehaviorCommentsKey = `mid_year_behavior_comments_${pdrId}`;
        const savedMidYearBehaviorComments = localStorage.getItem(midYearBehaviorCommentsKey);
        if (savedMidYearBehaviorComments) {
          try {
            setMidYearBehaviorComments(JSON.parse(savedMidYearBehaviorComments));
            console.log('✅ CEO Review: Loaded mid-year behavior comments');
          } catch (error) {
            console.error('Error parsing mid-year behavior comments:', error);
          }
        }

        // Load final review data
        const finalGoalReviewsKey = `final_goal_reviews_${pdrId}`;
        const savedFinalGoalReviews = localStorage.getItem(finalGoalReviewsKey);
        if (savedFinalGoalReviews) {
          try {
            setFinalGoalReviews(JSON.parse(savedFinalGoalReviews));
            console.log('✅ CEO Review: Loaded final goal reviews');
          } catch (error) {
            console.error('Error parsing final goal reviews:', error);
          }
        }

        const finalBehaviorReviewsKey = `final_behavior_reviews_${pdrId}`;
        const savedFinalBehaviorReviews = localStorage.getItem(finalBehaviorReviewsKey);
        if (savedFinalBehaviorReviews) {
          try {
            setFinalBehaviorReviews(JSON.parse(savedFinalBehaviorReviews));
            console.log('✅ CEO Review: Loaded final behavior reviews');
          } catch (error) {
            console.error('Error parsing final behavior reviews:', error);
          }
        }

        setIsLoading(false);
      };

      loadPDRData();
    }, [pdrId]);

  // Load demo CEO feedback on component mount
  useEffect(() => {
    const loadDemoCeoFeedback = () => {
      if (typeof window !== 'undefined' && localStorage.getItem('demo_user')) {
        const demoDataKey = `demo_pdr_ceo_fields_${pdrId}`;
        const savedCeoFields = localStorage.getItem(demoDataKey);
        
        if (savedCeoFields) {
          try {
            const ceoFields = JSON.parse(savedCeoFields);
            if (ceoFields.goalFeedback) {
              setCeoGoalFeedback(ceoFields.goalFeedback);
              console.log('Demo mode: Loaded CEO goal feedback', ceoFields.goalFeedback);
            }
          } catch (error) {
            console.error('Error loading demo CEO feedback:', error);
          }
        }
      }
    };

    // Load demo data after PDR data is loaded
    if (pdr && pdrId) {
      loadDemoCeoFeedback();
    }
  }, [pdr, pdrId]);

  const getStatusBadge = (status: string) => {
    const statusLabel = getPDRStatusLabel(status as any) || status;
    
    switch (status) {
      case 'Created':
      case 'DRAFT':
        return <Badge variant="secondary">{statusLabel}</Badge>;
      case 'SUBMITTED':
        return <Badge variant="default">{statusLabel}</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="destructive">{statusLabel}</Badge>;
      case 'OPEN_FOR_REVIEW':
        return <Badge variant="default">{statusLabel}</Badge>;
      case 'PLAN_LOCKED':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">{statusLabel}</Badge>;
      case 'PDR_BOOKED':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">{statusLabel}</Badge>;
      case 'MID_YEAR_CHECK':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">{statusLabel}</Badge>;
      case 'END_YEAR_REVIEW':
        return <Badge variant="outline" className="border-indigo-500 text-indigo-600">{statusLabel}</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="border-green-500 text-green-600">{statusLabel}</Badge>;
      case 'LOCKED':
        return <Badge variant="destructive">{statusLabel}</Badge>;
      default:
        return <Badge variant="outline">{statusLabel}</Badge>;
    }
  };

  const getWeightingBadge = (weighting: number) => {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
        {weighting}%
      </Badge>
    );
  };

  const getGoalStatusBadge = (status: string) => {
    const cleanStatus = status || 'NOT_STARTED';
    const displayText = cleanStatus.replace('_', ' ');
    
    switch (cleanStatus) {
      case 'COMPLETED':
        return <Badge variant="outline" className="border-green-500 text-green-600">{displayText}</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default">{displayText}</Badge>;
      case 'NOT_STARTED':
        return <Badge variant="secondary">{displayText}</Badge>;
      default:
        return <Badge variant="outline">{displayText}</Badge>;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };
  
  // Function to handle tab navigation
  const handleTabChange = async (value: string) => {
    // Prevent rapid-fire tab changes
    if (isSaving) {
      console.log('Tab change blocked: Currently saving');
      return;
    }

    try {
      // If navigating from goals to behaviors tab, save CEO goal feedback first
      if (activeTab === "goals" && value === "behaviors") {
        const saved = await saveCeoGoalFeedback();
        if (saved) {
          setActiveTab(value);
        }
      } else {
        setActiveTab(value);
      }
    } catch (error) {
      console.error('Error during tab change:', error);
      toast({
        title: 'Navigation Error',
        description: 'Unable to change tabs. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Function to save CEO goal feedback to the PDR ceoFields
  const saveCeoGoalFeedback = async () => {
    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('Save blocked: Already saving');
      return false;
    }

    setIsSaving(true);
    try {
      if (!pdr) {
        throw new Error('PDR data not found');
      }
      
      // Prepare the ceoFields data with goal feedback
      const ceoFields = {
        ...(pdr.ceoFields as Record<string, any> || {}),
        goalFeedback: ceoGoalFeedback
      };
      
      // Check if we're in demo mode
      const isDemo = typeof window !== 'undefined' && localStorage.getItem('demo_user');
      
      if (isDemo) {
        // For demo mode, save locally and update state immediately
        console.log('Demo mode: Saving CEO goal feedback locally', ceoFields);
        
        // Save to localStorage for demo persistence
        const demoDataKey = `demo_pdr_ceo_fields_${pdrId}`;
        localStorage.setItem(demoDataKey, JSON.stringify(ceoFields));
        
        // Update the local PDR state with the new ceoFields
        setPdr((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ceoFields: ceoFields as any
          };
        });
        
        // Show success message for demo
        toast({
          title: 'Success',
          description: 'CEO feedback saved successfully (Demo mode)',
        });
        
        // Trigger metrics refresh
        refreshMetrics();
        window.dispatchEvent(new CustomEvent('ceo-feedback-updated'));
        
        return true;
      } else {
        // For production mode, make API call
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        // Check for regular auth token in cookies
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('access_token='))
          ?.split('=')[1];
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/pdrs/${pdrId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            ceoFields
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save CEO goal feedback');
        }
        
        // Update the local PDR state with the new ceoFields
        setPdr((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ceoFields: ceoFields as any
          };
        });
        
        toast({
          title: 'Success',
          description: 'CEO feedback saved successfully',
        });
        
        // Trigger metrics refresh
        refreshMetrics();
        window.dispatchEvent(new CustomEvent('ceo-feedback-updated'));
        
        return true;
      }
    } catch (error) {
      console.error('Error saving CEO goal feedback:', error);
      // Use toast function from component level
      toast({
        title: 'Error',
        description: 'Failed to save your feedback. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Function to navigate to the next tab
  const navigateToNextTab = async () => {
    // Prevent rapid-fire navigation
    if (isSaving) {
      console.log('Navigation blocked: Currently saving');
      return;
    }

    try {
      if (activeTab === "goals") {
        // Save CEO goal feedback before navigating
        const saved = await saveCeoGoalFeedback();
        if (saved) {
          setActiveTab("behaviors");
        }
      } else if (activeTab === "behaviors") {
        setActiveTab("summary");
      } else if (activeTab === "summary") {
        setActiveTab("mid-year");
      } else if (activeTab === "mid-year") {
        setActiveTab("final-review");
      }
    } catch (error) {
      console.error('Error during navigation:', error);
      toast({
        title: 'Navigation Error',
        description: 'Unable to navigate. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Function to save behavior changes and navigate to summary tab
  const saveAndNavigateToSummary = async () => {
    try {
      setIsSaving(true);
      
      // Use the new behavior review section's save function
      if (behaviorReviewRef.current) {
        const saveSuccess = await behaviorReviewRef.current.saveAllReviews();
        
        if (saveSuccess) {
          console.log('✅ CEO Review: Saved all CEO behavior feedback');
          // Navigate to summary tab
          setActiveTab("summary");
        } else {
          console.error('❌ CEO Review: Failed to save some behavior feedback');
          // Still navigate but show a warning
          setActiveTab("summary");
        }
      } else {
        console.log('No behavior review component found, navigating to summary');
        setActiveTab("summary");
      }
    } catch (error) {
      console.error('Error in saveAndNavigateToSummary:', error);
      // Navigate anyway to not block the user
      setActiveTab("summary");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockPDR = () => {
    if (!pdr) return;
    
    const updatedPDR = {
      ...pdr,
      status: 'PLAN_LOCKED',
      isLocked: true,
      updatedAt: new Date().toISOString()
    };
    
    setPdr(updatedPDR);
    localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(updatedPDR));
    localStorage.setItem('demo_current_pdr', JSON.stringify(updatedPDR));
    
    console.log('🔒 CEO Review: PDR locked');
  };

  const handleUnlockPDR = () => {
    if (!pdr) return;
    
    const updatedPDR = {
      ...pdr,
      status: 'SUBMITTED',
      isLocked: false,
      updatedAt: new Date().toISOString()
    };
    
    setPdr(updatedPDR);
    localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(updatedPDR));
    localStorage.setItem('demo_current_pdr', JSON.stringify(updatedPDR));
    
    console.log('🔓 CEO Review: PDR unlocked');
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <AdminHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin' },
            { label: 'Reviews', href: '/admin/reviews' },
            { label: 'PDR Review' }
          ]}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading PDR...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pdr) {
    return (
      <div className="flex h-full flex-col">
        <AdminHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin' },
            { label: 'Reviews', href: '/admin/reviews' },
            { label: 'PDR Review' }
          ]}
        />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">PDR Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                The PDR with ID "{pdrId}" could not be found.
              </p>
              <Button onClick={() => router.push('/admin/reviews')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Reviews
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Reviews', href: '/admin/reviews' },
          { label: `${pdr.user.firstName} ${pdr.user.lastName}` }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {pdr.status === 'SUBMITTED' && (
              <Button onClick={handleLockPDR} variant="default">
                <Lock className="mr-2 h-4 w-4" />
                Lock PDR
              </Button>
            )}
            {pdr.isLocked && (
              <Button onClick={handleUnlockPDR} variant="outline">
                <Unlock className="mr-2 h-4 w-4" />
                Unlock PDR
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push('/admin/reviews')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reviews
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Employee Info & PDR Timeline - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Info Header */}
          <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-base">
                    {pdr.user.firstName[0]}{pdr.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl">{pdr.user.firstName} {pdr.user.lastName}</CardTitle>
                  <CardDescription className="text-sm">{pdr.user.email}</CardDescription>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(pdr.status)}
                    {pdr.isLocked && <Badge variant="destructive" className="text-xs">Locked</Badge>}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground">Financial Year</div>
                <div className="font-medium text-sm">{pdr.fyLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateAU(new Date(pdr.fyStartDate))} - {formatDateAU(new Date(pdr.fyEndDate))}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* PDR Timeline */}
          <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-4 w-4" />
                PDR Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Always show PDR Created */}
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm">PDR Created</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateAU(new Date(pdr.createdAt))}
                    </div>
                  </div>
                </div>
                
                {/* Show submission if submitted */}
                {pdr.submittedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">PDR Submitted</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateAU(new Date(pdr.submittedAt))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show current status if different from basic states */}
                {pdr.status !== 'Created' && pdr.status !== 'SUBMITTED' && pdr.status !== 'DRAFT' && (
                  <div className="flex items-center gap-3">
                    {pdr.status === 'COMPLETED' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm">Status: {getPDRStatusLabel(pdr.status as any)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateAU(new Date(pdr.updatedAt))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Always show last updated if different from other timestamps */}
                {(!pdr.submittedAt || new Date(pdr.updatedAt).getTime() !== new Date(pdr.submittedAt).getTime()) && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">Last Updated</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateAU(new Date(pdr.updatedAt))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="goals" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Goals ({goals.length})
              </TabsTrigger>
              <TabsTrigger value="behaviors" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Behaviors (6)
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="mid-year" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Mid Year Checkin
              </TabsTrigger>
              <TabsTrigger value="final-review" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Final Review
              </TabsTrigger>
            </TabsList>
            
            {/* Next button */}
            {activeTab === "goals" && (
              <Button 
                onClick={navigateToNextTab}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? 'Saving...' : 'Next: Behaviors'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            
            {/* Next to Summary button */}
            {activeTab === "behaviors" && (
              <Button 
                onClick={saveAndNavigateToSummary}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? 'Saving...' : 'Next: Summary'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <TabsContent value="goals" className="space-y-4">
            <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Performance Goals</CardTitle>
                <CardDescription>
                  Employee's performance goals and progress for {pdr.fyLabel}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {goals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No goals have been set for this PDR.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {goals.map((goal) => (
                      <Card key={goal.id} className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Employee Side */}
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-blue-600">Employee Goal</h4>
                              <div className="flex items-center gap-2">
                                {getWeightingBadge(goal.weighting || 0)}
                                {getGoalStatusBadge(goal.status)}
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Title</Label>
                              <div className="mt-1 p-2 bg-muted/50 rounded text-sm h-9 flex items-center">
                                {goal.title || 'Untitled Goal'}
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Description</Label>
                              <div className="mt-1 p-2 bg-muted/50 rounded text-sm min-h-[104px]">
                                {goal.description || 'No description provided'}
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Goal Weighting</Label>
                              <div className="mt-1 flex items-center h-9">
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors bg-blue-500/10 text-blue-400 border-blue-500/20">
                                  {goal.weighting || 0}%
                                </div>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (Employee suggested weighting)
                                </span>
                              </div>
                            </div>
                            
                            {/* Employee Progress section - only show if not in plan submission stage */}
                            {pdr.status !== 'SUBMITTED' && (
                              <div>
                                <Label className="text-sm font-medium">Employee Progress</Label>
                                <div className="mt-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">
                                      {goal.employeeProgress ? goal.employeeProgress : 'No progress reported'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      Rating: {goal.employeeRating || 'Not rated'}
                                    </span>
                                  </div>
                                  {goal.employeeRating && (
                                    <Progress value={(goal.employeeRating / 5) * 100} className="h-2" />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* CEO Side */}
                          <div className="space-y-4 border-l pl-6">
                            <h4 className="font-semibold text-green-600">CEO Review</h4>
                            
                            <div>
                              <Label htmlFor={`ceo-title-${goal.id}`} className="text-sm font-medium">
                                Goal Name
                              </Label>
                              <Input
                                id={`ceo-title-${goal.id}`}
                                placeholder="Rename the employees goal (If Required)"
                                defaultValue={
                                  // Use CEO's modified title if available, otherwise use employee's title
                                  (pdr && (pdr.ceoFields as any)?.goalFeedback && 
                                   (pdr.ceoFields as any).goalFeedback[goal.id]?.ceoTitle !== undefined) 
                                    ? (pdr.ceoFields as any).goalFeedback[goal.id].ceoTitle 
                                    : goal.title || ''
                                }
                                onChange={(e) => updateCeoGoalFeedback(goal.id, 'ceoTitle', e.target.value)}
                                className="mt-1 h-9 bg-muted/30"
                                disabled={pdr?.isLocked}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor={`ceo-desc-${goal.id}`} className="text-sm font-medium">
                                Goal Description
                              </Label>
                              <Textarea
                                id={`ceo-desc-${goal.id}`}
                                placeholder="Enter new goal description (If applicable)"
                                defaultValue={
                                  // Use CEO's modified description if available, otherwise use employee's description
                                  (pdr && (pdr.ceoFields as any)?.goalFeedback && 
                                   (pdr.ceoFields as any).goalFeedback[goal.id]?.ceoDescription !== undefined) 
                                    ? (pdr.ceoFields as any).goalFeedback[goal.id].ceoDescription 
                                    : goal.description || ''
                                }
                                onChange={(e) => updateCeoGoalFeedback(goal.id, 'ceoDescription', e.target.value)}
                                className="mt-1 min-h-[104px] bg-muted/30"
                                rows={4}
                                disabled={pdr?.isLocked}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor={`ceo-progress-${goal.id}`} className="text-sm font-medium">
                                Goal Weighting
                              </Label>
                              <Input
                                id={`ceo-progress-${goal.id}`}
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Suggest weighting for the employee"
                                defaultValue={
                                  // Use CEO's modified progress if available, otherwise use employee's weighting
                                  (pdr && (pdr.ceoFields as any)?.goalFeedback && 
                                   (pdr.ceoFields as any).goalFeedback[goal.id]?.ceoProgress !== undefined) 
                                    ? (pdr.ceoFields as any).goalFeedback[goal.id].ceoProgress 
                                    : (goal as any).weighting || ''
                                }
                                onChange={(e) => updateCeoGoalFeedback(goal.id, 'ceoProgress', parseInt(e.target.value) || 0)}
                                className="mt-1 h-9 bg-muted/30"
                                disabled={pdr?.isLocked}
                              />
                            </div>
                            
                            {ceoGoalFeedback[goal.id]?.ceoProgress && (
                              <div>
                                <Label className="text-sm font-medium">CEO Suggested Weighting</Label>
                                <div className="mt-1 h-9 flex items-center">
                                  <Progress value={ceoGoalFeedback[goal.id]?.ceoProgress || 0} className="h-2 w-full" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behaviors" className="space-y-4">
            <BehaviorReviewSection 
              ref={behaviorReviewRef}
              pdr={pdr as any} 
              currentUser={{
                id: 'demo-ceo-1',
                email: 'ceo@company.com',
                firstName: 'CEO',
                lastName: 'Demo',
                role: 'CEO'
              }} 
            />

          </TabsContent>

          <TabsContent value="summary" className="space-y-4">


            {/* Review Progress & CEO Actions - Side by Side Compact Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Review Progress - Compact */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Planning Stage Completion</CardTitle>
                  <CardDescription className="text-sm">
                    Your Planned PDR state's readiness for submission
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Force re-calculation when metricsRefreshKey changes
                    metricsRefreshKey; // This ensures the calculation runs when metrics refresh
                    
                    // Get real CEO feedback data from localStorage
                    const getCeoGoalFeedback = () => {
                      if (typeof window === 'undefined') return {};
                      const savedData = localStorage.getItem(`ceo_goal_feedback_${pdrId}`);
                      return savedData ? JSON.parse(savedData) : {};
                    };

                    const getCeoBehaviorFeedback = () => {
                      if (typeof window === 'undefined') return {};
                      const savedData = localStorage.getItem(`ceo_behavior_feedback_${pdrId}`);
                      return savedData ? JSON.parse(savedData) : {};
                    };

                    const realCeoGoalFeedback = getCeoGoalFeedback();
                    const realCeoBehaviorFeedback = getCeoBehaviorFeedback();

                    // Calculate completion based on real system data
                    const totalBehaviors = 6; // 6 company values
                    const totalGoals = goals.length;
                    const totalItems = totalGoals + totalBehaviors; // Goals + Behaviors only

                    // Count completed goals (CEO has provided feedback)
                    const completedGoals = Object.keys(realCeoGoalFeedback).filter(goalId => {
                      const feedback = realCeoGoalFeedback[goalId];
                      return feedback && (
                        (feedback.ceoTitle && feedback.ceoTitle.trim()) ||
                        (feedback.ceoDescription && feedback.ceoDescription.trim()) ||
                        (feedback.ceoComments && feedback.ceoComments.trim()) ||
                        feedback.ceoRating
                      );
                    }).length;

                    // Count completed behaviors (CEO has provided feedback)
                    const completedBehaviors = Object.keys(realCeoBehaviorFeedback).filter(valueId => {
                      const feedback = realCeoBehaviorFeedback[valueId];
                      return feedback && (
                        (feedback.description && feedback.description.trim()) ||
                        (feedback.comments && feedback.comments.trim())
                      );
                    }).length;

                    const completedItems = completedGoals + completedBehaviors;
                    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                    
                    return (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Feedback Completion</span>
                            <span className="font-bold text-lg">{completionPercentage}%</span>
                          </div>
                          <Progress value={completionPercentage} className="h-3" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="font-bold text-sm">{completedGoals}/{totalGoals}</div>
                            <div className="text-muted-foreground">Goals</div>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="font-bold text-sm">{completedBehaviors}/{totalBehaviors}</div>
                            <div className="text-muted-foreground">Behaviors</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* CEO Actions - Compact */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">CEO Actions</CardTitle>
                  <CardDescription className="text-sm">
                    Available actions for this PDR
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                    {(() => {
                      const showButton = pdr.status === 'SUBMITTED' && !pdr.isLocked;
                      console.log('🎯 Button visibility check - PDR status:', pdr.status, 'isLocked:', pdr.isLocked);
                      console.log('🎯 Expected status: SUBMITTED');
                      console.log('🎯 Should show button:', showButton);
                      return showButton;
                    })() && (
                      <AlertDialog open={isLockConfirmDialogOpen} onOpenChange={setIsLockConfirmDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button onClick={handleOpenLockConfirmDialog} className="w-full">
                            <Lock className="mr-2 h-4 w-4" />
                            Save & Lock Review
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Submit and Lock PDR Review</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will finalize your review and lock the PDR. Once submitted and locked:
                              <br />• All your feedback will be saved permanently
                              <br />• The employee's goals will be formally set for measurement
                              <br />• The PDR will be ready for mid-year check-ins
                              <br />• You won't be able to edit your feedback without unlocking
                              <br /><br />
                              Are you sure you want to submit and lock this review?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSaveAndLockReview}>
                              Submit and Lock
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {pdr.isLocked && (
                      <Button onClick={handleUnlockPDR} variant="outline" className="w-full">
                        <Unlock className="mr-2 h-4 w-4" />
                        Unlock PDR
                      </Button>
                    )}
                    <Dialog open={isCommentsDialogOpen} onOpenChange={setIsCommentsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" onClick={handleOpenCommentsDialog}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          {ceoComments ? 'Edit Comments' : 'Add Comments'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                          <DialogTitle>CEO Summary Comments</DialogTitle>
                          <DialogDescription>
                            Add your overall comments about this PDR review. These comments will be visible to the employee.
                            <br /><br />
                            <strong>Save as Draft:</strong> Save your progress to return and modify later
                            <br />
                            <strong>Save and Submit:</strong> Save comments and lock the PDR for mid-year review
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="ceo-comments">Your Comments</Label>
                            <Textarea
                              id="ceo-comments"
                              placeholder="Enter your overall comments about this PDR review..."
                              value={ceoComments}
                              onChange={(e) => setCeoComments(e.target.value)}
                              className="min-h-[120px]"
                              rows={6}
                              disabled={pdr.isLocked}
                            />
                          </div>
                        </div>
                        <DialogFooter className="gap-2">
                          <Button variant="outline" onClick={() => setIsCommentsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="secondary" onClick={handleSaveComments}>
                            Save as Draft
                          </Button>
                          <Button onClick={handleSaveAndSubmitFromComments}>
                            Save and Submit
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div><strong>Status:</strong> {getPDRStatusLabel(pdr.status as any) || pdr.status}</div>
                      <div><strong>Meeting:</strong> {pdr.meetingBooked ? 'Booked' : 'Not booked'}</div>
                      <div><strong>Submitted:</strong> {pdr.submittedAt ? formatDateAU(new Date(pdr.submittedAt)) : 'Not submitted'}</div>
                      <div><strong>Updated:</strong> {formatDateAU(new Date(pdr.updatedAt))}</div>
                    </div>
                  </div>
                  
                  {ceoComments && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">CEO Comments</h4>
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                          {ceoComments.split('\n').map((line, index) => (
                            <p key={index} className={index > 0 ? 'mt-2' : ''}>
                              {line || '\u00A0'}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  </div>
                </CardContent>
              </Card>
            </div>


          </TabsContent>

          <TabsContent value="mid-year" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Mid Year Performance Review</CardTitle>
                  <CardDescription>
                    Mid-year check-in and performance assessment for {pdr?.user?.firstName} {pdr?.user?.lastName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Performance Progress Overview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Performance Progress</h3>
                    
                    {/* Goals Progress */}
                    <div className="bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Goals Progress ({goals.length} goals)
                      </h4>
                      <div className="space-y-6">
                        {goals.map((goal, index) => {
                          const employeeRating = goal.employeeRating || 0;
                          const ceoRating = ceoGoalFeedback[goal.id]?.ceoRating || 0;
                          const employeeComments = goal.employeeProgress || '';
                          const ceoComments = ceoGoalFeedback[goal.id]?.ceoDescription || '';
                          const checkinComments = midYearGoalComments[goal.id] || '';
                          
                          return (
                            <div key={goal.id} className="border border-border/30 rounded-lg p-4 bg-background/50">
                              {/* Goal Header */}
                              <div className="mb-4">
                                <h5 className="font-medium text-sm mb-1">{goal.title}</h5>
                                <p className="text-xs text-muted-foreground">{goal.description}</p>
                              </div>
                              
                              {/* Comments Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Employee Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee Comments</h6>
                                  <div className="min-h-[80px] p-3 bg-muted/30 rounded-md text-sm">
                                    {employeeComments || (
                                      <span className="text-muted-foreground italic">No employee comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* CEO Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CEO Comments</h6>
                                  <div className="min-h-[80px] p-3 bg-muted/30 rounded-md text-sm">
                                    {ceoComments || (
                                      <span className="text-muted-foreground italic">No CEO comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Check-in Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Check-in Comments</h6>
                                  {pdr?.status === 'END_YEAR_REVIEW' ? (
                                    <div className="min-h-[80px] p-3 bg-muted/30 rounded-md text-sm">
                                      {checkinComments || (
                                        <span className="text-muted-foreground italic">No check-in comments provided</span>
                                      )}
                                    </div>
                                  ) : (
                                    <Textarea
                                      placeholder="Add mid-year check-in notes..."
                                      value={checkinComments}
                                      onChange={(e) => saveMidYearComment(goal.id, e.target.value, 'goal')}
                                      className="min-h-[80px] text-sm"
                                    />
                                  )}
                                </div>
                              </div>
                              
                              {/* Ratings Display */}
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="font-medium">{employeeRating}/5</div>
                                    <div className="text-xs text-muted-foreground">Employee Rating</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-medium">{ceoRating}/5</div>
                                    <div className="text-xs text-muted-foreground">CEO Rating</div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Mid-Year Review
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Behaviors Progress */}
                    <div className="bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Behaviors Assessment ({behaviors.length} behaviors)
                      </h4>
                      <div className="space-y-6">
                        {behaviors.map((behavior, index) => {
                          const employeeRating = behavior.employeeRating || 0;
                          const ceoRating = ceoBehaviorFeedback[behavior.id]?.ceoRating || 0;
                          const employeeComments = behavior.employeeExamples || '';
                          const ceoComments = ceoBehaviorFeedback[behavior.id]?.ceoComments || '';
                          const checkinComments = midYearBehaviorComments[behavior.id] || '';
                          
                          return (
                            <div key={behavior.id} className="border border-border/30 rounded-lg p-4 bg-background/50">
                              {/* Behavior Header */}
                              <div className="mb-4">
                                <h5 className="font-medium text-sm mb-1">{behavior.value?.name}</h5>
                                <p className="text-xs text-muted-foreground">{behavior.description}</p>
                              </div>
                              
                              {/* Comments Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Employee Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee Comments</h6>
                                  <div className="min-h-[80px] p-3 bg-muted/30 rounded-md text-sm">
                                    {employeeComments || (
                                      <span className="text-muted-foreground italic">No employee comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* CEO Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CEO Comments</h6>
                                  <div className="min-h-[80px] p-3 bg-muted/30 rounded-md text-sm">
                                    {ceoComments || (
                                      <span className="text-muted-foreground italic">No CEO comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Check-in Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Check-in Comments</h6>
                                  {pdr?.status === 'END_YEAR_REVIEW' ? (
                                    <div className="min-h-[80px] p-3 bg-muted/30 rounded-md text-sm">
                                      {checkinComments || (
                                        <span className="text-muted-foreground italic">No check-in comments provided</span>
                                      )}
                                    </div>
                                  ) : (
                                    <Textarea
                                      placeholder="Add mid-year check-in notes..."
                                      value={checkinComments}
                                      onChange={(e) => saveMidYearComment(behavior.id, e.target.value, 'behavior')}
                                      className="min-h-[80px] text-sm"
                                    />
                                  )}
                                </div>
                              </div>
                              
                              {/* Ratings Display */}
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="font-medium">{employeeRating}/5</div>
                                    <div className="text-xs text-muted-foreground">Employee Rating</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-medium">{ceoRating}/5</div>
                                    <div className="text-xs text-muted-foreground">CEO Rating</div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Mid-Year Review
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Mid Year Summary */}
                  <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-primary/5 border border-primary/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Mid Year Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {goals.length > 0 && goals.some(g => g.employeeRating) 
                            ? (goals.reduce((acc, g) => acc + (g.employeeRating || 0), 0) / goals.filter(g => g.employeeRating).length).toFixed(1)
                            : '0.0'}
                        </div>
                        <div className="text-sm text-muted-foreground">Goals Average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {behaviors.length > 0 && behaviors.some(b => b.employeeRating)
                            ? (behaviors.reduce((acc, b) => acc + (b.employeeRating || 0), 0) / behaviors.filter(b => b.employeeRating).length).toFixed(1)
                            : '0.0'}
                        </div>
                        <div className="text-sm text-muted-foreground">Behaviors Average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {Math.round(((goals.filter(g => g.employeeRating && g.employeeRating > 0).length + 
                                        behaviors.filter(b => b.employeeRating && b.employeeRating > 0).length) / 
                                       (goals.length + behaviors.length)) * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Completion Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Save and Close Button or Completion Status */}
                  <div className="pt-6 border-t border-border/30">
                    {pdr?.status === 'END_YEAR_REVIEW' ? (
                      <div className="flex items-center justify-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                        <div className="text-center">
                          <div className="font-medium text-green-800">Mid-Year Review Completed</div>
                          <div className="text-sm text-green-600">
                            {pdr.midYearCompletedAt && (
                              <>Completed on {new Date(pdr.midYearCompletedAt).toLocaleDateString('en-AU', { 
                                timeZone: 'Australia/Adelaide',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}</>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => setIsMidYearSaveConfirmDialogOpen(true)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Save and Close Mid-Year Review
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="final-review" className="space-y-4">
            <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Final Year-End Review</CardTitle>
                <CardDescription>
                  Complete PDR journey for {pdr?.user?.firstName} {pdr?.user?.lastName} - from original plan through final assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Goals Section */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                    <Target className="h-6 w-6" />
                    Goals Assessment ({goals.length} goals)
                  </h3>
                  
                  {goals.map((goal, index) => {
                    const finalReview = finalGoalReviews[goal.id] || { rating: 0, comments: '' };
                    
                    return (
                      <div key={goal.id} className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm rounded-lg overflow-hidden">
                        {/* Goal Header */}
                        <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-4 border-b border-border/30">
                          <h4 className="font-semibold text-lg mb-1">{goal.title}</h4>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                        
                        {/* Three Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/20">
                          {/* Column 1: Original Plan */}
                          <div className="p-4 bg-card">
                            <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              Original Plan
                            </h5>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Goal Description</p>
                                <p className="text-sm text-foreground">{goal.description}</p>
                              </div>
                              {goal.goalMapping && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Goal Mapping</p>
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                    {goal.goalMapping === 'PEOPLE_CULTURE' ? 'People & Culture' :
                                     goal.goalMapping === 'VALUE_DRIVEN_INNOVATION' ? 'Value-Driven Innovation' :
                                     goal.goalMapping === 'OPERATING_EFFICIENCY' ? 'Operating Efficiency' :
                                     goal.goalMapping === 'CUSTOMER_EXPERIENCE' ? 'Customer Experience' : goal.goalMapping}
                                  </Badge>
                                </div>
                              )}
                              {goal.successCriteria && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Success Criteria (Legacy)</p>
                                  <p className="text-sm text-foreground">{goal.successCriteria}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Column 2: Mid-Year Check-in */}
                          <div className="p-4 bg-muted/30">
                            <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-amber-600" />
                              Mid-Year Check-in
                            </h5>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Employee Progress</p>
                                <p className="text-sm text-foreground">{goal.employeeProgress || 'No progress notes provided'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CEO Check-in Notes</p>
                                <p className="text-sm text-foreground">{midYearGoalComments[goal.id] || 'No check-in notes'}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Column 3: Final Review */}
                          <div className="p-4 bg-card">
                            <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Final Review
                            </h5>
                            <div className="space-y-3">
                              {/* Employee Self-Assessment */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Employee Final Self-Assessment</p>
                                <div className="bg-muted/50 p-2 rounded-md border border-border/50">
                                  <p className="text-sm text-foreground">{goal.employeeFinalComments || 'No final comments provided'}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
                                    <span className="font-semibold text-sm text-foreground">{goal.employeeFinalRating || goal.employeeRating || 0}/5</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* CEO Final Assessment */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CEO Final Rating</p>
                                <div className="flex items-center gap-1.5 mb-2">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                      key={rating}
                                      onClick={() => saveFinalGoalReview(goal.id, 'rating', rating)}
                                      className={`w-7 h-7 rounded-full border-2 text-xs font-medium transition-colors ${
                                        finalReview.rating >= rating
                                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                          : 'border-border hover:border-primary/50 hover:bg-accent text-muted-foreground'
                                      }`}
                                    >
                                      {rating}
                                    </button>
                                  ))}
                                  <span className="ml-1 text-sm font-medium text-foreground">
                                    {finalReview.rating}/5
                                  </span>
                                </div>
                                
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CEO Final Comments</p>
                                <Textarea
                                  placeholder="Final assessment and comments..."
                                  value={finalReview.comments}
                                  onChange={(e) => saveFinalGoalReview(goal.id, 'comments', e.target.value)}
                                  className="min-h-[60px] text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Goals Summary */}
                  {goals.length > 0 && (
                    <div className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm rounded-lg p-6">
                      <h4 className="font-semibold text-foreground mb-4">Goals Final Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            {Object.values(finalGoalReviews).reduce((sum, review) => sum + (review.rating || 0), 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">CEO Total Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            {goals.length * 5}
                          </div>
                          <div className="text-sm text-muted-foreground">Possible Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            {goals.length > 0 
                              ? ((Object.values(finalGoalReviews).reduce((sum, review) => sum + (review.rating || 0), 0) / (goals.length * 5)) * 100).toFixed(1)
                              : 0}%
                          </div>
                          <div className="text-sm text-muted-foreground">Achievement Rate</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Behaviors Section */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border/50 pb-2">
                    <TrendingUp className="h-6 w-6" />
                    Behaviors Assessment ({behaviors.length} behaviors)
                  </h3>
                  
                  {behaviors.map((behavior, index) => {
                    const finalReview = finalBehaviorReviews[behavior.id] || { rating: 0, comments: '' };
                    
                    return (
                      <div key={behavior.id} className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm rounded-lg overflow-hidden">
                        {/* Behavior Header */}
                        <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-4 border-b border-border/30">
                          <h4 className="font-semibold text-lg mb-1">{behavior.value?.name}</h4>
                          <p className="text-sm text-muted-foreground">{behavior.description}</p>
                        </div>
                        
                        {/* Three Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/20">
                          {/* Column 1: Original Plan */}
                          <div className="p-4 bg-card">
                            <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              Original Plan
                            </h5>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Company Value</p>
                                <p className="text-sm font-semibold text-foreground">{behavior.value?.name}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Behavior Description</p>
                                <p className="text-sm text-foreground">{behavior.description}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Column 2: Mid-Year Check-in */}
                          <div className="p-4 bg-muted/30">
                            <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-amber-600" />
                              Mid-Year Check-in
                            </h5>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Employee Examples</p>
                                <p className="text-sm text-foreground">{behavior.employeeExamples || 'No examples provided'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CEO Check-in Notes</p>
                                <p className="text-sm text-foreground">{midYearBehaviorComments[behavior.id] || 'No check-in notes'}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Column 3: Final Review */}
                          <div className="p-4 bg-card">
                            <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Final Review
                            </h5>
                            <div className="space-y-3">
                              {/* Employee Self-Assessment */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Employee Final Self-Assessment</p>
                                <div className="bg-muted/50 p-2 rounded-md border border-border/50">
                                  <p className="text-sm text-foreground">{behavior.employeeFinalComments || 'No final comments provided'}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
                                    <span className="font-semibold text-sm text-foreground">{behavior.employeeFinalRating || behavior.employeeRating || 0}/5</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* CEO Final Assessment */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CEO Final Rating</p>
                                <div className="flex items-center gap-1.5 mb-2">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                      key={rating}
                                      onClick={() => saveFinalBehaviorReview(behavior.id, 'rating', rating)}
                                      className={`w-7 h-7 rounded-full border-2 text-xs font-medium transition-colors ${
                                        finalReview.rating >= rating
                                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                          : 'border-border hover:border-primary/50 hover:bg-accent text-muted-foreground'
                                      }`}
                                    >
                                      {rating}
                                    </button>
                                  ))}
                                  <span className="ml-1 text-sm font-medium text-foreground">
                                    {finalReview.rating}/5
                                  </span>
                                </div>
                                
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CEO Final Comments</p>
                                <Textarea
                                  placeholder="Final assessment and comments..."
                                  value={finalReview.comments}
                                  onChange={(e) => saveFinalBehaviorReview(behavior.id, 'comments', e.target.value)}
                                  className="min-h-[60px] text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Behaviors Summary */}
                  {behaviors.length > 0 && (
                    <div className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm rounded-lg p-6">
                      <h4 className="font-semibold text-foreground mb-4">Behaviors Final Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            {Object.values(finalBehaviorReviews).reduce((sum, review) => sum + (review.rating || 0), 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">CEO Total Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            {behaviors.length * 5}
                          </div>
                          <div className="text-sm text-muted-foreground">Possible Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            {behaviors.length > 0 
                              ? ((Object.values(finalBehaviorReviews).reduce((sum, review) => sum + (review.rating || 0), 0) / (behaviors.length * 5)) * 100).toFixed(1)
                              : 0}%
                          </div>
                          <div className="text-sm text-muted-foreground">Achievement Rate</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Review Actions */}
                <div className="pt-6 border-t border-border/30 flex justify-end">
                  <Button className="bg-primary hover:bg-primary/90">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Final Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Validation Error Dialog */}
      <AlertDialog open={isValidationErrorDialogOpen} onOpenChange={setIsValidationErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Please complete all required feedback before submitting the review:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-red-600">{error}</li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsValidationErrorDialogOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mid-Year Save and Close Confirmation Dialog */}
      <AlertDialog open={isMidYearSaveConfirmDialogOpen} onOpenChange={setIsMidYearSaveConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Mid-Year Review</AlertDialogTitle>
            <AlertDialogDescription>
              This will save all your mid-year check-in comments and move the PDR to the Final Review phase. 
              The PDR will then be available for year-end review filtering.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMidYearSaveAndClose}>
              Save and Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

