'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { BehaviorEntry, BehaviorEntryFormData, OrganizedBehaviorData, AuthUser } from '@/types';

interface UseBehaviorEntriesProps {
  pdrId: string;
  currentUser?: AuthUser;
}

export function useBehaviorEntries({ pdrId, currentUser }: UseBehaviorEntriesProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [behaviorEntries, setBehaviorEntries] = useState<BehaviorEntry[]>([]);
  const [organizedData, setOrganizedData] = useState<OrganizedBehaviorData[]>([]);

  // Fetch all behavior entries for a PDR
  const fetchBehaviorEntries = useCallback(async () => {
    if (!pdrId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/pdrs/${pdrId}/behavior-entries`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch behavior entries');
      }

      const result = await response.json();
      setBehaviorEntries(result.data || []);
    } catch (error) {
      console.error('Error fetching behavior entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load behavior entries',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [pdrId, toast]);

  // Fetch organized behavior data (grouped by company value)
  const fetchOrganizedData = useCallback(async () => {
    if (!pdrId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/pdrs/${pdrId}/behavior-entries/organized`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch organized behavior data');
      }

      const result = await response.json();
      setOrganizedData(result.data || []);
    } catch (error) {
      console.error('Error fetching organized behavior data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load behavior data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [pdrId, toast]);

  // Create a new behavior entry
  const createBehaviorEntry = useCallback(async (data: BehaviorEntryFormData): Promise<BehaviorEntry | null> => {
    if (!pdrId || !currentUser) return null;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/pdrs/${pdrId}/behavior-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to create behavior entry');
      }

      const result = await response.json();
      const newEntry = result.data;

      // Update local state
      setBehaviorEntries(prev => [...prev, newEntry]);

      toast({
        title: 'Success',
        description: `${data.authorType === 'CEO' ? 'CEO review' : 'Behavior entry'} created successfully`,
      });

      return newEntry;
    } catch (error) {
      console.error('Error creating behavior entry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create behavior entry',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [pdrId, currentUser, toast]);

  // Update an existing behavior entry
  const updateBehaviorEntry = useCallback(async (
    entryId: string, 
    data: Partial<BehaviorEntryFormData>
  ): Promise<BehaviorEntry | null> => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/behavior-entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to update behavior entry');
      }

      const result = await response.json();
      const updatedEntry = result.data;

      // Update local state
      setBehaviorEntries(prev => 
        prev.map(entry => entry.id === entryId ? updatedEntry : entry)
      );

      toast({
        title: 'Success',
        description: 'Behavior entry updated successfully',
      });

      return updatedEntry;
    } catch (error) {
      console.error('Error updating behavior entry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update behavior entry',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Delete a behavior entry
  const deleteBehaviorEntry = useCallback(async (entryId: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/behavior-entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to delete behavior entry');
      }

      // Update local state
      setBehaviorEntries(prev => prev.filter(entry => entry.id !== entryId));

      toast({
        title: 'Success',
        description: 'Behavior entry deleted successfully',
      });

      return true;
    } catch (error) {
      console.error('Error deleting behavior entry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete behavior entry',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Create CEO review for an employee entry
  const createCeoReview = useCallback(async (
    employeeEntryId: string,
    valueId: string,
    reviewData: {
      description?: string;
      comments?: string;
      rating?: number;
    }
  ): Promise<BehaviorEntry | null> => {
    if (!currentUser || currentUser.role !== 'CEO') {
      toast({
        title: 'Error',
        description: 'Only CEOs can create reviews',
        variant: 'destructive',
      });
      return null;
    }

    const ceoEntryData: BehaviorEntryFormData = {
      valueId,
      authorType: 'CEO',
      description: reviewData.description,
      comments: reviewData.comments,
      rating: reviewData.rating,
      employeeEntryId,
    };

    return createBehaviorEntry(ceoEntryData);
  }, [currentUser, createBehaviorEntry, toast]);

  // Helper function to get employee entry for a company value
  const getEmployeeEntry = useCallback((valueId: string): BehaviorEntry | undefined => {
    return behaviorEntries.find(entry => 
      entry.valueId === valueId && 
      entry.authorType === 'EMPLOYEE'
    );
  }, [behaviorEntries]);

  // Helper function to get CEO entries for an employee entry
  const getCeoEntries = useCallback((employeeEntryId: string): BehaviorEntry[] => {
    return behaviorEntries.filter(entry => 
      entry.employeeEntryId === employeeEntryId && 
      entry.authorType === 'CEO'
    );
  }, [behaviorEntries]);

  // Helper function to check if CEO has reviewed a specific value
  const hasCeoReview = useCallback((employeeEntryId: string): boolean => {
    return behaviorEntries.some(entry => 
      entry.employeeEntryId === employeeEntryId && 
      entry.authorType === 'CEO'
    );
  }, [behaviorEntries]);

  return {
    // State
    isLoading,
    isSaving,
    behaviorEntries,
    organizedData,

    // Actions
    fetchBehaviorEntries,
    fetchOrganizedData,
    createBehaviorEntry,
    updateBehaviorEntry,
    deleteBehaviorEntry,
    createCeoReview,

    // Helpers
    getEmployeeEntry,
    getCeoEntries,
    hasCeoReview,
  };
}
