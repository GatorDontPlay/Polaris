'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBehaviorEntries } from '@/hooks/use-behavior-entries';
import type { PDR, AuthUser, OrganizedBehaviorData } from '@/types';
import { PDRStatus } from '@/types/pdr-status';
import { MessageSquare, Star, TrendingUp, User, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface BehaviorReviewSectionProps {
  pdr: PDR;
  currentUser?: AuthUser;
}

export interface BehaviorReviewSectionRef {
  saveAllReviews: () => Promise<boolean>;
}

export const BehaviorReviewSection = forwardRef<BehaviorReviewSectionRef, BehaviorReviewSectionProps>(
  function BehaviorReviewSection({ pdr, currentUser }, ref) {
  const {
    isLoading,
    organizedData,
    fetchOrganizedData,
  } = useBehaviorEntries({ 
    pdrId: pdr.id, 
    ...(currentUser && { currentUser })
  });

  // Local state for CEO feedback forms
  const [ceoFeedback, setCeoFeedback] = useState<Record<string, {
    description?: string;
    comments?: string;
  }>>({});
  
  // Local state for additional CEO feedback (self-reflection and deep dive)
  const [additionalCeoFeedback, setAdditionalCeoFeedback] = useState<{
    selfReflection?: string;
    deepDive?: string;
  }>({});
  
  // Local state for employee additional data (self-reflection and deep dive)
  const [employeeAdditionalData, setEmployeeAdditionalData] = useState<{
    selfReflection?: string;
    deepDiveDevelopment?: string;
  }>({});
  
  // State to track expanded employee descriptions
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // Ref for debounce timer
  const saveAdditionalFeedbackTimer = useRef<NodeJS.Timeout>();

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

  // Debounced save function for additional CEO feedback
  const debouncedSaveAdditionalFeedback = useCallback((feedback: typeof additionalCeoFeedback) => {
    // Clear existing timer
    if (saveAdditionalFeedbackTimer.current) {
      clearTimeout(saveAdditionalFeedbackTimer.current);
    }

    // Set new timer to save after 500ms
    saveAdditionalFeedbackTimer.current = setTimeout(async () => {
      try {
        console.log('💾 Auto-saving CEO additional feedback to database...');
        const response = await fetch(`/api/pdrs/${pdr.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ceoFields: {
              developmentFeedback: {
                selfReflectionComments: feedback.selfReflection || '',
                deepDiveComments: feedback.deepDive || ''
              }
            }
          })
        });

        if (response.ok) {
          console.log('✅ CEO additional feedback saved successfully');
        } else {
          console.error('❌ Failed to save CEO additional feedback:', response.status);
        }
      } catch (error) {
        console.error('❌ Error saving CEO additional feedback:', error);
      }
    }, 500);
  }, [pdr.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveAdditionalFeedbackTimer.current) {
        clearTimeout(saveAdditionalFeedbackTimer.current);
      }
    };
  }, []);

  // Additional CEO feedback is saved to database via API calls


  // Load organized data on component mount
  useEffect(() => {
    fetchOrganizedData();
  }, [fetchOrganizedData]);

  // CEO behavior feedback is loaded from the database via the organized data
  // Additional CEO feedback is also loaded from database

  // Load employee additional data from database
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Load from database (PDR employee_fields)
        const dbDevelopmentData = pdr.employeeFields?.developmentFields;
        
        if (dbDevelopmentData && (dbDevelopmentData.selfReflection || dbDevelopmentData.deepDiveDevelopment)) {
          console.log('✅ Loading development data from database:', dbDevelopmentData);
          setEmployeeAdditionalData({
            selfReflection: dbDevelopmentData.selfReflection || '',
            deepDiveDevelopment: dbDevelopmentData.deepDiveDevelopment || ''
          });
        }
      } catch (error) {
        console.error('❌ Error loading employee development data:', error);
      }
    }
  }, [pdr.id, pdr.employeeFields]);

  // Load existing CEO additional feedback from database
  useEffect(() => {
    if (pdr?.ceoFields?.developmentFeedback) {
      console.log('✅ Loading CEO additional feedback from database:', pdr.ceoFields.developmentFeedback);
      setAdditionalCeoFeedback({
        selfReflection: pdr.ceoFields.developmentFeedback.selfReflectionComments || '',
        deepDive: pdr.ceoFields.developmentFeedback.deepDiveComments || ''
      });
    }
  }, [pdr.id, pdr.ceoFields]);

  // CEO feedback is saved to database via API calls, not localStorage

  // Pre-populate form with existing CEO review data from API (only if form is empty and not demo mode)
  useEffect(() => {
    
    const isDemoMode = typeof window !== 'undefined' && pdr.id.startsWith('demo-pdr-');
    
    if (!isDemoMode && organizedData && organizedData.length > 0) {
      const newCeoFeedback: Record<string, { description?: string; comments?: string; }> = {};
      let hasExistingData = false;
      
      organizedData.forEach((valueData) => {
        
        // Look for CEO feedback in any of the behavior entries for this company value
        if (valueData.employeeEntries && valueData.employeeEntries.length > 0) {
          let ceoComments = '';
          let hasComments = false;
          
          // Check all behaviors for this company value to find CEO feedback
          valueData.employeeEntries.forEach((behavior) => {
            console.log('🔍 Loading behavior:', {
              id: behavior.id,
              ceoComments: behavior.ceoComments,
              hasContent: !!behavior.ceoComments
            });
            
            if (behavior.ceoComments && behavior.ceoComments.trim() !== '') {
              ceoComments = behavior.ceoComments;
              hasComments = true;
            }
          });
          
          if (hasComments) {
            newCeoFeedback[valueData.companyValue.id] = {
              description: ceoComments, // Using comments as description for now
              comments: ceoComments,
            };
            hasExistingData = true;
          }
        }
      });
      
      // Update form state if we have existing data from the database
      if (hasExistingData) {
        setCeoFeedback(prev => {
          // Merge existing saved data with current form state
          // Prioritize database data over form state to ensure persistence
          const merged = { ...prev };
          Object.keys(newCeoFeedback).forEach(valueId => {
            merged[valueId] = {
              ...prev[valueId],
              ...newCeoFeedback[valueId]
            };
          });
          return merged;
        });
      }
    }
  }, [organizedData, pdr.id]);

  // Update local CEO feedback state and auto-save to database
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
      
      // Auto-save to database (debounced)
      if (typeof window !== 'undefined') {
        const valueData = organizedData?.find(d => d.companyValue.id === valueId);
        if (valueData && valueData.employeeEntries?.[0]) {
          // Use a timeout to debounce rapid typing
          setTimeout(() => {
            saveCeoReview(valueData).catch(() => {
              // Silent error handling
            });
          }, 500);
        }
      }
      
      return updated;
    });
  };

  // Save CEO review for a specific company value
  const saveCeoReview = async (valueData: OrganizedBehaviorData) => {
    const employeeEntry = valueData.employeeEntries && valueData.employeeEntries[0]; // Should be only one employee entry per value
    if (!employeeEntry) {
      return;
    }

    const feedback = ceoFeedback[valueData.companyValue.id] || {};
    
    try {
      // Save to database via API
      const response = await fetch(`/api/behaviors/${employeeEntry.id}/ceo-feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ceoNotes: feedback.comments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save CEO feedback: ${response.status}`);
      }

      // Keep the form data in local state - don't clear it
      
      // Trigger metrics refresh
      window.dispatchEvent(new CustomEvent('ceo-feedback-updated'));
      
    } catch (error) {
      // Keep the form data even on error so user doesn't lose their input
    }
  };

  // Save all CEO reviews at once (for navigation)
  const saveAllReviews = async (): Promise<boolean> => {
    try {
      // Save all feedback to database via API
      let allSaved = true;
      
      for (const valueData of organizedData) {
        const feedback = ceoFeedback[valueData.companyValue.id];
        
        if (feedback && (feedback.comments || feedback.description)) {
          // Save CEO feedback for each behavior entry under this company value
          if (valueData.employeeEntries && valueData.employeeEntries.length > 0) {
            for (const employeeEntry of valueData.employeeEntries) {
              try {
                
                const response = await fetch(`/api/behaviors/${employeeEntry.id}/ceo-feedback`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    ceoNotes: feedback.comments || feedback.description || '',
                  }),
                });

                if (!response.ok) {
                  allSaved = false;
                }
              } catch (error) {
                allSaved = false;
              }
            }
          }
        }
      }
      
      // Additional CEO feedback is saved via the main API endpoints
      // No separate save needed here
      
      // Refresh organized data to show updated CEO feedback
      if (allSaved) {
        await fetchOrganizedData();
      }
      
      return allSaved;
    } catch (error) {
      console.error('Error saving CEO reviews:', error);
      return false;
    }
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
                    
                    {valueData.employeeEntries && valueData.employeeEntries.length > 0 ? (
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
                          
                          {employeeEntry.rating && (pdr.status === PDRStatus.END_YEAR_REVIEW || pdr.status === PDRStatus.END_YEAR_SUBMITTED) && (
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
                      {valueData.employeeEntries && valueData.employeeEntries.length > 0 && valueData.employeeEntries[0].ceoEntries && valueData.employeeEntries[0].ceoEntries.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Previously Reviewed
                        </Badge>
                      )}
                    </div>
                    
                    {valueData.employeeEntries && valueData.employeeEntries.length > 0 ? (
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

            {/* Additional Development Sections */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-status-info" />
                Additional Development Areas
              </h3>
              
              {/* Self Reflection Section */}
              <Card className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Employee Side */}
                  <div className="space-y-3 border border-red-500/20 rounded-md p-4 bg-red-500/5">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-red-500" />
                      <h4 className="font-semibold text-red-500">Employee Self-Reflection</h4>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Personal Development Reflection</Label>
                      <div className="mt-1 p-2 bg-muted/50 rounded text-sm min-h-[80px]">
                        {employeeAdditionalData.selfReflection ? (
                          <p className="text-foreground">{employeeAdditionalData.selfReflection}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No self-reflection provided by employee</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CEO Side */}
                  <div className="space-y-3 border border-green-500/20 rounded-md p-4 bg-green-500/5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <h4 className="font-semibold text-green-500">CEO Feedback</h4>
                    </div>
                    
                    <div>
                      <Label htmlFor="self-reflection-ceo-comments" className="text-sm font-medium">
                        Comments on Self-Reflection
                      </Label>
                      <textarea
                        id="self-reflection-ceo-comments"
                        className="w-full mt-1 px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/30 resize-none text-sm"
                        rows={4}
                        placeholder="Provide feedback on the employee's self-reflection..."
                        value={additionalCeoFeedback.selfReflection || ''}
                        onChange={(e) => {
                          const newFeedback = {
                            ...additionalCeoFeedback,
                            selfReflection: e.target.value
                          };
                          setAdditionalCeoFeedback(newFeedback);
                          debouncedSaveAdditionalFeedback(newFeedback);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Deep Dive Development Section */}
              <Card className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Employee Side */}
                  <div className="space-y-3 border border-red-500/20 rounded-md p-4 bg-red-500/5">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-red-500" />
                      <h4 className="font-semibold text-red-500">Employee Development Plan</h4>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">CodeFish 3D - Deep Dive Development ($1000 Budget)</Label>
                      <div className="mt-1 p-2 bg-muted/50 rounded text-sm min-h-[80px]">
                        {employeeAdditionalData.deepDiveDevelopment ? (
                          <p className="text-foreground">{employeeAdditionalData.deepDiveDevelopment}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No development plan provided by employee</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CEO Side */}
                  <div className="space-y-3 border border-green-500/20 rounded-md p-4 bg-green-500/5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <h4 className="font-semibold text-green-500">CEO Feedback</h4>
                    </div>
                    
                    <div>
                      <Label htmlFor="deep-dive-ceo-comments" className="text-sm font-medium">
                        Comments on Development Plan
                      </Label>
                      <textarea
                        id="deep-dive-ceo-comments"
                        className="w-full mt-1 px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/30 resize-none text-sm"
                        rows={4}
                        placeholder="Provide feedback on the employee's development plan..."
                        value={additionalCeoFeedback.deepDive || ''}
                        onChange={(e) => {
                          const newFeedback = {
                            ...additionalCeoFeedback,
                            deepDive: e.target.value
                          };
                          setAdditionalCeoFeedback(newFeedback);
                          debouncedSaveAdditionalFeedback(newFeedback);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});