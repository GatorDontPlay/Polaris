'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBehaviorEntries } from '@/hooks/use-behavior-entries';
import type { PDR, AuthUser, OrganizedBehaviorData } from '@/types';
import { MessageSquare, Star, TrendingUp, User, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface BehaviorReviewSectionProps {
  pdr: PDR;
  currentUser?: AuthUser;
}

export interface BehaviorReviewSectionRef {
  saveAllReviews: () => Promise<boolean>;
}

export const BehaviorReviewSection = forwardRef<BehaviorReviewSectionRef, BehaviorReviewSectionProps>(
  ({ pdr, currentUser }, ref) => {
  const {
    isLoading,
    isSaving,
    organizedData,
    fetchOrganizedData,
    createCeoReview,
    updateBehaviorEntry,
  } = useBehaviorEntries({ 
    pdrId: pdr.id, 
    currentUser 
  });

  // Local state for CEO feedback forms
  const [ceoFeedback, setCeoFeedback] = useState<Record<string, {
    description?: string;
    comments?: string;
  }>>({});
  
  // State to track expanded employee descriptions
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // Helper functions for text expansion
  const MAX_DESCRIPTION_LENGTH = 100;
  
  const shouldTruncateText = (text: string) => {
    return text && text.length > MAX_DESCRIPTION_LENGTH;
  };
  
  const getTruncatedText = (text: string) => {
    if (!text || text.length <= MAX_DESCRIPTION_LENGTH) return text;
    return text.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
  };
  
  const toggleDescriptionExpansion = (entryId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  // Load organized data on component mount
  useEffect(() => {
    fetchOrganizedData();
  }, [fetchOrganizedData]);

  // Load CEO behavior feedback from localStorage in demo mode
  useEffect(() => {
    const isDemoMode = typeof window !== 'undefined' && pdr.id.startsWith('demo-pdr-');
    
    if (isDemoMode) {
      const storageKey = `ceo_behavior_feedback_${pdr.id}`;
      const savedFeedback = localStorage.getItem(storageKey);
      
      if (savedFeedback) {
        try {
          const parsedFeedback = JSON.parse(savedFeedback);
          const loadedFeedback: Record<string, { description?: string; comments?: string; }> = {};
          
          // Convert the saved format to the component's expected format
          Object.keys(parsedFeedback).forEach(valueId => {
            const saved = parsedFeedback[valueId];
            loadedFeedback[valueId] = {
              description: saved.description || '',
              comments: saved.comments || '',
            };
          });
          
          setCeoFeedback(loadedFeedback);
          console.log('Demo mode: Loaded CEO behavior feedback from localStorage', loadedFeedback);
        } catch (error) {
          console.error('Error loading CEO behavior feedback from localStorage:', error);
        }
      }
    }
  }, [pdr.id]);

  // Pre-populate form with existing CEO review data from API (only if form is empty and not demo mode)
  useEffect(() => {
    const isDemoMode = typeof window !== 'undefined' && pdr.id.startsWith('demo-pdr-');
    
    if (!isDemoMode && organizedData && organizedData.length > 0) {
      const newCeoFeedback: Record<string, { description?: string; comments?: string; }> = {};
      let hasExistingData = false;
      
      organizedData.forEach(valueData => {
        if (valueData.employeeEntries.length > 0 && valueData.employeeEntries[0].ceoEntries && valueData.employeeEntries[0].ceoEntries.length > 0) {
          const ceoReview = valueData.employeeEntries[0].ceoEntries[0];
          newCeoFeedback[valueData.companyValue.id] = {
            description: ceoReview.description || '',
            comments: ceoReview.comments || '',
          };
          hasExistingData = true;
        }
      });
      
      // Only update form state if we have existing data and current form is mostly empty
      const currentFormIsEmpty = Object.keys(ceoFeedback).length === 0 || 
        Object.values(ceoFeedback).every(feedback => 
          (!feedback.description || feedback.description.trim() === '') && 
          (!feedback.comments || feedback.comments.trim() === '')
        );
        
      if (hasExistingData && currentFormIsEmpty) {
        console.log('Pre-populating form with existing CEO review data from API');
        setCeoFeedback(newCeoFeedback);
      }
    }
  }, [organizedData, ceoFeedback, pdr.id]);

  // Update local CEO feedback state and save to localStorage immediately
  const updateCeoFeedback = (valueId: string, field: string, value: string | number) => {
    // Update local state
    setCeoFeedback(prev => {
      const updated = {
        ...prev,
        [valueId]: {
          ...prev[valueId],
          [field]: value
        }
      };
      
      // In demo mode, also save to localStorage immediately
      if (typeof window !== 'undefined' && pdr.id.startsWith('demo-pdr-')) {
        try {
          // Get existing feedback from localStorage
          const storageKey = `ceo_behavior_feedback_${pdr.id}`;
          const existingFeedback = JSON.parse(localStorage.getItem(storageKey) || '{}');
          
          // Update with new value
          existingFeedback[valueId] = {
            ...(existingFeedback[valueId] || {}),
            [field]: value,
            savedAt: new Date().toISOString()
          };
          
          // Save back to localStorage
          localStorage.setItem(storageKey, JSON.stringify(existingFeedback));
          console.log(`Auto-saved CEO behavior feedback field "${field}" for value ${valueId}`);
        } catch (error) {
          console.error('Error auto-saving CEO behavior feedback:', error);
        }
      }
      
      return updated;
    });
  };

  // Save CEO review for a specific company value
  const saveCeoReview = async (valueData: OrganizedBehaviorData) => {
    const employeeEntry = valueData.employeeEntries[0]; // Should be only one employee entry per value
    if (!employeeEntry) {
      console.error('No employee entry found for value:', valueData.companyValue.name);
      return;
    }

    const feedback = ceoFeedback[valueData.companyValue.id] || {};
    
    try {
      // Check if this is demo mode
      const isDemoMode = typeof window !== 'undefined' && pdr.id.startsWith('demo-pdr-');
      
      if (isDemoMode) {
        // In demo mode, save to localStorage
        const storageKey = `ceo_behavior_feedback_${pdr.id}`;
        const existingFeedback = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        existingFeedback[valueData.companyValue.id] = {
          description: feedback.description || '',
          comments: feedback.comments || '',
          companyValueName: valueData.companyValue.name,
          savedAt: new Date().toISOString(),
        };
        
        localStorage.setItem(storageKey, JSON.stringify(existingFeedback));
        console.log('Demo mode: Saved CEO behavior feedback to localStorage for', valueData.companyValue.name);
        
        // Trigger metrics refresh
        window.dispatchEvent(new CustomEvent('ceo-feedback-updated'));
      } else {
        // Production mode - use API
        if (employeeEntry.ceoEntries && employeeEntry.ceoEntries.length > 0) {
          // Update existing CEO review
          const ceoReview = employeeEntry.ceoEntries[0];
          await updateBehaviorEntry(ceoReview.id, {
            description: feedback.description,
            comments: feedback.comments,
          });
        } else {
          // Create new CEO review
          await createCeoReview(
            employeeEntry.id,
            valueData.companyValue.id,
            {
              description: feedback.description,
              comments: feedback.comments,
            }
          );
        }
      }

      // Keep the form data in local state - don't clear it
      console.log('CEO review saved successfully, preserving form data');
      
      // Trigger metrics refresh for production mode too
      if (!isDemoMode) {
        window.dispatchEvent(new CustomEvent('ceo-feedback-updated'));
      }
      
    } catch (error) {
      console.error('Error saving CEO review:', error);
      // Keep the form data even on error so user doesn't lose their input
    }
  };

  // Save all CEO reviews at once (for navigation)
  const saveAllReviews = async (): Promise<boolean> => {
    // IMPORTANT: We don't need this function anymore as we're handling saving directly
    // in the parent component. This is kept as a no-op for compatibility.
    console.log('saveAllReviews called - this is now handled in the parent component');
    
    // Return the current feedback state to the parent for reference
    if (typeof window !== 'undefined' && pdr.id.startsWith('demo-pdr-')) {
      try {
        // Save the current state to localStorage one more time to be safe
        const storageKey = `ceo_behavior_feedback_${pdr.id}`;
        localStorage.setItem(storageKey, JSON.stringify(ceoFeedback));
        console.log('Current behavior feedback state saved to localStorage from saveAllReviews');
      } catch (error) {
        console.error('Error saving behavior feedback from saveAllReviews:', error);
      }
    }
    
    return true; // Always return success as the parent component handles the actual saving
  };

  // Expose the saveAllReviews function via ref
  useImperativeHandle(ref, () => ({
    saveAllReviews,
  }));

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Behavioral Competencies</CardTitle>
          <CardDescription>Loading behavior assessments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Behavioral Competencies</CardTitle>
        <CardDescription>
          Employees thoughts on how they can contribute to the company values this year.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {organizedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No behavior assessments found for this PDR.
          </div>
        ) : (
          <div className="space-y-4">
            {organizedData.map((valueData) => (
              <Card key={valueData.companyValue.id} className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Employee Side */}
                  <div className="space-y-3 border border-red-500/20 rounded-md p-4 bg-red-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-red-500" />
                        <h4 className="font-semibold text-red-500">Employee Assessment</h4>
                      </div>
                      {valueData.hasEmployeeEntry && (
                        <Badge variant="secondary" className="text-xs">
                          Completed
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <div className="p-2 bg-muted/50 rounded text-sm font-semibold border-l-4 border-blue-500">
                        {valueData.companyValue.name}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {valueData.companyValue.description}
                      </p>
                    </div>
                    
                    {valueData.employeeEntries.length > 0 ? (
                      valueData.employeeEntries.map((employeeEntry) => (
                        <div key={employeeEntry.id}>
                          <div>
                            <Label className="text-sm font-medium">Behaviour/Values Initiative</Label>
                            <div className="mt-1 p-2 bg-muted/50 rounded text-sm min-h-[50px] relative">
                              {employeeEntry.description ? (
                                <>
                                  {expandedDescriptions[employeeEntry.id] || !shouldTruncateText(employeeEntry.description)
                                    ? employeeEntry.description
                                    : getTruncatedText(employeeEntry.description)
                                  }
                                  {shouldTruncateText(employeeEntry.description) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="absolute bottom-1 right-1 h-6 px-2 text-xs bg-background/90 border shadow-sm hover:bg-accent"
                                      onClick={() => toggleDescriptionExpansion(employeeEntry.id)}
                                    >
                                      {expandedDescriptions[employeeEntry.id] ? (
                                        <>
                                          <ChevronUp className="h-3 w-3 mr-1" />
                                          Less
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                          More
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </>
                              ) : (
                                'No description provided'
                              )}
                            </div>
                          </div>
                          
                          {employeeEntry.rating && pdr.status !== 'SUBMITTED' && (
                            <div>
                              <Label className="text-sm font-medium">Self Rating</Label>
                              <div className="mt-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Progress value={employeeEntry.rating * 20} className="flex-1 h-3" />
                                  <span className="text-sm font-medium">{employeeEntry.rating}/5</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Employee has not yet assessed this competency
                      </div>
                    )}
                  </div>

                  {/* CEO Side */}
                  <div className="space-y-3 border border-green-600/20 rounded-md p-4 bg-green-600/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-green-600">CEO Review</h4>
                      </div>
                      {valueData.employeeEntries.length > 0 && valueData.employeeEntries[0].ceoEntries && valueData.employeeEntries[0].ceoEntries.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Previously Reviewed
                        </Badge>
                      )}
                    </div>
                    
                    {valueData.employeeEntries.length > 0 ? (
                      /* CEO Review Form */
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-sm font-medium">Adjust Employees Initiatives (Optional)</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <HelpCircle className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3" align="start">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Adjusting Employee Initiatives</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    As CEO/Manager, you have ability to adjust an employee's initiatives to best align with the companies objectives. Discuss this with the employee, and adjust as necessary.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Textarea
                            placeholder="Adjust or refine the employee's initiative if needed..."
                            value={ceoFeedback[valueData.companyValue.id]?.description || ''}
                            onChange={(e) => updateCeoFeedback(valueData.companyValue.id, 'description', e.target.value)}
                            className="mt-1 min-h-[60px] bg-muted/30"
                            rows={2}
                            disabled={pdr.isLocked}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">CEO Notes/Feedback</Label>
                          <Textarea
                            placeholder="Your notes and feedback on this initiative..."
                            value={ceoFeedback[valueData.companyValue.id]?.comments || ''}
                            onChange={(e) => updateCeoFeedback(valueData.companyValue.id, 'comments', e.target.value)}
                            className="mt-1 min-h-[60px]"
                            rows={2}
                            disabled={pdr.isLocked}
                          />
                        </div>
                        

                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Employee must complete their assessment before CEO review
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
  );
});
