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
  
  // End-year review data state
  const [endYearReviewData, setEndYearReviewData] = useState<{
    employeeSelfAssessment: string;
    employeeOverallRating: number;
    achievementsSummary: string;
    learningsGrowth: string;
    challengesFaced: string;
    nextYearGoals: string;
    ceoAssessment: string;
    ceoOverallRating: number;
  } | null>(null);
  
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
  
  // Salary band min/max values - now editable
  const [salaryBandMin, setSalaryBandMin] = useState<number>(75000);
  const [salaryBandTarget, setSalaryBandTarget] = useState<number>(95000);
  const [salaryBandMax, setSalaryBandMax] = useState<number>(115000);

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
  
  // Calculate total compensation (base + 12% super) for band visualization
  const currentTotal = currentSalary * 1.12;
  const newTotalComp = newSalary * 1.12;
  
  // Calculate total compensation band values (base bands × 1.12)
  const totalBandMin = salaryBandMin * 1.12;
  const totalBandTarget = salaryBandTarget * 1.12;
  const totalBandMax = salaryBandMax * 1.12;
  
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

  // Get zone information based on position relative to target
  const getTargetZone = (salary: number, target: number, min: number, max: number): { 
    color: string; 
    bgColor: string;
    label: string; 
    description: string 
  } => {
    const targetBuffer = target * 0.05; // 5% buffer around target = "at target" zone
    
    if (salary < target - targetBuffer) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        label: 'Below Target',
        description: 'Below market positioning'
      };
    } else if (salary >= target - targetBuffer && salary <= target + targetBuffer) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        label: 'At Target',
        description: 'Ideal market positioning'
      };
    } else {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-500',
        label: 'Above Target',
        description: 'Above market positioning'
      };
    }
  };

  // Calculate positions as percentage of full range
  const calculatePosition = (salary: number, min: number, max: number): number => {
    const range = max - min;
    if (range === 0) return 50;
    return Math.min(100, Math.max(0, ((salary - min) / range) * 100));
  };

  // Get zone info for current and new salaries (using total compensation)
  const currentZone = getTargetZone(currentTotal, totalBandTarget, totalBandMin, totalBandMax);
  const newZone = getTargetZone(newTotalComp, totalBandTarget, totalBandMin, totalBandMax);
  const currentPosition = calculatePosition(currentTotal, totalBandMin, totalBandMax);
  const newPosition = calculatePosition(newTotalComp, totalBandMin, totalBandMax);
  const targetPosition = calculatePosition(totalBandTarget, totalBandMin, totalBandMax);

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
  const handleSaveMidYearComments = async () => {
    if (!pdr) return;
    
    setIsSaving(true);
    
    try {
      // Combine all comments into a single CEO feedback string
      const goalCommentsText = Object.entries(midYearGoalComments)
        .filter(([_, comment]) => comment.trim())
        .map(([goalId, comment]) => {
          const goal = goals.find(g => g.id === goalId);
          return `Goal: ${goal?.title || goalId}\n${comment}`;
        })
        .join('\n\n');
      
      const behaviorCommentsText = Object.entries(midYearBehaviorComments)
        .filter(([_, comment]) => comment.trim())
        .map(([behaviorId, comment]) => {
          // Find the behavior name from company values
          const behaviorName = behaviorId; // This might need adjustment based on how behavior IDs map to names
          return `Behavior: ${behaviorName}\n${comment}`;
        })
        .join('\n\n');
      
      const combinedFeedback = [goalCommentsText, behaviorCommentsText]
        .filter(text => text.trim())
        .join('\n\n---\n\n');
      
      if (!combinedFeedback.trim()) {
        toast({
          title: "No Comments to Save",
          description: "Please add some check-in comments before saving.",
          variant: "destructive",
        });
        return;
      }
      
      // Save to database via mid-year API
      // First try to update existing mid-year review
      let response = await fetch(`/api/pdrs/${pdrId}/mid-year`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ceoFeedback: combinedFeedback,
        }),
      });
      
      // If mid-year review doesn't exist, create one
      if (!response.ok && response.status === 404) {
        response = await fetch(`/api/pdrs/${pdrId}/mid-year`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            progressSummary: 'CEO mid-year check-in comments',
            ceoFeedback: combinedFeedback,
          }),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save comments: ${response.status}`);
      }
      
      // Also save to localStorage for local state management
      localStorage.setItem(`mid_year_goal_comments_${pdrId}`, JSON.stringify(midYearGoalComments));
      localStorage.setItem(`mid_year_behavior_comments_${pdrId}`, JSON.stringify(midYearBehaviorComments));
      
      // Show success message
      toast({
        title: "✅ Comments Saved",
        description: "Your mid-year check-in comments have been saved to the database.",
      });
      
    } catch (error) {
      console.error('Error saving mid-year comments:', error);
      toast({
        title: "❌ Save Failed",
        description: error instanceof Error ? error.message : "Failed to save comments to database.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save mid-year check-in and update status to Final Review
  const handleSaveMidYearReview = async () => {
    if (!pdr) return;
    
    setIsSaving(true);
    
    try {
      // Combine all comments into a single CEO feedback string
      const goalCommentsText = Object.entries(midYearGoalComments)
        .filter(([_, comment]) => comment.trim())
        .map(([goalId, comment]) => {
          const goal = goals.find(g => g.id === goalId);
          return `Goal: ${goal?.title || goalId}\n${comment}`;
        })
        .join('\n\n');
      
      const behaviorCommentsText = Object.entries(midYearBehaviorComments)
        .filter(([_, comment]) => comment.trim())
        .map(([behaviorId, comment]) => {
          return `Behavior: ${behaviorId}\n${comment}`;
        })
        .join('\n\n');
      
      const combinedFeedback = [goalCommentsText, behaviorCommentsText]
        .filter(text => text.trim())
        .join('\n\n---\n\n');
      
      if (!combinedFeedback.trim()) {
        toast({
          title: "No Comments to Save",
          description: "Please add some check-in comments before completing the review.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      // Call approve-midyear API
      const response = await fetch(`/api/pdrs/${pdrId}/approve-midyear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ceoFeedback: combinedFeedback,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to approve mid-year review');
      }
      
      const result = await response.json();
      
      // Update local PDR state with the new status
      setPdr(result.pdr);
      
      // Close the confirmation dialog
      setIsMidYearSaveConfirmDialogOpen(false);
      
      // Show success message
      toast({
        title: "✅ Mid-Year Review Completed",
        description: "The PDR has been approved and the employee can now proceed to the final review.",
      });
      
    } catch (error) {
      console.error('Error completing mid-year review:', error);
      toast({
        title: "❌ Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve mid-year review.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Validate that CEO has provided comprehensive feedback for planning stage
  const validateCEOFeedback = () => {
    
    const validationErrors: string[] = [];
    
    // Goals CEO feedback validation removed - as per backend state machine requirements
    // The backend no longer requires CEO feedback on goals for the planning stage submission
    
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
    
    // Match backend validation logic: require at least one behavior to have CEO feedback
    // (This aligns with the state machine validation in pdr-state-machine.ts)
    if (totalCompletedBehaviors === 0) {
      validationErrors.push('CEO must provide feedback on at least one behavior');
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

  const handleCompleteFinalReview = async () => {
    if (!pdr) return;
    
    try {
      // Check if PDR is in the right status for final completion
      if (pdr.status !== 'END_YEAR_SUBMITTED') {
        // If PDR is not in the right status, show a helpful message
        alert(`PDR must be in END_YEAR_SUBMITTED status for final completion. Current status: ${pdr.status}. Please ensure the employee has completed their final year review first.`);
        return;
      }

      // Collect all behavior and goal reviews from localStorage
      console.log('📦 Collecting behavior and goal reviews for final submission...');
      console.log('Final behavior reviews:', finalBehaviorReviews);
      console.log('Final goal reviews:', finalGoalReviews);

      // Calculate overall rating from behaviors and goals
      const allRatings = [
        ...Object.values(finalBehaviorReviews).map(r => r.rating).filter(Boolean),
        ...Object.values(finalGoalReviews).map(r => r.rating).filter(Boolean),
      ];
      
      const overallRating = allRatings.length > 0
        ? Math.round(allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length)
        : 4; // Default fallback

      console.log(`📊 Calculated overall rating: ${overallRating} (from ${allRatings.length} ratings)`);

      // Call the new complete final review API with all review data
      const response = await fetch(`/api/pdrs/${pdrId}/complete-final-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ceoOverallRating: overallRating,
          ceoFinalComments: endYearReviewData?.ceoOverallFeedback || 'Final review completed by CEO',
          behaviorReviews: finalBehaviorReviews,
          goalReviews: finalGoalReviews,
        }),
      });

      if (response.ok) {
        await response.json();
        
        // Update localStorage for demo mode
        const updatedPdr = {
          ...pdr,
          status: 'COMPLETED',
          finalReviewCompletedAt: new Date().toISOString(),
          finalReviewCompletedBy: 'CEO',
          updatedAt: new Date().toISOString()
        };
        
        // Trigger custom events to update other components
        window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
        window.dispatchEvent(new CustomEvent('demo-audit-updated'));
        
        alert('Final review completed successfully! PDR is now locked and completed.');
      } else {
        const error = await response.json();
        alert(`Error completing final review: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error completing final review:', error);
      
      // Update local state for error fallback
      const updatedPdr = {
        ...pdr,
        status: 'COMPLETED',
        finalReviewCompletedAt: new Date().toISOString(),
        finalReviewCompletedBy: 'CEO',
        updatedAt: new Date().toISOString()
      };
      
      setPdr(updatedPdr);
      window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
      window.dispatchEvent(new CustomEvent('demo-audit-updated'));
      
      alert('Final review completed successfully! (Demo mode)');
    }
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
        console.log('🔍 Raw goal data from API:');
        pdrData.goals.forEach((g: any, i: number) => {
          console.log(`   API Goal ${i + 1}:`, {
            id: g.id,
            title: g.title,
            employeeRating: g.employeeRating,
            employee_rating: g.employee_rating,
            employeeProgress: g.employeeProgress,
            employee_progress: g.employee_progress,
            allFields: Object.keys(g)
          });
        });
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
              
              console.log('🔍 Raw organized behavior data from API:');
              organizedBehaviors.forEach((valueData: any, i: number) => {
                console.log(`   Company Value ${i + 1}: "${valueData.companyValue?.name}"`);
                (valueData.employeeEntries || []).forEach((behavior: any, j: number) => {
                  console.log(`     Employee Entry ${j + 1}:`, {
                    id: behavior.id,
                    rating: behavior.rating,
                    employee_rating: behavior.employee_rating,
                    description: behavior.description,
                    examples: behavior.examples,
                    comments: behavior.comments,
                    ceoRating: behavior.ceoRating,
                    allFields: Object.keys(behavior)
                  });
                });
              });
              
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

  // CEO feedback is loaded from the database via the PDR data

  // Load database CEO feedback and mid-year comments
  useEffect(() => {
    const loadDatabaseFeedback = async () => {

      if (!pdr || !pdrId) {
        return;
      }

      try {
        console.log('🔄 Loading real database feedback for PDR:', pdrId);

        // Load CEO feedback for goals from both ceo_fields and individual goals
        const goalFeedbackFromFields = pdr.ceoFields && (pdr.ceoFields as any).goalFeedback;
        const goalFeedbackData: Record<string, any> = {};
        
        goals.forEach(goal => {
          const goalId = goal.id;
          
          // Start with data from PDR ceo_fields if available
          const existingFeedback = goalFeedbackFromFields && goalFeedbackFromFields[goalId] 
            ? goalFeedbackFromFields[goalId] 
            : {};
          
          // Merge with individual goal data from database
          goalFeedbackData[goalId] = {
            ceoDescription: existingFeedback.ceoDescription || goal.description || '',
            ceoComments: existingFeedback.ceoComments || (goal as any).ceoFeedback || (goal as any).ceo_feedback || '',
            ceoRating: existingFeedback.ceoRating || (goal as any).ceoRating || (goal as any).ceo_rating || 0,
            ceoProgress: existingFeedback.ceoProgress || 0,
          };
        });
        
        setCeoGoalFeedback(goalFeedbackData);
        console.log('📋 Loaded CEO goal feedback from database:', goalFeedbackData);
        console.log('🔍 Individual goal employee data:');
        goals.forEach(g => {
          console.log(`   Goal "${g.title}":`, {
            id: g.id,
            employeeProgress: g.employeeProgress,
            employeeRating: g.employeeRating,
            employee_rating: (g as any).employee_rating,
            employee_progress: (g as any).employee_progress,
            description: g.description,
            allFields: Object.keys(g)
          });
        });

        // Load mid-year review comments if available
        const midYearData = (pdr as any).midYearReview || (pdr as any).mid_year_review;
        
        if (midYearData) {
          console.log('📋 Found mid-year review data:', midYearData);
          
          // Handle both array and single object cases (API might return array)
          const reviewData = Array.isArray(midYearData) ? midYearData[0] : midYearData;
          
          if (reviewData) {
            // Load CEO feedback from mid-year review
            if (reviewData.ceo_feedback || reviewData.ceoFeedback) {
              const ceoFeedbackText = reviewData.ceo_feedback || reviewData.ceoFeedback;
              
              // Update goal feedback with mid-year CEO comments
              setCeoGoalFeedback(prev => {
                const updated = { ...prev };
                // Add CEO feedback to first goal as general feedback
                const firstGoalId = Object.keys(updated)[0];
                if (firstGoalId && updated[firstGoalId]) {
                  updated[firstGoalId] = {
                    ...updated[firstGoalId],
                    ceoComments: ceoFeedbackText
                  };
                }
                return updated;
              });
            }

            // Load employee mid-year data and map to comments
            const progressSummary = reviewData.progress_summary || reviewData.progressSummary || '';
            const blockersChallenges = reviewData.blockers_challenges || reviewData.blockersChallenges || '';
            const supportNeeded = reviewData.support_needed || reviewData.supportNeeded || '';
            const employeeComments = reviewData.employee_comments || reviewData.employeeComments || '';
            
            // Combine all employee feedback into check-in comments
            const employeeContent = [
              progressSummary && `Progress: ${progressSummary}`,
              blockersChallenges && `Challenges: ${blockersChallenges}`,
              supportNeeded && `Support needed: ${supportNeeded}`,
              employeeComments && `Comments: ${employeeComments}`
            ].filter(Boolean).join('\n\n');
            
            // Map to goal comments - add to all goals for now
            if (employeeContent) {
              const goalCommentsData: Record<string, string> = {};
              goals.forEach(goal => {
                goalCommentsData[goal.id] = employeeContent;
              });
              
              setMidYearGoalComments(goalCommentsData);
              console.log('📋 Loaded mid-year goal comments from review data:', goalCommentsData);
            }
          }
        }

        // Load behavior-specific CEO feedback from the behaviors data
        const behaviorCommentsData: Record<string, string> = {};
        
        behaviors.forEach(behavior => {
          const behaviorUniqueId = behavior.value?.id || behavior.valueId || behavior.id;
          
          // Load CEO comments from behavior.ceoComments
          if (behavior.ceoComments) {
            behaviorCommentsData[behaviorUniqueId] = behavior.ceoComments;
          }
        });

        if (Object.keys(behaviorCommentsData).length > 0) {
          setMidYearBehaviorComments(behaviorCommentsData);
          console.log('📋 Loaded behavior CEO comments:', behaviorCommentsData);
        }

        console.log('🔍 Individual behavior employee data:');
        behaviors.forEach(b => {
          console.log(`   Behavior "${b.value?.name}":`, {
            id: b.id,
            employeeRating: b.employeeRating,
            employee_rating: (b as any).employee_rating,
            employeeSelfAssessment: (b as any).employeeSelfAssessment,
            employee_self_assessment: (b as any).employee_self_assessment,
            rating: (b as any).rating,
            description: b.description,
            ceoComments: b.ceoComments,
            allFields: Object.keys(b)
          });
        });

        // Load saved salary band values from ceo_fields
        const savedBandValues = pdr.ceoFields?.salaryBand;
        if (savedBandValues) {
          console.log('📊 Loading saved salary band values:', savedBandValues);
          setSalaryBandMin(savedBandValues.min || 75000);
          setSalaryBandTarget(savedBandValues.target || 95000);
          setSalaryBandMax(savedBandValues.max || 115000);
        } else {
          console.log('📊 No saved salary band values, using defaults');
        }

        console.log('✅ Successfully loaded database feedback and comments');

      } catch (error) {
        console.error('❌ Error loading database feedback:', error);
      }
    };

    // Load database data after PDR data is loaded and behaviors/goals are available
    if (pdr && pdrId && goals.length > 0 && behaviors.length > 0) {
      loadDatabaseFeedback();
    }
  }, [pdr, pdrId, goals, behaviors]);

  // Load end-year review data for Final Review tab
  useEffect(() => {
    const loadEndYearReviewData = async () => {
      // Skip if this is demo mode
      if (typeof window !== 'undefined' && localStorage.getItem('demo_user')) {
        return;
      }

      if (!pdr || !pdrId) {
        return;
      }

      try {
        console.log('🔄 Loading end-year review data for PDR:', pdrId);

        // Load end-year review data from PDR
        const endYearData = (pdr as any).endYearReview || (pdr as any).end_year_review;
        
        console.log('🔍 PDR end-year data check:', {
          pdrStatus: pdr.status,
          hasEndYearReview: !!endYearData,
          endYearDataType: typeof endYearData,
          endYearDataLength: Array.isArray(endYearData) ? endYearData.length : 'Not array',
          endYearData: endYearData
        });
        
        if (endYearData) {
          console.log('📋 Found end-year review data:', endYearData);
          
          // Handle both array and single object cases
          const reviewData = Array.isArray(endYearData) ? endYearData[0] : endYearData;
          
          if (reviewData) {
            // Store end-year review data for access in Final Review tab
            const reviewDataParsed = {
              employeeSelfAssessment: reviewData.employee_self_assessment || reviewData.employeeSelfAssessment || '',
              employeeOverallRating: reviewData.employee_overall_rating || reviewData.employeeOverallRating || 0,
              achievementsSummary: reviewData.achievements_summary || reviewData.achievementsSummary || '',
              learningsGrowth: reviewData.learnings_growth || reviewData.learningsGrowth || '',
              challengesFaced: reviewData.challenges_faced || reviewData.challengesFaced || '',
              nextYearGoals: reviewData.next_year_goals || reviewData.nextYearGoals || '',
              ceoAssessment: reviewData.ceo_assessment || reviewData.ceoAssessment || '',
              ceoOverallRating: reviewData.ceo_overall_rating || reviewData.ceoOverallRating || 0,
            };

            // Store in state for Final Review tab access
            setEndYearReviewData(reviewDataParsed);
            console.log('✅ Loaded end-year review data:', reviewDataParsed);
          }
        } else {
          console.log('❌ No end-year review data found - employee may not have completed end-year review yet');
          console.log('🔍 Will show goals/behaviors employee ratings instead');
        }

        // Initialize final review data with employee ratings from goals and behaviors
        const goalReviewData: Record<string, { rating: number; comments: string }> = {};
        const behaviorReviewData: Record<string, { rating: number; comments: string }> = {};

        // Load employee ratings and CEO ratings from individual goals
        goals.forEach(goal => {
          goalReviewData[goal.id] = {
            rating: goal.ceoRating || (goal as any).ceo_rating || 0, // Load saved CEO rating from database
            comments: (goal as any).ceo_comments || (goal as any).ceoComments || '', // Load saved CEO comments from database (actual column is ceo_comments)
          };
        });

        // Load employee ratings and CEO ratings from individual behaviors  
        behaviors.forEach(behavior => {
          const behaviorId = behavior.id || behavior.value?.id || behavior.valueId;
          if (behaviorId) {
            behaviorReviewData[behaviorId] = {
              rating: behavior.ceoRating || (behavior as any).ceo_rating || 0, // Load saved CEO rating from database
              comments: behavior.ceoComments || (behavior as any).ceo_comments || '', // Load saved CEO comments from database (actual column is ceo_comments)
            };
          }
        });

        // Load any existing CEO final review data from localStorage
        const savedGoalReviews = localStorage.getItem(`final_goal_reviews_${pdrId}`);
        const savedBehaviorReviews = localStorage.getItem(`final_behavior_reviews_${pdrId}`);

        if (savedGoalReviews) {
          try {
            const parsed = JSON.parse(savedGoalReviews);
            Object.keys(parsed).forEach(goalId => {
              if (goalReviewData[goalId]) {
                goalReviewData[goalId] = { ...goalReviewData[goalId], ...parsed[goalId] };
              }
            });
          } catch (error) {
            console.error('Error parsing saved goal reviews:', error);
          }
        }

        if (savedBehaviorReviews) {
          try {
            const parsed = JSON.parse(savedBehaviorReviews);
            Object.keys(parsed).forEach(behaviorId => {
              if (behaviorReviewData[behaviorId]) {
                behaviorReviewData[behaviorId] = { ...behaviorReviewData[behaviorId], ...parsed[behaviorId] };
              }
            });
          } catch (error) {
            console.error('Error parsing saved behavior reviews:', error);
          }
        }

        setFinalGoalReviews(goalReviewData);
        setFinalBehaviorReviews(behaviorReviewData);

        console.log('✅ Initialized final review data with CEO ratings from database');
        console.log('📊 Goal reviews:', goalReviewData);
        console.log('📊 Behavior reviews:', behaviorReviewData);

      } catch (error) {
        console.error('❌ Error loading end-year review data:', error);
      }
    };

    // Load end-year data after PDR, goals, and behaviors are loaded
    if (pdr && pdrId && goals.length > 0 && behaviors.length > 0) {
      loadEndYearReviewData();
    }
  }, [pdr, pdrId, goals, behaviors]);

  const getStatusBadge = (status: string) => {
    const statusLabel = getPDRStatusLabel(status as any) || status;
    
    switch (status) {
      case 'Created':
        return <Badge variant="secondary">{statusLabel}</Badge>;
      case 'SUBMITTED':
        return <Badge variant="default">{statusLabel}</Badge>;
      case 'PLAN_LOCKED':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">{statusLabel}</Badge>;
      case 'MID_YEAR_SUBMITTED':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">{statusLabel}</Badge>;
      case 'MID_YEAR_APPROVED':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">{statusLabel}</Badge>;
      case 'END_YEAR_SUBMITTED':
        return <Badge variant="outline" className="border-indigo-500 text-indigo-600">{statusLabel}</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="border-green-500 text-green-600">{statusLabel}</Badge>;
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
  
  // Function to save salary band configuration to database
  const saveBandValues = async (min: number, target: number, max: number) => {
    try {
      // Get existing ceo_fields
      const existingCeoFields = pdr?.ceoFields || {};
      
      // Update with new salary band values
      const updatedCeoFields = {
        ...existingCeoFields,
        salaryBand: {
          min,
          target,
          max,
          updatedAt: new Date().toISOString()
        }
      };
      
      // Save to database via API
      const response = await fetch(`/api/pdrs/${pdrId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ceo_fields: updatedCeoFields
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error('Failed to save salary band values');
      } else {
        console.log('✅ Salary band values saved successfully');
      }
    } catch (error) {
      console.error('Error saving salary band values:', error);
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
                {pdr.status !== 'Created' && pdr.status !== 'SUBMITTED' && (
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
                    metricsRefreshKey; // eslint-disable-line @typescript-eslint/no-unused-expressions // This ensures the calculation runs when metrics refresh
                    
                    // Get real CEO feedback data from localStorage
                    const getCeoGoalFeedback = () => {
                      if (typeof window === 'undefined') return {};
                      const savedData = localStorage.getItem(`ceo_goal_feedback_${pdrId}`);
                      return savedData ? JSON.parse(savedData) : {};
                    };

                    const realCeoGoalFeedback = getCeoGoalFeedback();
                    // Real CEO behavior feedback calculation removed - handled by BehaviorReviewSection
                    
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

                    // Count completed behaviors (CEO has provided feedback, not employee input)
                    
                    // Get CEO behavior feedback from localStorage
                    const getCeoBehaviorFeedback = () => {
                      if (typeof window === 'undefined') return {};
                      const storageKey = `ceo_behavior_feedback_${pdrId}`;
                      const savedData = localStorage.getItem(storageKey);
                      console.log('🔍 CEO Behavior Feedback Storage Key:', storageKey);
                      console.log('🔍 CEO Behavior Feedback Raw Data:', savedData);
                      const parsed = savedData ? JSON.parse(savedData) : {};
                      console.log('🔍 CEO Behavior Feedback Parsed:', parsed);
                      console.log('🔍 CEO Behavior Feedback Keys:', Object.keys(parsed));
                      return parsed;
                    };

                    const ceoBehaviorFeedback = getCeoBehaviorFeedback();

                    // Get additional CEO feedback (self-reflection and deep dive)
                    const getCeoAdditionalFeedback = () => {
                      if (typeof window === 'undefined') return {};
                      const storageKey = `ceo_additional_feedback_${pdrId}`;
                      const savedData = localStorage.getItem(storageKey);
                      console.log('🔍 CEO Additional Feedback Storage Key:', storageKey);
                      console.log('🔍 CEO Additional Feedback Raw Data:', savedData);
                      const parsed = savedData ? JSON.parse(savedData) : {};
                      console.log('🔍 CEO Additional Feedback Parsed:', parsed);
                      return parsed;
                    };

                    const ceoAdditionalFeedback = getCeoAdditionalFeedback();

                    // Count main behaviors (4 company values) - CEO feedback completion
                    const completedMainBehaviors = Object.keys(ceoBehaviorFeedback).filter(valueId => {
                      const feedback = ceoBehaviorFeedback[valueId];
                      console.log(`🔍 Checking valueId: ${valueId}`, feedback);
                      // CEO has provided feedback if either description or comments are filled
                      const hasDescription = feedback && feedback.description && feedback.description.trim();
                      const hasComments = feedback && feedback.comments && feedback.comments.trim();
                      const isComplete = hasDescription || hasComments;
                      console.log(`  - Has description: ${!!hasDescription}, Has comments: ${!!hasComments}, Complete: ${isComplete}`);
                      return isComplete;
                    }).length;

                    // Count additional behaviors (2 development sections) - CEO feedback completion
                    let completedAdditionalBehaviors = 0;
                    if (ceoAdditionalFeedback.selfReflection && ceoAdditionalFeedback.selfReflection.trim()) {
                      completedAdditionalBehaviors++;
                    }
                    if (ceoAdditionalFeedback.deepDive && ceoAdditionalFeedback.deepDive.trim()) {
                      completedAdditionalBehaviors++;
                    }

                    const completedBehaviors = completedMainBehaviors + completedAdditionalBehaviors;

                    console.log('CEO Feedback completion breakdown:');
                    console.log('- Main behaviors (4 company values):', completedMainBehaviors, '/ 4');
                    console.log('- Additional behaviors (2 sections):', completedAdditionalBehaviors, '/ 2'); 
                    console.log('- Total completed behaviors:', completedBehaviors, '/ 6');

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
                      // Show initial review button for SUBMITTED or OPEN_FOR_REVIEW status
                      const showButton = (['SUBMITTED', 'OPEN_FOR_REVIEW'].includes(pdr.status)) && !pdr.isLocked;
                      console.log('🎯 Button visibility check - PDR status:', pdr.status, 'isLocked:', pdr.isLocked);
                      console.log('🎯 Expected status: SUBMITTED or OPEN_FOR_REVIEW');
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

                    {/* Mid-Year Approval Button */}
                    {(pdr.status === 'MID_YEAR_SUBMITTED' || pdr.status === 'PLAN_LOCKED') && (
                      <Button 
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/pdrs/${pdrId}/approve-midyear`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                ceoFeedback: pdr.status === 'PLAN_LOCKED' 
                                  ? 'Mid-year review approved directly by CEO - skipping employee mid-year submission'
                                  : 'Mid-year progress approved by CEO',
                                ceoRating: 4
                              })
                            });
                            
                            if (response.ok) {
                              // Update local state
                              const updatedPdr = { ...pdr, status: 'MID_YEAR_APPROVED' };
                              setPdr(updatedPdr);
                              window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
                              
                              toast({
                                title: "✅ Mid-Year Review Approved",
                                description: "Final year review is now available for the employee.",
                                variant: "default",
                              });
                              
                              // Refresh the page to show updated status
                              window.location.reload();
                            } else {
                              const error = await response.json();
                              toast({
                                title: "❌ Approval Failed",
                                description: error.error || 'Failed to approve mid-year review',
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error('Error approving mid-year:', error);
                            toast({
                              title: "❌ Approval Failed",
                              description: 'Failed to approve mid-year review',
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {pdr.status === 'PLAN_LOCKED' ? 'Approve Mid-Year (Skip Employee Submission)' : 'Approve Mid-Year Review'}
                      </Button>
                    )}

                    {/* Final Review Completion Button */}
                    {pdr.status === 'END_YEAR_SUBMITTED' && (
                      <Button 
                        onClick={handleCompleteFinalReview}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete Final Review
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
                          const employeeComments = goal.employeeProgress || goal.description || ceoGoalFeedback[goal.id]?.ceoDescription || '';
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
                          const employeeComments = (behavior as any).employeeSelfAssessment || behavior.description || behavior.comments || '';
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
                          disabled={isSaving}
                          variant="outline"
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Comments
                            </>
                          )}
                        </Button>
                        
                        {/* Save and Close Button */}
                        <Button 
                          onClick={() => setIsMidYearSaveConfirmDialogOpen(true)}
                          disabled={isSaving}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {isSaving ? (
                            <>
                              <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Save and Close Mid-Year Review
                            </>
                          )}
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
                    
                    // Debug goal data in Final Review rendering
                    console.log('🔍 Final Review Goal Debug:', {
                      goalId: goal.id,
                      goalTitle: goal.title,
                      employeeRating: goal.employeeRating,
                      employeeProgress: goal.employeeProgress,
                      endYearData: endYearReviewData,
                      finalReview: finalReview
                    });
                    
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
                                  <p className="text-sm text-foreground">
                                    {(endYearReviewData?.employeeSelfAssessment || 
                                      goal.employeeProgress || 
                                      goal.description ||
                                      'No final comments provided')}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
                                    <span className="font-semibold text-sm text-foreground">
                                      {goal.employeeRating || (goal as any).employee_rating || 0}/5
                                    </span>
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
                    
                    // Debug behavior data in Final Review rendering
                    console.log('🔍 Final Review Behavior Debug:', {
                      behaviorId: behaviorUniqueId,
                      valueName: behavior.value?.name,
                      employeeRating: behavior.employeeRating,
                      employeeSelfAssessment: (behavior as any).employeeSelfAssessment,
                      description: behavior.description,
                      endYearData: endYearReviewData,
                      finalReview: finalReview
                    });
                    
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
                                  <p className="text-sm text-foreground">
                                    {(endYearReviewData?.employeeSelfAssessment || 
                                      (behavior as any).employeeSelfAssessment ||
                                      behavior.description || 
                                      'No final comments provided')}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
                                    <span className="font-semibold text-sm text-foreground">
                                      {behavior.employeeRating || (behavior as any).employee_rating || 0}/5
                                    </span>
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
                      
                      {/* Salary Band Configuration */}
                      <div className="space-y-3 p-4 bg-muted/30 rounded-md border">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Configure Total Compensation Band</h4>
                          <span className="text-xs text-muted-foreground">Base + Super (12%)</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="band-min" className="text-xs">
                              Minimum ($)
                            </Label>
                            <Input
                              id="band-min"
                              type="number"
                              value={Math.round(totalBandMin)}
                              onChange={(e) => {
                                const totalValue = parseInt(e.target.value) || 0;
                                const baseValue = Math.round(totalValue / 1.12);
                                if (baseValue >= salaryBandTarget) {
                                  toast({
                                    title: 'Invalid Value',
                                    description: 'Minimum must be less than Target',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                setSalaryBandMin(baseValue);
                                saveBandValues(baseValue, salaryBandTarget, salaryBandMax);
                              }}
                              className="h-9"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="band-target" className="text-xs">
                              Target ($)
                            </Label>
                            <Input
                              id="band-target"
                              type="number"
                              value={Math.round(totalBandTarget)}
                              onChange={(e) => {
                                const totalValue = parseInt(e.target.value) || 0;
                                const baseValue = Math.round(totalValue / 1.12);
                                if (baseValue <= salaryBandMin || baseValue >= salaryBandMax) {
                                  toast({
                                    title: 'Invalid Value',
                                    description: 'Target must be between Minimum and Maximum',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                setSalaryBandTarget(baseValue);
                                saveBandValues(salaryBandMin, baseValue, salaryBandMax);
                              }}
                              className="h-9"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="band-max" className="text-xs">
                              Maximum ($)
                            </Label>
                            <Input
                              id="band-max"
                              type="number"
                              value={Math.round(totalBandMax)}
                              onChange={(e) => {
                                const totalValue = parseInt(e.target.value) || 0;
                                const baseValue = Math.round(totalValue / 1.12);
                                if (baseValue <= salaryBandTarget) {
                                  toast({
                                    title: 'Invalid Value',
                                    description: 'Maximum must be greater than Target',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                setSalaryBandMax(baseValue);
                                saveBandValues(salaryBandMin, salaryBandTarget, baseValue);
                              }}
                              className="h-9"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Range: ${(totalBandMax - totalBandMin).toLocaleString()}</span>
                            <span>•</span>
                            <span>Target Position: {Math.round(((totalBandTarget - totalBandMin) / (totalBandMax - totalBandMin)) * 100)}%</span>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSalaryBandMin(75000);
                              setSalaryBandTarget(95000);
                              setSalaryBandMax(115000);
                              saveBandValues(75000, 95000, 115000);
                              toast({
                                title: 'Reset Complete',
                                description: 'Band reset to defaults (Min: $84k, Target: $106k, Max: $129k)',
                              });
                            }}
                            className="h-7 text-xs"
                          >
                            Reset to Default
                          </Button>
                        </div>
                      </div>
                      
                      {/* Simplified Target-Centric Salary Band Visualization */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Total Compensation Band</h4>
                          <div className="text-xs text-muted-foreground">
                            Total cost to company: ${totalBandTarget.toLocaleString()}
                          </div>
                        </div>

                        {/* Simple 3-Zone Legend */}
                        <div className="grid grid-cols-3 gap-3 text-xs text-center mb-2">
                          <div className="space-y-1">
                            <div className="h-2 bg-red-500/40 rounded"></div>
                            <div className="font-medium">Below Target</div>
                            <div className="text-[10px] text-muted-foreground">Under budget</div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 bg-green-500/40 rounded"></div>
                            <div className="font-medium">At Target (±5%)</div>
                            <div className="text-[10px] text-muted-foreground">On budget</div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 bg-blue-500/40 rounded"></div>
                            <div className="font-medium">Above Target</div>
                            <div className="text-[10px] text-muted-foreground">Over budget</div>
                          </div>
                        </div>

                        {/* Main Visualization */}
                        <div className="relative h-14 bg-muted rounded-lg overflow-visible">
                          {/* Three Dynamic Zones */}
                          <div className="absolute inset-0 flex rounded-lg overflow-hidden">
                            {/* Below Target Zone (Red) - Min to Target-5% */}
                            <div 
                              className="bg-red-500/20 h-full border-r-2 border-red-500/40"
                              style={{ 
                                width: `${Math.max(0, calculatePosition(totalBandTarget * 0.95, totalBandMin, totalBandMax))}%` 
                              }}
                            ></div>
                            
                            {/* At Target Zone (Green) - Target-5% to Target+5% */}
                            <div 
                              className="bg-green-500/30 h-full border-r-2 border-green-500/40"
                              style={{ 
                                width: `${Math.max(0, calculatePosition(totalBandTarget * 1.05, totalBandMin, totalBandMax) - calculatePosition(totalBandTarget * 0.95, totalBandMin, totalBandMax))}%` 
                              }}
                            ></div>
                            
                            {/* Above Target Zone (Blue) - Target+5% to Max */}
                            <div 
                              className="bg-blue-500/20 h-full"
                              style={{ 
                                width: `${Math.max(0, 100 - calculatePosition(totalBandTarget * 1.05, totalBandMin, totalBandMax))}%` 
                              }}
                            ></div>
                          </div>

                          {/* Min Reference Line */}
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-gray-500/40 z-5"
                            style={{ left: '0%' }}
                          >
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-background px-1 rounded whitespace-nowrap">
                              Min: ${totalBandMin.toLocaleString()}
                            </div>
                          </div>

                          {/* Target Marker - Prominent */}
                          <div 
                            className="absolute top-0 h-full w-1 bg-green-600 shadow-lg z-30 border-x-2 border-green-700"
                            style={{ 
                              left: `${targetPosition}%`,
                              transform: 'translateX(-50%)'
                            }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                              <div className="text-xs font-bold text-white bg-green-600 px-2 py-1 rounded shadow-md whitespace-nowrap border border-green-700">
                                TARGET
                              </div>
                              <div className="text-[10px] font-medium text-green-600 mt-0.5">
                                ${totalBandTarget.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Max Reference Line */}
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-gray-500/40 z-5"
                            style={{ left: '100%' }}
                          >
                            <div className="absolute top-1/2 -right-1 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-background px-1 rounded whitespace-nowrap">
                              Max: ${totalBandMax.toLocaleString()}
                            </div>
                          </div>

                          {/* Current Salary Marker */}
                          <div 
                            className="absolute top-0 h-full w-3 bg-gray-700 z-20 cursor-pointer hover:bg-gray-800 transition-all group rounded-sm"
                            style={{ 
                              left: `${currentPosition}%`,
                              transform: 'translateX(-50%)',
                              transition: 'left 0.3s ease-in-out, background-color 0.2s'
                            }}
                            title={`Current: $${currentTotal.toLocaleString()}`}
                          >
                            {/* Hover Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <div className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl border border-gray-600 whitespace-nowrap text-xs">
                                <div className="font-bold">Current Total Compensation</div>
                                <div className="text-lg font-bold mt-0.5">${currentTotal.toLocaleString()}</div>
                                <div className="text-[10px] text-gray-300 mt-1">
                                  ${Math.abs(currentTotal - totalBandTarget).toLocaleString()} {currentTotal < totalBandTarget ? 'below' : 'above'} target
                                </div>
                                <div className="text-[9px] text-gray-400 mt-1 pt-1 border-t border-gray-600">
                                  Base: ${currentSalary.toLocaleString()} + Super: ${(currentSalary * 0.12).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            {/* Label */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                              <div className="text-xs font-bold bg-gray-700 text-white px-2 py-0.5 rounded whitespace-nowrap">
                                Current
                              </div>
                              <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                ${currentTotal.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* New Salary Marker */}
                          <div 
                            className="absolute top-0 h-full w-3 bg-primary z-25 cursor-pointer hover:bg-primary/90 transition-all group rounded-sm"
                            style={{ 
                              left: `${newPosition}%`,
                              transform: 'translateX(-50%)',
                              transition: 'left 0.3s ease-in-out, background-color 0.2s'
                            }}
                            title={`New: $${newTotalComp.toLocaleString()}`}
                          >
                            {/* Hover Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <div className="bg-primary text-white px-3 py-2 rounded-lg shadow-xl border border-primary-foreground/20 whitespace-nowrap text-xs">
                                <div className="font-bold">New Total Compensation</div>
                                <div className="text-lg font-bold mt-0.5">${newTotalComp.toLocaleString()}</div>
                                <div className="text-[10px] opacity-90 mt-1">
                                  ${Math.abs(newTotalComp - totalBandTarget).toLocaleString()} {newTotalComp < totalBandTarget ? 'below' : 'above'} target
                                </div>
                                <div className="text-[9px] opacity-80 mt-1 pt-1 border-t border-white/20">
                                  Base: ${newSalary.toLocaleString()} + Super: ${(newSalary * 0.12).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            {/* Label */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                              <div className="text-xs font-bold bg-primary text-white px-2 py-0.5 rounded whitespace-nowrap">
                                New
                              </div>
                              <div className="text-[10px] font-medium text-primary mt-0.5">
                                ${newTotalComp.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Simple Status Cards */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          {/* Current Status */}
                          <div className="p-4 bg-card rounded-lg border-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Current Cost</span>
                              <div className={`h-3 w-3 rounded-full ${currentZone.bgColor}`}></div>
                            </div>
                            <div className="text-2xl font-bold mb-1">${currentTotal.toLocaleString()}</div>
                            <div className={`text-sm font-medium ${currentZone.color}`}>{currentZone.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{currentZone.description}</div>
                            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                              ${Math.abs(currentTotal - totalBandTarget).toLocaleString()} {currentTotal < totalBandTarget ? 'below' : 'above'} target
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              (Base: ${currentSalary.toLocaleString()} + Super: ${(currentSalary * 0.12).toLocaleString()})
                            </div>
                          </div>

                          {/* New Status */}
                          <div className="p-4 bg-card rounded-lg border-2 border-primary/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">New Total Cost</span>
                              <div className={`h-3 w-3 rounded-full ${newZone.bgColor}`}></div>
                            </div>
                            <div className="text-2xl font-bold mb-1 text-primary">${newTotalComp.toLocaleString()}</div>
                            <div className={`text-sm font-medium ${newZone.color}`}>{newZone.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{newZone.description}</div>
                            <div className="text-xs font-bold text-green-600 mt-2 pt-2 border-t">
                              +${(newTotalComp - currentTotal).toLocaleString()} annual increase
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              (Base: ${newSalary.toLocaleString()} + Super: ${(newSalary * 0.12).toLocaleString()})
                            </div>
                          </div>
                        </div>

                        {/* Band Summary */}
                        <div className="flex justify-between text-xs text-muted-foreground pt-3 border-t">
                          <span>Total Range: ${(totalBandMax - totalBandMin).toLocaleString()}</span>
                          <span>•</span>
                          <span>Target Cost: ${totalBandTarget.toLocaleString()}</span>
                          <span>•</span>
                          <span>±5% Buffer: ${Math.round(totalBandTarget * 0.05).toLocaleString()}</span>
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

