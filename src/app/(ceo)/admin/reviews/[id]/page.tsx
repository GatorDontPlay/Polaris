'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  User,
  Calendar,
  Target,
  TrendingUp,
  FileText,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Plus,
  Minus,
  HelpCircle,
  PenLine,
  Save,
} from 'lucide-react';
import { formatDateAU, getPDRStatusLabel } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';
import { BehaviorReviewSection, type BehaviorReviewSectionRef } from '@/components/ceo/behavior-review-section';
import { useAuth } from '@/providers/supabase-auth-provider';

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
  goalMapping?: 'PEOPLE_CULTURE' | 'VALUE_DRIVEN_INNOVATION' | 'OPERATING_EFFICIENCY' | 'CUSTOMER_EXPERIENCE';
  weighting: number;
  employeeRating?: number;
  ceoRating?: number;
  employeeProgress?: string;
}

interface Behavior {
  id: string;
  title?: string;
  description: string;
  examples?: string;
  selfRating?: number;
  managerRating?: number;
  comments?: string;
  employeeRating?: number;
  ceoRating?: number;
  employeeExamples?: string;
  ceoComments?: string;
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
  const { user: currentUser } = useAuth();
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
    ceoGoalMapping?: 'PEOPLE_CULTURE' | 'VALUE_DRIVEN_INNOVATION' | 'OPERATING_EFFICIENCY' | 'CUSTOMER_EXPERIENCE';
  }>>({});
  
  
  // Mid-year check-in comments state
  const [midYearGoalComments, setMidYearGoalComments] = useState<Record<string, string>>({});
  const [midYearBehaviorComments, setMidYearBehaviorComments] = useState<Record<string, string>>({});
  
  // Employee mid-year review data removed - not implemented
  
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
  const [isMidYearSaveConfirmDialogOpen, setIsMidYearSaveConfirmDialogOpen] = useState(false);
  
  // How to Complete modal states
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [showMidYearHowToModal, setShowMidYearHowToModal] = useState(false);
  
  // Validation error dialog state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidationErrorDialogOpen, setIsValidationErrorDialogOpen] = useState(false);

  // State to force re-render of metrics when localStorage changes
  const [metricsRefreshKey, setMetricsRefreshKey] = useState(0);
  
  // Salary review tab state
  const [cpiValue, setCpiValue] = useState<number>(2.5); // Default CPI value
  const [performanceValue, setPerformanceValue] = useState<number>(5.0); // Default Performance Based Increase value
  const [currentSalaryInput, setCurrentSalaryInput] = useState<string>('85000'); // CEO editable current salary
  const employeeRole = 'Developer';
  const [salaryBandPosition, setSalaryBandPosition] = useState<number>(50); // Position in salary band (%)
  const [salaryBandLabel, setSalaryBandLabel] = useState<string>('Mid-range');
  
  // Salary band min/max values
  const salaryBandMin = 75000;
  const salaryBandTarget = 95000;
  const salaryBandMax = 115000;

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
  
  // Mid-year save and close confirmation dialog state is declared above (line 185)

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



  // Local state for meeting booked status
  const [meetingBooked, setMeetingBooked] = useState(pdr?.meetingBooked || false);
  
  // Computed values for salary review
  // Parse current salary from input
  const currentSalary = parseFloat(currentSalaryInput.replace(/,/g, '')) || 85000;
  
  // Calculate CPI increase
  const cpiIncrease = currentSalary * (cpiValue / 100);
  // Calculate performance based increase
  const performanceIncrease = currentSalary * (performanceValue / 100);
  
  // Calculate new salary with both increases
  const newSalary = currentSalary + cpiIncrease + performanceIncrease;
  const newSuper = newSalary * 0.12; // 12% super
  const newTotal = newSalary + newSuper;
  const annualIncrease = newSalary - currentSalary;
  
  // Calculate positions for salary band visualization
  const bandRange = salaryBandMax - salaryBandMin;
  const currentSalaryPosition = ((currentSalary - salaryBandMin) / bandRange) * 100;
  const newSalaryPosition = ((newSalary - salaryBandMin) / bandRange) * 100;
  
  // Ensure positions are within 0-100% range
  const boundedCurrentPosition = Math.min(100, Math.max(0, currentSalaryPosition));
  const boundedNewPosition = Math.min(100, Math.max(0, newSalaryPosition));
  
  // Determine salary band label based on new salary
  // Set label directly without useEffect to avoid potential issues
  let bandLabel = 'Mid-range';
  if (newSalary < salaryBandTarget * 0.9) {
    bandLabel = 'Lower range';
  } else if (newSalary > salaryBandTarget * 1.1) {
    bandLabel = 'Upper range';
  }
  
  // Update state values directly
  if (salaryBandLabel !== bandLabel) {
    setSalaryBandLabel(bandLabel);
  }
  if (salaryBandPosition !== boundedNewPosition) {
    setSalaryBandPosition(boundedNewPosition);
  }

  // Handle meeting booked status change
  const handleMeetingBookedChange = (isBooked: boolean) => {
    // Update local state immediately for visual feedback
    setMeetingBooked(isBooked);
  };



  // Separate handlers for goals and behaviors to avoid closure issues
  const handleGoalCommentChange = useCallback((goalId: string, comment: string) => {
    setMidYearGoalComments(prevComments => {
      const updatedComments = { ...prevComments, [goalId]: comment };
      localStorage.setItem(`mid_year_goal_comments_${pdrId}`, JSON.stringify(updatedComments));
      return updatedComments;
    });
  }, [pdrId]);

  const handleBehaviorCommentChange = useCallback((behaviorId: string, comment: string) => {
    setMidYearBehaviorComments(prevComments => {
      const updatedComments = { ...prevComments, [behaviorId]: comment };
      localStorage.setItem(`mid_year_behavior_comments_${pdrId}`, JSON.stringify(updatedComments));
      return updatedComments;
    });
  }, [pdrId]);

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

  // Save mid-year check-in comments without closing the review
  const handleSaveMidYearComments = () => {
    if (!pdr) return;
    
    
    // Save all mid-year comments to localStorage
    localStorage.setItem(`mid_year_goal_comments_${pdrId}`, JSON.stringify(midYearGoalComments));
    localStorage.setItem(`mid_year_behavior_comments_${pdrId}`, JSON.stringify(midYearBehaviorComments));
    
    // Show success message
    toast({
      title: "Comments Saved",
      description: "Your mid-year comments have been saved successfully.",
    });
    
  };
  
  // Save mid-year check-in and update status to Final Review
  const handleSaveMidYearReview = () => {
    if (!pdr) return;
    
    
    // First save all comments
    localStorage.setItem(`mid_year_goal_comments_${pdrId}`, JSON.stringify(midYearGoalComments));
    localStorage.setItem(`mid_year_behavior_comments_${pdrId}`, JSON.stringify(midYearBehaviorComments));
    
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
    
    
    // Trigger a storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: `demo_pdr_${pdrId}`,
      newValue: JSON.stringify(updatedPDR),
      storageArea: localStorage
    }));
    
    setIsMidYearSaveConfirmDialogOpen(false);
    
    // Show success message
    toast({
      title: "Mid-Year Review Completed",
      description: "The PDR has been moved to the End-Year Review phase.",
      // variant: "success",  // success variant not available, using default
    });
    
  };

  // Validate that CEO has provided comprehensive feedback for planning stage
  const validateCEOFeedback = () => {
    
    const validationErrors: string[] = [];
    
    // Check goals feedback - validate CEO feedback from localStorage
    const getCeoGoalFeedback = () => {
      if (typeof window === 'undefined') return {};
      const savedData = localStorage.getItem(`ceo_goal_feedback_${pdrId}`);
      return savedData ? JSON.parse(savedData) : {};
    };
    
    const realCeoGoalFeedback = getCeoGoalFeedback();
    
    goals.forEach((goal) => {
      const feedback = realCeoGoalFeedback[goal.id];
      
      // For planning stage, require at least one form of CEO feedback
      const hasFeedback = feedback && (
        (feedback.ceoTitle && feedback.ceoTitle.trim()) ||
        (feedback.ceoDescription && feedback.ceoDescription.trim()) ||
        (feedback.ceoComments && feedback.ceoComments.trim()) ||
        (feedback.ceoRating && feedback.ceoRating > 0)
      );
      
      if (!hasFeedback) {
        validationErrors.push(`Goal "${goal.title}" - Missing CEO feedback`);
      }
    });
    
    // FIXED: Use the same data source as display logic - check behaviors array from API
    
    // Count completed main behaviors from the behaviors array (same as display logic)
    let completedMainBehaviors = 0;
    if (behaviors && behaviors.length > 0) {
      completedMainBehaviors = behaviors.filter(behavior => {
        const behaviorData = behavior as any; // Runtime structure
        const hasNotes = behaviorData.ceoComments && behaviorData.ceoComments.trim().length > 0;
        const hasRating = behaviorData.ceoRating && behaviorData.ceoRating > 0;
        
        
        return hasNotes || hasRating;
      }).length;
    }
    
    
    // Check additional behaviors (self-reflection and deep dive) from localStorage
    const getAdditionalCeoFeedback = () => {
      if (typeof window === 'undefined') return {};
      const savedData = localStorage.getItem(`ceo_additional_feedback_${pdrId}`);
      return savedData ? JSON.parse(savedData) : {};
    };
    
    const additionalCeoFeedback = getAdditionalCeoFeedback();
    
    let completedAdditionalBehaviors = 0;
    if (additionalCeoFeedback) {
      const hasSelfReflection = additionalCeoFeedback.selfReflection && additionalCeoFeedback.selfReflection.trim().length > 0;
      const hasDeepDive = additionalCeoFeedback.deepDive && additionalCeoFeedback.deepDive.trim().length > 0;
      
      
      if (hasSelfReflection) completedAdditionalBehaviors++;
      if (hasDeepDive) completedAdditionalBehaviors++;
    }
    
    const totalCompletedBehaviors = completedMainBehaviors + completedAdditionalBehaviors;
    const totalRequiredBehaviors = 6; // 4 main + 2 additional
    
    
    if (totalCompletedBehaviors < totalRequiredBehaviors) {
      const missingCount = totalRequiredBehaviors - totalCompletedBehaviors;
      validationErrors.push(`${missingCount} behavior(s) missing CEO feedback`);
    }
    
    return validationErrors;
  };

  // Save all CEO feedback and lock the review
  const handleSaveAndLockReview = async () => {
    if (!pdr) return;
    
    
    // Validate feedback completeness
    const errors = validateCEOFeedback();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsValidationErrorDialogOpen(true);
      setIsLockConfirmDialogOpen(false); // Close confirmation dialog
      return;
    }
    
    try {
      // Get additional CEO feedback
      const getAdditionalCeoFeedback = () => {
        if (typeof window === 'undefined') return {};
        const savedData = localStorage.getItem(`ceo_additional_feedback_${pdrId}`);
        return savedData ? JSON.parse(savedData) : {};
      };
      
      const additionalCeoFeedback = getAdditionalCeoFeedback();
      
      // First save all CEO feedback to localStorage (for persistence)
    const ceoReviewData = {
      goalFeedback: ceoGoalFeedback,
      // behaviorFeedback removed - handled by BehaviorReviewSection
        additionalFeedback: additionalCeoFeedback || {},
      reviewedAt: new Date().toISOString(),
        reviewedBy: 'CEO'
    };
    
      // Save CEO review data to localStorage
    localStorage.setItem(`ceo_review_${pdrId}`, JSON.stringify(ceoReviewData));
      
      // Call the API to transition the PDR state
      const response = await fetch(`/api/pdrs/${pdrId}/submit-ceo-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ DETAILED API ERROR ANALYSIS:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData: errorData,
          message: errorData?.message || 'No message provided',
          details: errorData?.details || 'No details provided',
          errors: errorData?.errors || 'No errors array provided',
          validationErrors: errorData?.validationErrors || 'No validation errors provided',
          fullErrorObject: JSON.stringify(errorData, null, 2)
        });
        
        // Also log the request payload that was sent
        console.error('📤 REQUEST PAYLOAD SENT TO API:', {
          pdrId: pdrId,
          method: 'POST',
          endpoint: `/api/pdrs/${pdrId}/submit-ceo-review`
        });
        
        throw new Error(errorData.message || 'Failed to save plan');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit CEO review');
      }

      // Transform the API response data to match expected interface
      const pdrData = result.data;
      const transformedPDR = {
        id: pdrData.id,
        userId: pdrData.userId || pdrData.user_id,
        status: pdrData.status,
        currentStep: pdrData.currentStep || pdrData.current_step || 1,
        isLocked: pdrData.isLocked || pdrData.is_locked || false,
        meetingBooked: pdrData.meetingBooked || false,
        fyLabel: pdrData.fyLabel || pdrData.fy_label || 'Unknown',
        fyStartDate: pdrData.fyStartDate || pdrData.fy_start_date,
        fyEndDate: pdrData.fyEndDate || pdrData.fy_end_date,
        createdAt: pdrData.createdAt || pdrData.created_at,
        updatedAt: pdrData.updatedAt || pdrData.updated_at,
        submittedAt: pdrData.submittedAt || pdrData.submitted_at,
        ceoFields: pdrData.ceoFields || pdrData.ceo_fields,
        user: {
          firstName: pdrData.user?.firstName || pdrData.user?.first_name || 'Unknown',
          lastName: pdrData.user?.lastName || pdrData.user?.last_name || 'User',
          email: pdrData.user?.email || 'unknown@example.com'
        }
      };
      
      // Update local state
      setPdr(transformedPDR);
      
      // Also update localStorage for demo persistence
      localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(transformedPDR));
      localStorage.setItem('demo_current_pdr', JSON.stringify(transformedPDR));
    
    // Trigger a storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: `demo_pdr_${pdrId}`,
      newValue: JSON.stringify(transformedPDR),
      storageArea: localStorage
    }));
    
    setIsLockConfirmDialogOpen(false);
    
    // Show success message
    setTimeout(() => {
    }, 1000);
      
    } catch (error) {
      setIsLockConfirmDialogOpen(false);
      // You could show an error toast here
      alert('Failed to save plan. Please try again.');
    }
  };

  const handleOpenLockConfirmDialog = () => {
    const errors = validateCEOFeedback();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsValidationErrorDialogOpen(true);
      return;
    }
    setIsLockConfirmDialogOpen(true);
  };

  const handleCompleteFinalReview = () => {
    if (!pdr) return;
    
    
    // Update PDR status to CALIBRATION to move it to calibration phase
    const updatedPdr = {
      ...pdr,
      status: 'COMPLETED',
      finalReviewCompletedAt: new Date().toISOString(),
      finalReviewCompletedBy: 'CEO', // In a real app, this would be the current user
      updatedAt: new Date().toISOString()
    };
    
    // Save updated PDR to localStorage
    localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(updatedPdr));
    localStorage.setItem(`demo_current_pdr`, JSON.stringify(updatedPdr));
    
    // Trigger custom events to update other components
    window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
    window.dispatchEvent(new CustomEvent('demo-audit-updated'));
    
    
    // Show success message
    alert('Final review completed successfully! PDR has been moved to calibration phase.');
    
    // Optionally redirect back to dashboard
    // router.push('/admin/dashboard');
  };

  useEffect(() => {
    const loadPDRData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch PDR data from API
        const response = await fetch(`/api/pdrs/${pdrId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDR: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch PDR data');
        }

        const pdrData = result.data;
        console.log('📋 CEO Review: Loaded PDR from API:', { id: pdrData.id, status: pdrData.status });

        // Transform PDR data to match expected interface
        setPdr({
          id: pdrData.id,
          userId: pdrData.userId || pdrData.user_id,
          status: pdrData.status,
          currentStep: pdrData.currentStep || pdrData.current_step || 1,
          isLocked: pdrData.isLocked || pdrData.is_locked || false,
          meetingBooked: pdrData.meetingBooked || false,
          fyLabel: pdrData.fyLabel || pdrData.fy_label || 'Unknown',
          fyStartDate: pdrData.fyStartDate || pdrData.fy_start_date,
          fyEndDate: pdrData.fyEndDate || pdrData.fy_end_date,
          createdAt: pdrData.createdAt || pdrData.created_at,
          updatedAt: pdrData.updatedAt || pdrData.updated_at,
          submittedAt: pdrData.submittedAt || pdrData.submitted_at,
          ceoFields: pdrData.ceoFields || pdrData.ceo_fields,
          user: {
            firstName: pdrData.user?.firstName || pdrData.user?.first_name || 'Unknown',
            lastName: pdrData.user?.lastName || pdrData.user?.last_name || 'User',
            email: pdrData.user?.email || 'unknown@example.com'
          }
        });

        // Load goals from API data (already included in PDR response)
        if (pdrData.goals && Array.isArray(pdrData.goals)) {
          setGoals(pdrData.goals.map((goal: any) => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            targetDate: goal.targetDate || goal.target_date,
            priority: goal.priority,
            status: goal.status || 'NOT_STARTED',
            progress: goal.progress || 0,
            goalMapping: goal.goalMapping || goal.goal_mapping,
            weighting: goal.weighting,
            employeeRating: goal.employeeRating || goal.employee_rating,
            ceoRating: goal.ceoRating || goal.ceo_rating,
            employeeProgress: goal.employeeProgress || goal.employee_progress
          })));
          console.log('✅ CEO Review: Loaded goals from API:', pdrData.goals.length);
        }

        // Load behaviors from organized behavior data API (separate call)
        try {
          const behaviorResponse = await fetch(`/api/pdrs/${pdrId}/behavior-entries/organized`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (behaviorResponse.ok) {
            const behaviorResult = await behaviorResponse.json();
            if (behaviorResult.success && behaviorResult.data) {
              const organizedBehaviors = behaviorResult.data;
              
              const flatBehaviors = organizedBehaviors.flatMap((valueData: any) => 
                (valueData.employeeEntries || []).map((behavior: any) => ({
                  id: behavior.id,
                  description: behavior.description || '',
                  employeeRating: behavior.rating,
                  ceoRating: behavior.ceoRating,
                  employeeExamples: behavior.examples,
                  ceoComments: behavior.comments, // CEO comments are stored in the comments field
                  value: valueData.companyValue
                }))
              );
              setBehaviors(flatBehaviors);
              console.log('✅ CEO Review: Loaded behaviors from organized API:', flatBehaviors.length);
            }
          }
        } catch (behaviorError) {
          console.error('Failed to load organized behavior data:', behaviorError);
          // Fallback to PDR response behaviors if available
          if (pdrData.behaviors && Array.isArray(pdrData.behaviors)) {
            setBehaviors(pdrData.behaviors.map((behavior: any) => ({
              id: behavior.id,
              description: behavior.description || behavior.employee_comments || '',
              employeeRating: behavior.employeeRating || behavior.employee_rating,
              ceoRating: behavior.ceoRating || behavior.ceo_rating,
              employeeExamples: behavior.employeeExamples || behavior.employee_examples,
              ceoComments: behavior.ceoComments || behavior.ceo_comments,
              value: behavior.value || behavior.company_value
            })));
            console.log('✅ CEO Review: Loaded behaviors from PDR API (fallback):', pdrData.behaviors.length);
          }
        }

        setIsLoading(false);
          } catch (error) {
        console.error('❌ CEO Review: Error loading PDR data:', error);
        setIsLoading(false);
      }

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
  
  // Format goal mapping to human-readable text
  const formatGoalMapping = (mapping?: string) => {
    if (!mapping) return "Not mapped";
    
    switch (mapping) {
      case "PEOPLE_CULTURE":
        return "People & Culture";
      case "VALUE_DRIVEN_INNOVATION":
        return "Value-Driven Innovation";
      case "OPERATING_EFFICIENCY":
        return "Operating Efficiency";
      case "CUSTOMER_EXPERIENCE":
        return "Customer Experience";
      default:
        return mapping;
    }
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
        const saved = await saveAllCeoFeedback();
        if (saved) {
          setActiveTab(value);
        }
      } 
      // If navigating from behaviors tab, save behavior feedback first
      else if (activeTab === "behaviors" && value !== "behaviors") {
        console.log('💾 Saving behavior feedback before tab change...');
        if (behaviorReviewRef.current) {
          const saved = await behaviorReviewRef.current.saveAllReviews();
          console.log(`Behavior feedback save result: ${saved}`);
          if (saved) {
            setActiveTab(value);
          } else {
            console.warn('Failed to save behavior feedback, but allowing navigation');
            setActiveTab(value);
          }
        } else {
          console.warn('No behavior review ref found, allowing navigation');
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
  
  // Function to save all CEO feedback to the PDR ceoFields
  const saveAllCeoFeedback = async () => {
    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('Save blocked: Already saving');
      return false;
    }

    console.log('Starting saveAllCeoFeedback function...');
    setIsSaving(true);
    try {
      if (!pdr) {
        console.error('PDR data not found');
        throw new Error('PDR data not found');
      }
      
      console.log('PDR data found:', pdr.id);
      
      // Behavior feedback is handled by BehaviorReviewSection component directly
      
             // Log the data we're about to save - behavior feedback handled separately
       
       // Prepare the ceoFields data with goal feedback (behaviors handled separately)
        const ceoFields = {
          ...(pdr.ceoFields as Record<string, any> || {}),
         goalFeedback: ceoGoalFeedback || {},
         // behaviorFeedback removed - handled by BehaviorReviewSection
        };
      
      // Check if we're in demo mode
      const isDemo = typeof window !== 'undefined' && localStorage.getItem('demo_user');
      
      if (isDemo) {
        // For demo mode, save locally and update state immediately
        console.log('Demo mode: Saving CEO feedback locally', ceoFields);
        
        try {
          // Save to localStorage for demo persistence
          const demoDataKey = `demo_pdr_ceo_fields_${pdrId}`;
          
          // Save goal feedback separately for more reliable storage
          if (ceoGoalFeedback) {
            console.log('Saving goal feedback to localStorage');
            localStorage.setItem(`ceo_goal_feedback_${pdrId}`, JSON.stringify(ceoGoalFeedback));
          }
          
          // Behavior feedback saving removed - handled by BehaviorReviewSection
          
          
          // Save combined ceoFields
          console.log('Saving combined ceoFields to localStorage');
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
            description: 'All CEO feedback saved successfully (Demo mode)',
          });
          
          // Trigger metrics refresh
          refreshMetrics();
          window.dispatchEvent(new CustomEvent('ceo-feedback-updated'));
          
          return true;
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
          toast({
            title: 'Storage Error',
            description: 'Failed to save your feedback. Local storage may be full or unavailable.',
            variant: 'destructive',
          });
          return false;
        }
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
          description: 'All CEO feedback saved successfully',
        });
        
        // Trigger metrics refresh
        refreshMetrics();
        window.dispatchEvent(new CustomEvent('ceo-feedback-updated'));
        
        return true;
      }
    } catch (error) {
      console.error('Error saving CEO feedback:', error);
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Check if localStorage is available
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          // Try a simple localStorage operation to check if it's working
          localStorage.setItem('test_storage', 'test');
          localStorage.removeItem('test_storage');
          console.log('localStorage is working properly');
        } catch (storageError) {
          console.error('localStorage error:', storageError);
        }
      }
      
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
        const saved = await saveAllCeoFeedback();
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
                  {pdr.fyStartDate ? formatDateAU(pdr.fyStartDate) : 'Invalid Date'} - {pdr.fyEndDate ? formatDateAU(pdr.fyEndDate) : 'Invalid Date'}
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
                      {pdr.createdAt ? formatDateAU(pdr.createdAt) : 'Invalid Date'}
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
              <TabsTrigger value="salary-review" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Salary Review
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
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Performance Goals</CardTitle>
                    <CardDescription>
                      Employee's performance goals and progress for {pdr.fyLabel}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowHowToModal(true)}
                    className="ml-2"
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    How to Complete
                  </Button>
                </div>
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
                          <div className="space-y-4 border border-red-500/20 rounded-md p-4 bg-red-500/5">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-red-500">Employee Goal</h4>
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
                              <Label className="text-sm font-medium">Strategic Pillar</Label>
                              <div className="mt-1 p-2 bg-muted/50 rounded text-sm h-9 flex items-center">
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                                  {formatGoalMapping(goal.goalMapping)}
                                </Badge>
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
                            
                          </div>

                          {/* CEO Side */}
                          <div className="space-y-4 border border-green-600/20 rounded-md p-4 bg-green-600/5">
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
                              <Label htmlFor={`ceo-goal-mapping-${goal.id}`} className="text-sm font-medium">
                                Strategic Pillar
                              </Label>
                              <Select
                                defaultValue={
                                  // Use CEO's mapping if available, otherwise use employee's mapping
                                  (pdr && (pdr.ceoFields as any)?.goalFeedback && 
                                   (pdr.ceoFields as any).goalFeedback[goal.id]?.ceoGoalMapping !== undefined) 
                                    ? (pdr.ceoFields as any).goalFeedback[goal.id].ceoGoalMapping 
                                    : goal.goalMapping || ''
                                }
                                onValueChange={(value) => updateCeoGoalFeedback(goal.id, 'ceoGoalMapping', value)}
                                disabled={pdr?.isLocked}
                              >
                                <SelectTrigger 
                                  id={`ceo-goal-mapping-${goal.id}`}
                                  className="mt-1 h-9 bg-muted/30 border-purple-500/20 focus:ring-purple-500/30 text-purple-400"
                                >
                                  <SelectValue placeholder="Select strategic pillar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PEOPLE_CULTURE">People & Culture</SelectItem>
                                  <SelectItem value="VALUE_DRIVEN_INNOVATION">Value-Driven Innovation</SelectItem>
                                  <SelectItem value="OPERATING_EFFICIENCY">Operating Efficiency</SelectItem>
                                  <SelectItem value="CUSTOMER_EXPERIENCE">Customer Experience</SelectItem>
                                </SelectContent>
                              </Select>
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
                                    : goal.weighting || ''
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
              currentUser={currentUser as any} 
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


                    const getAdditionalCeoFeedback = () => {
                      if (typeof window === 'undefined') return {};
                      const savedData = localStorage.getItem(`ceo_additional_feedback_${pdrId}`);
                      const parsedData = savedData ? JSON.parse(savedData) : {};
                      console.log('Raw additional CEO feedback from localStorage:', parsedData);
                      return parsedData;
                    };

                    const realCeoGoalFeedback = getCeoGoalFeedback();
                    // Real CEO behavior feedback calculation removed - handled by BehaviorReviewSection
                    const additionalCeoFeedback = getAdditionalCeoFeedback();

                    // Calculate completion based on real system data
                    const totalBehaviors = 6; // Fixed count of 6 company values/behaviors
                    const totalGoals = goals.length;
                    const totalItems = totalGoals + totalBehaviors; // Goals + Behaviors only
                    
                    console.log('Total behaviors (fixed count):', totalBehaviors);
                    console.log('Total goals:', totalGoals);

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
                    
                    // Count main behaviors (4 company values) from loaded behavior data
                    let completedMainBehaviors = 0;
                    if (behaviors && behaviors.length > 0) {
                      completedMainBehaviors = behaviors.filter(behavior => {
                        const behaviorData = behavior as any; // Runtime structure differs from type
                        const hasNotes = behaviorData.ceoComments && behaviorData.ceoComments.trim().length > 0;
                        const hasRating = behaviorData.ceoRating && behaviorData.ceoRating > 0;
                        return hasNotes || hasRating;
                      }).length;
                    }
                    
                    // Count additional behaviors (2 sections: self-reflection and deep dive)
                    let completedAdditionalBehaviors = 0;
                    if (additionalCeoFeedback) {
                      const hasSelfReflection = additionalCeoFeedback.selfReflection && additionalCeoFeedback.selfReflection.trim().length > 0;
                      const hasDeepDive = additionalCeoFeedback.deepDive && additionalCeoFeedback.deepDive.trim().length > 0;
                      
                      if (hasSelfReflection) completedAdditionalBehaviors++;
                      if (hasDeepDive) completedAdditionalBehaviors++;
                    }
                    
                    const completedBehaviors = completedMainBehaviors + completedAdditionalBehaviors;
                    
                    console.log('Behavior completion breakdown:');
                    console.log('- Main behaviors (4 company values):', completedMainBehaviors, '/ 4');
                    console.log('- Additional behaviors (2 sections):', completedAdditionalBehaviors, '/ 2'); 
                    console.log('- Total completed behaviors:', completedBehaviors, '/ 6');
                    
                    // Use the accurate completed behaviors count (no more overrides needed)
                    const adjustedCompletedBehaviors = Math.min(completedBehaviors, totalBehaviors);
                    
                    const completedItems = completedGoals + adjustedCompletedBehaviors;
                    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                    
                    // Log the final calculation
                    console.log('Final adjusted behaviors:', adjustedCompletedBehaviors);
                    console.log('Completed items:', completedItems, 'out of', totalItems);
                    console.log('Completion percentage:', completionPercentage, '%');
                    
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
                            <div className="font-bold text-sm">{adjustedCompletedBehaviors}/{totalBehaviors}</div>
                            <div className="text-muted-foreground">Behaviors</div>
                          </div>
                        </div>
                        
                        {/* Meeting Confirmation */}
                        <div className="pt-3 border-t border-border/50">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="meeting-booked"
                              checked={meetingBooked}
                              onChange={(e) => handleMeetingBookedChange(e.target.checked)}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="meeting-booked" className="text-sm text-foreground cursor-pointer">
                              I have booked a meeting with this employee
                            </label>
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
                    {/* Save Feedback Button removed - auto-save now handles this */}
                    
                    {(() => {
                      const showButton = pdr.status === 'OPEN_FOR_REVIEW' && !pdr.isLocked;
                      console.log('🎯 Button visibility check - PDR status:', pdr.status, 'isLocked:', pdr.isLocked);
                      console.log('🎯 Expected status: OPEN_FOR_REVIEW');
                      console.log('🎯 Should show button:', showButton);
                      return showButton;
                    })() && (
                      <AlertDialog open={isLockConfirmDialogOpen} onOpenChange={setIsLockConfirmDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button onClick={handleOpenLockConfirmDialog} className="w-full">
                            <Lock className="mr-2 h-4 w-4" />
                            Save Plan
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Save Plan</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will save and lock the employee's plan. Once saved:
                              <br />• All your feedback will be saved permanently
                              <br />• The employee's goals and behaviors will be locked in for the year
                              <br />• The Mid-Year Check-in will become accessible for both you and the employee
                              <br />• The plan will be ready for mid-year review discussions
                              <br />• You won't be able to edit your feedback without unlocking
                              <br /><br />
                              Are you ready to save and lock this plan?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSaveAndLockReview}>
                              Save Plan
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

                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div><strong>Status:</strong> {getPDRStatusLabel(pdr.status as any) || pdr.status}</div>
                      <div>
                        <strong>Meeting:</strong>{' '}
                        <span className={meetingBooked ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {meetingBooked ? 'Booked' : 'Not booked'}
                        </span>
                      </div>
                      <div><strong>Submitted:</strong> {pdr.submittedAt ? formatDateAU(new Date(pdr.submittedAt)) : 'Not submitted'}</div>
                      <div><strong>Updated:</strong> {formatDateAU(new Date(pdr.updatedAt))}</div>
                    </div>
                  </div>
                  
                  </div>
                </CardContent>
              </Card>
            </div>


          </TabsContent>

          <TabsContent value="mid-year" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Mid Year Performance Review</CardTitle>
                      <CardDescription>
                        Discuss and record your mid year feedback with the employee. Identify how they're tracking, what issues may be occurring, and if the plan needs to be adjusted.
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowMidYearHowToModal(true)}
                      className="ml-2"
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      How to Complete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Employee Mid-Year Review Overview - Not implemented yet */}
                  
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
                        {goals.map((goal) => {
                          const employeeComments = ceoGoalFeedback[goal.id]?.ceoDescription || goal.description || '';
                          const ceoComments = ceoGoalFeedback[goal.id]?.ceoComments || ceoGoalFeedback[goal.id]?.ceoDescription || '';
                          const goalCheckinComments = midYearGoalComments[goal.id] || '';
                          
                          return (
                            <div key={`goal-container-${goal.id}`} className="border border-border/30 rounded-lg p-4 bg-background/50">
                              {/* Goal Header */}
                              <div className="mb-4">
                                <h5 className="font-medium text-sm mb-1">{goal.title}</h5>
                                <p className="text-xs text-muted-foreground">{goal.description}</p>
                              </div>
                              
                              {/* Comments Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Employee Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-red-500 uppercase tracking-wide flex items-center">
                                    <User className="h-3 w-3 mr-1 text-red-500" />
                                    Employee Comments
                                  </h6>
                                  <div className="min-h-[80px] p-3 bg-red-500/5 border border-red-500/20 rounded-md text-sm">
                                    {employeeComments || (
                                      <span className="text-muted-foreground italic">No employee comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* CEO Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-green-600 uppercase tracking-wide flex items-center">
                                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                                    CEO Comments
                                  </h6>
                                  <div className="min-h-[80px] p-3 bg-green-600/5 border border-green-600/20 rounded-md text-sm">
                                    {ceoComments || (
                                      <span className="text-muted-foreground italic">No CEO comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Check-in Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-blue-500 uppercase tracking-wide flex items-center">
                                    <PenLine className="h-3 w-3 mr-1 text-blue-500" />
                                    Check-in Comments
                                  </h6>
                                  {pdr?.status === 'END_YEAR_REVIEW' ? (
                                    <div className="min-h-[80px] p-3 bg-blue-500/5 border border-blue-500/20 rounded-md text-sm">
                                      {goalCheckinComments || (
                                        <span className="text-muted-foreground italic">No check-in comments provided</span>
                                      )}
                                    </div>
                                  ) : (
                                    <Textarea
                                      key={`goal-checkin-${goal.id}-${pdrId}`}
                                      id={`goal-checkin-${goal.id}-${pdrId}`}
                                      placeholder="Add mid-year check-in notes..."
                                      value={goalCheckinComments}
                                      onChange={(e) => {
                                        console.log(`Goal textarea ${goal.id} changed:`, e.target.value.substring(0, 20) + '...');
                                        handleGoalCommentChange(goal.id, e.target.value);
                                      }}
                                      className="min-h-[80px] text-sm bg-blue-500/5 border-blue-500/20 focus:border-blue-500/30 focus:ring-blue-500/20"
                                      data-goal-id={goal.id}
                                      data-type="goal"
                                    />
                                  )}
                                </div>
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
                        {behaviors.map((behavior) => {
                          const employeeComments = behavior.description || '';
                          // Get CEO comments from the actual database data
                          const ceoComments = behavior.ceoComments || '';
                          const behaviorUniqueId = behavior.value?.id || behavior.valueId || behavior.id;
                          const behaviorCheckinComments = midYearBehaviorComments[behaviorUniqueId] || '';
                          
                          return (
                            <div key={`behavior-container-${behaviorUniqueId}`} className="border border-border/30 rounded-lg p-4 bg-background/50">
                              {/* Behavior Header */}
                              <div className="mb-4">
                                <h5 className="font-medium text-sm mb-1">{behavior.value?.name}</h5>
                                <p className="text-xs text-muted-foreground">{behavior.description}</p>
                              </div>
                              
                              {/* Comments Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Employee Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-red-500 uppercase tracking-wide flex items-center">
                                    <User className="h-3 w-3 mr-1 text-red-500" />
                                    Employee Comments
                                  </h6>
                                  <div className="min-h-[80px] p-3 bg-red-500/5 border border-red-500/20 rounded-md text-sm">
                                    {employeeComments || (
                                      <span className="text-muted-foreground italic">No employee comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* CEO Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-green-600 uppercase tracking-wide flex items-center">
                                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                                    CEO Comments
                                  </h6>
                                  <div className="min-h-[80px] p-3 bg-green-600/5 border border-green-600/20 rounded-md text-sm">
                                    {ceoComments || (
                                      <span className="text-muted-foreground italic">No CEO comments provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Check-in Comments */}
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-blue-500 uppercase tracking-wide flex items-center">
                                    <PenLine className="h-3 w-3 mr-1 text-blue-500" />
                                    Check-in Comments
                                  </h6>
                                  {pdr?.status === 'END_YEAR_REVIEW' ? (
                                    <div className="min-h-[80px] p-3 bg-blue-500/5 border border-blue-500/20 rounded-md text-sm">
                                      {behaviorCheckinComments || (
                                        <span className="text-muted-foreground italic">No check-in comments provided</span>
                                      )}
                                    </div>
                                  ) : (
                                    <Textarea
                                      key={`behavior-checkin-${behaviorUniqueId}-${pdrId}`}
                                      id={`behavior-checkin-${behaviorUniqueId}-${pdrId}`}
                                      placeholder="Add mid-year check-in notes..."
                                      value={behaviorCheckinComments}
                                      onChange={(e) => {
                                        console.log(`Behavior textarea ${behaviorUniqueId} (${behavior.value?.name}) changed:`, e.target.value.substring(0, 20) + '...');
                                        handleBehaviorCommentChange(behaviorUniqueId, e.target.value);
                                      }}
                                      className="min-h-[80px] text-sm bg-blue-500/5 border-blue-500/20 focus:border-blue-500/30 focus:ring-blue-500/20"
                                      data-behavior-id={behaviorUniqueId}
                                      data-behavior-name={behavior.value?.name}
                                      data-type="behavior"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                            {(pdr as any).midYearCompletedAt && (
                              <>Completed on {new Date((pdr as any).midYearCompletedAt).toLocaleDateString('en-AU', { 
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
                      <div className="flex justify-between">
                        {/* Save Comments Button */}
                        <Button 
                          onClick={handleSaveMidYearComments}
                          variant="outline"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Comments
                        </Button>
                        
                        {/* Save and Close Button */}
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
                  
                  {goals.map((goal) => {
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
                              {(goal as any).successCriteria && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Success Criteria (Legacy)</p>
                                  <p className="text-sm text-foreground">{(goal as any).successCriteria}</p>
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
                                  <p className="text-sm text-foreground">{(goal as any).employeeFinalComments || 'No final comments provided'}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
                                    <span className="font-semibold text-sm text-foreground">{(goal as any).employeeFinalRating || goal.employeeRating || 0}/5</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* CEO Final Assessment */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1" id={`goal-rating-label-${goal.id}`}>CEO Final Rating</p>
                                <div className="flex items-center gap-1.5 mb-2" role="group" aria-labelledby={`goal-rating-label-${goal.id}`}>
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                      key={`goal-rating-${goal.id}-${rating}`}
                                      id={`goal-rating-${goal.id}-${rating}`}
                                      onClick={() => saveFinalGoalReview(goal.id, 'rating', rating)}
                                      className={`w-7 h-7 rounded-full border-2 text-xs font-medium transition-colors ${
                                        finalReview.rating >= rating
                                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                          : 'border-border hover:border-primary/50 hover:bg-accent text-muted-foreground'
                                      }`}
                                      aria-label={`Rate goal "${goal.title}" ${rating} out of 5`}
                                      aria-pressed={finalReview.rating >= rating}
                                    >
                                      {rating}
                                    </button>
                                  ))}
                                  <span className="ml-1 text-sm font-medium text-foreground">
                                    {finalReview.rating}/5
                                  </span>
                                </div>
                                
                                <Label htmlFor={`final-goal-comments-${goal.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                                  CEO Final Comments
                                </Label>
                                <Textarea
                                  id={`final-goal-comments-${goal.id}`}
                                  placeholder="Final assessment and comments..."
                                  value={finalReview.comments}
                                  onChange={(e) => saveFinalGoalReview(goal.id, 'comments', e.target.value)}
                                  className="min-h-[60px] text-sm"
                                  aria-describedby={`final-goal-comments-${goal.id}-desc`}
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
                  
                  {behaviors.map((behavior) => {
                    const behaviorUniqueId = behavior.value?.id || behavior.valueId || behavior.id;
                    const finalReview = finalBehaviorReviews[behaviorUniqueId] || { rating: 0, comments: '' };
                    
                    return (
                      <div key={`final-behavior-${behaviorUniqueId}`} className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm rounded-lg overflow-hidden">
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
                                <p className="text-sm text-foreground">{(behavior as any).employeeExamples || 'No examples provided'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CEO Check-in Notes</p>
                                <p className="text-sm text-foreground">{midYearBehaviorComments[behavior.value?.id || behavior.valueId || behavior.id] || 'No check-in notes'}</p>
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
                                  <p className="text-sm text-foreground">{(behavior as any).employeeFinalComments || 'No final comments provided'}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
                                    <span className="font-semibold text-sm text-foreground">{(behavior as any).employeeFinalRating || (behavior as any).employeeRating || 0}/5</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* CEO Final Assessment */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1" id={`behavior-rating-label-${behaviorUniqueId}`}>CEO Final Rating</p>
                                <div className="flex items-center gap-1.5 mb-2" role="group" aria-labelledby={`behavior-rating-label-${behaviorUniqueId}`}>
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                      key={`behavior-rating-${behaviorUniqueId}-${rating}`}
                                      id={`behavior-rating-${behaviorUniqueId}-${rating}`}
                                      onClick={() => saveFinalBehaviorReview(behaviorUniqueId, 'rating', rating)}
                                      className={`w-7 h-7 rounded-full border-2 text-xs font-medium transition-colors ${
                                        finalReview.rating >= rating
                                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                          : 'border-border hover:border-primary/50 hover:bg-accent text-muted-foreground'
                                      }`}
                                      aria-label={`Rate behavior "${behavior.value?.name || 'behavior'}" ${rating} out of 5`}
                                      aria-pressed={finalReview.rating >= rating}
                                    >
                                      {rating}
                                    </button>
                                  ))}
                                  <span className="ml-1 text-sm font-medium text-foreground">
                                    {finalReview.rating}/5
                                  </span>
                                </div>
                                
                                <Label htmlFor={`final-behavior-comments-${behaviorUniqueId}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                                  CEO Final Comments
                                </Label>
                                <Textarea
                                  id={`final-behavior-comments-${behaviorUniqueId}`}
                                  placeholder="Final assessment and comments..."
                                  value={finalReview.comments}
                                                                        onChange={(e) => saveFinalBehaviorReview(behaviorUniqueId, 'comments', e.target.value)}
                                  className="min-h-[60px] text-sm"
                                  aria-describedby={`final-behavior-comments-${behaviorUniqueId}-desc`}
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
                  <Button 
                    onClick={handleCompleteFinalReview}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Final Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary-review" className="space-y-4">
            <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Salary Review & Finalization</CardTitle>
                <CardDescription>
                  Complete the review process with salary adjustments and final actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Salary Review Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Compensation Review
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Current Info & CPI Slider */}
                    <div className="space-y-4">
                      <div className="bg-muted/30 p-4 rounded-md border border-border">
                        <h4 className="text-sm font-medium mb-3">Current Compensation</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Current Base Salary:</div>
                          <div className="font-medium text-right flex items-center justify-end gap-2">
                            <span className="text-sm">$</span>
                            <Input 
                              type="text"
                              value={currentSalaryInput}
                              onChange={(e) => {
                                // Only allow numbers, commas and decimal point
                                const value = e.target.value.replace(/[^0-9.,]/g, '');
                                setCurrentSalaryInput(value);
                              }}
                              className="w-32 text-right h-7 py-1"
                            />
                            <span className="text-sm">AUD</span>
                          </div>
                          <div className="text-muted-foreground">Super (12%):</div>
                          <div className="font-medium text-right">${(currentSalary * 0.12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                          <div className="text-muted-foreground">Total Package:</div>
                          <div className="font-medium text-right">${(currentSalary * 1.12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="cpi-slider" className="text-sm font-medium">
                            CPI Adjustment (%)
                          </Label>
                          <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                            {cpiValue.toFixed(2)}%
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCpiValue(Math.max(0, cpiValue - 0.25))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <div className="flex-1">
                            <Slider
                              id="cpi-slider"
                              min={0}
                              max={10}
                              step={0.01}
                              value={[cpiValue]}
                              onValueChange={(value) => setCpiValue(value[0])}
                              className="w-full"
                            />
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCpiValue(Math.min(10, cpiValue + 0.25))}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>5%</span>
                          <span>10%</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="performance-slider" className="text-sm font-medium">
                            Performance Based Increase (%)
                          </Label>
                          <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                            {performanceValue.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setPerformanceValue(Math.max(0, performanceValue - 0.5))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <div className="flex-1">
                            <Slider
                              id="performance-slider"
                              min={0}
                              max={25}
                              step={0.1}
                              value={[performanceValue]}
                              onValueChange={(value) => {
                                setPerformanceValue(value[0]);
                              }}
                              className="w-full"
                            />
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setPerformanceValue(Math.min(25, performanceValue + 0.5))}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>12.5%</span>
                          <span>25%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - New Salary & Cost Impact */}
                    <div className="space-y-4">
                      <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                        <h4 className="text-sm font-medium mb-3 text-primary">New Compensation</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">New Base Salary:</div>
                          <div className="font-medium text-right">
                            ${newSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD
                          </div>
                          <div className="text-muted-foreground">Super (12%):</div>
                          <div className="font-medium text-right">${newSuper.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                          <div className="text-muted-foreground">Total Package:</div>
                          <div className="font-medium text-right">${newTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                          <div className="text-muted-foreground mt-2">Annual Increase:</div>
                          <div className="font-bold text-green-500 text-right mt-2">
                            +${annualIncrease.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD
                          </div>
                          <div className="col-span-2 mt-1">
                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md text-right">
                              CPI: +${cpiIncrease.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} + Performance: +${performanceIncrease.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Salary Band Indicator */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Salary Band Position</h4>
                        <div className="h-8 bg-muted rounded-full overflow-hidden relative">
                          <div className="absolute inset-0 flex">
                            <div className="bg-red-500/20 h-full" style={{ width: '20%' }}></div>
                            <div className="bg-amber-500/20 h-full" style={{ width: '30%' }}></div>
                            <div className="bg-green-500/20 h-full" style={{ width: '30%' }}></div>
                            <div className="bg-blue-500/20 h-full" style={{ width: '20%' }}></div>
                          </div>
                          
                          {/* Current salary marker */}
                          <div 
                            className="absolute top-0 h-full w-2 bg-gray-400 z-10"
                            style={{ 
                              left: `${boundedCurrentPosition}%`,
                              transition: 'left 0.3s ease-in-out'
                            }}
                          >
                            <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-medium bg-gray-400 text-white px-1 py-0.5 rounded whitespace-nowrap">
                              Current
                            </div>
                          </div>
                          
                          {/* New salary marker (after increases) */}
                          <div 
                            className="absolute top-0 h-full w-2 bg-primary z-20"
                            style={{ 
                              left: `${boundedNewPosition}%`,
                              transition: 'left 0.3s ease-in-out'
                            }}
                          >
                            <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-medium bg-primary text-white px-1 py-0.5 rounded whitespace-nowrap">
                              New
                            </div>
                          </div>
                          
                          {/* Target marker */}
                          <div 
                            className="absolute top-0 h-full w-1 bg-white z-5"
                            style={{ 
                              left: `${((salaryBandTarget - salaryBandMin) / bandRange) * 100}%`
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Min (${salaryBandMin.toLocaleString()})</span>
                          <span>Target (${salaryBandTarget.toLocaleString()})</span>
                          <span>Max (${salaryBandMax.toLocaleString()})</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Position: {salaryBandLabel} of band for {employeeRole}
                        </div>
                        <div className="text-xs mt-2">
                          <span className="font-medium">Current: </span>
                          <span className="text-muted-foreground">${currentSalary.toLocaleString()} (${(currentSalary - salaryBandMin).toLocaleString()} above minimum)</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">New: </span>
                          <span className="text-primary">${newSalary.toLocaleString()} (${(newSalary - currentSalary).toLocaleString()} increase)</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
            <AlertDialogAction onClick={handleSaveMidYearReview}>
              Save and Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* How to Complete Modal */}
      <Dialog open={showHowToModal} onOpenChange={setShowHowToModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5 text-primary" />
              How to Complete Performance Goals Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              You are to review the performance goals set by the employee. Consider what they've described, and how it could be tracked/measured. Is it specific, measurable, achievable, relative to CodeFish and have a time frame? (SMART Goals).
            </p>
            <p className="text-sm">
              You are only required to validate that both the Manager and Employee agree to this plan and you will come back to review progress at the end of the year.
            </p>
            <p className="text-sm">
              Your task is to review, edit, adjust or remove the goals, their weighting and/or relevancy to the strategy.
            </p>
            <p className="text-sm">
              When complete, click Next to move onto the behaviours review.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHowToModal(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Mid Year How to Complete Modal */}
      <Dialog open={showMidYearHowToModal} onOpenChange={setShowMidYearHowToModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5 text-primary" />
              How to Complete Mid-Year Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              Review the original goals and behavioural plans you have set with the employee. Book a time to touch base with the employee and see how things are travelling.
            </p>
            <p className="text-sm">
              Now is a good time to discuss what's working, what's not working and potentially expect feedback from the employee about how you can better support them.
            </p>
            <p className="text-sm">
              Log your notes from the meeting, and set a plan to reconvene in May, to close out the financial year.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMidYearHowToModal(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

