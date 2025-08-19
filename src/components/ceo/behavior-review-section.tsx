'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useBehaviorEntries } from '@/hooks/use-behavior-entries';
import type { PDR, AuthUser, OrganizedBehaviorData } from '@/types';
import { MessageSquare, Star, TrendingUp, User } from 'lucide-react';

interface BehaviorReviewSectionProps {
  pdr: PDR;
  currentUser?: AuthUser;
}

export function BehaviorReviewSection({ pdr, currentUser }: BehaviorReviewSectionProps) {
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

  // Load organized data on component mount
  useEffect(() => {
    fetchOrganizedData();
  }, [fetchOrganizedData]);

  // Pre-populate form with existing CEO review data (only if form is empty)
  useEffect(() => {
    if (organizedData && organizedData.length > 0) {
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
        console.log('Pre-populating form with existing CEO review data');
        setCeoFeedback(newCeoFeedback);
      }
    }
  }, [organizedData, ceoFeedback]);

  // Update local CEO feedback state
  const updateCeoFeedback = (valueId: string, field: string, value: string | number) => {
    setCeoFeedback(prev => ({
      ...prev,
      [valueId]: {
        ...prev[valueId],
        [field]: value
      }
    }));
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
      // Check if CEO already has a review for this employee entry
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

      // Keep the form data in local state - don't clear it
      console.log('CEO review saved successfully, preserving form data');
      
    } catch (error) {
      console.error('Error saving CEO review:', error);
      // Keep the form data even on error so user doesn't lose their input
    }
  };

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
          Employee's self-assessment and CEO review of behavioral competencies
        </CardDescription>
      </CardHeader>
      <CardContent>
        {organizedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No behavior assessments found for this PDR.
          </div>
        ) : (
          <div className="space-y-6">
            {organizedData.map((valueData) => (
              <Card key={valueData.companyValue.id} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Employee Side */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-600">Employee Assessment</h4>
                      {valueData.hasEmployeeEntry && (
                        <Badge variant="secondary" className="text-xs">
                          Completed
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Company Value</Label>
                      <div className="mt-1 p-2 bg-muted/50 rounded text-sm font-medium">
                        {valueData.companyValue.name}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {valueData.companyValue.description}
                      </p>
                    </div>
                    
                    {valueData.employeeEntries.length > 0 ? (
                      valueData.employeeEntries.map((employeeEntry) => (
                        <div key={employeeEntry.id} className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Behavior Description</Label>
                            <div className="mt-1 p-2 bg-muted/50 rounded text-sm min-h-[60px]">
                              {employeeEntry.description || 'No description provided'}
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
                  <div className="space-y-4 border-l pl-6">
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
                    
                    <div>
                      <Label className="text-sm font-medium">Company Value</Label>
                      <div className="mt-1 p-2 bg-muted/50 rounded text-sm font-medium">
                        {valueData.companyValue.name}
                      </div>
                    </div>
                    
                    {valueData.employeeEntries.length > 0 ? (
                      /* CEO Review Form */
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Modified Description (Optional)</Label>
                          <Textarea
                            placeholder="Enter modified behavior description if needed..."
                            value={ceoFeedback[valueData.companyValue.id]?.description || ''}
                            onChange={(e) => updateCeoFeedback(valueData.companyValue.id, 'description', e.target.value)}
                            className="mt-1 min-h-[80px] bg-muted/30"
                            rows={3}
                            disabled={pdr.isLocked}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">CEO Feedback</Label>
                          <Textarea
                            placeholder="Your feedback on this behavior..."
                            value={ceoFeedback[valueData.companyValue.id]?.comments || ''}
                            onChange={(e) => updateCeoFeedback(valueData.companyValue.id, 'comments', e.target.value)}
                            className="mt-1 min-h-[80px]"
                            rows={4}
                            disabled={pdr.isLocked}
                          />
                        </div>
                        

                        <Separator />
                        
                        <Button
                          onClick={() => saveCeoReview(valueData)}
                          disabled={isSaving || pdr.isLocked}
                          className="w-full"
                          size="sm"
                        >
                          {isSaving ? 'Saving...' : 
                           (valueData.employeeEntries[0].ceoEntries && valueData.employeeEntries[0].ceoEntries.length > 0) 
                             ? 'Update CEO Review' 
                             : 'Save CEO Review'}
                        </Button>
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
}
