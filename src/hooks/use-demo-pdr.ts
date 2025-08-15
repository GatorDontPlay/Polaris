'use client';

import { useState, useEffect } from 'react';
import type { PDR, Goal, CompanyValue, Behavior, GoalFormData, BehaviorFormData } from '@/types';

// Demo data for testing - using realistic dates for better demo experience
const DEMO_PDR: PDR = {
  id: '550e8400-e29b-41d4-a716-446655440100',
  userId: 'demo-employee-1', // Must match demo auth user ID
  periodId: '550e8400-e29b-41d4-a716-446655440300',
  fyLabel: 'FY 2024-25',
  fyStartDate: new Date('2024-04-01'),
  fyEndDate: new Date('2025-03-31'),
  status: 'SUBMITTED',
  currentStep: 4,
  isLocked: false,
  meetingBooked: false,
  createdAt: new Date('2024-07-15T09:30:00.000Z'), // Created in July 2024
  updatedAt: new Date('2024-11-20T14:45:00.000Z'), // Last updated in November 2024
  submittedAt: new Date('2024-11-18T16:20:00.000Z'), // Submitted a couple days before last update
};

const DEMO_COMPANY_VALUES: CompanyValue[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Innovation',
    description: 'We embrace change and drive creative solutions',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Collaboration',
    description: 'We work together to achieve common goals',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Excellence',
    description: 'We strive for the highest quality in everything we do',
    isActive: true,
    sortOrder: 3,
    createdAt: new Date(),
  },
];

export function useDemoPDR(pdrId: string) {
  const [pdr, setPdr] = useState<PDR>(DEMO_PDR);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Load PDR from localStorage if it exists
    const savedPdr = localStorage.getItem(`demo_pdr_${pdrId}`);
    if (savedPdr) {
      try {
        const parsedPdr = JSON.parse(savedPdr);
        // Convert date strings back to Date objects
        setPdr({
          ...parsedPdr,
          createdAt: new Date(parsedPdr.createdAt),
          updatedAt: new Date(parsedPdr.updatedAt),
          ...(parsedPdr.submittedAt && { submittedAt: new Date(parsedPdr.submittedAt) }),
        });
      } catch {
        setPdr(DEMO_PDR);
      }
    }
  }, [pdrId]);

  const updatePdr = (updates: Partial<PDR>) => {
    const updatedPdr = { ...pdr, ...updates, updatedAt: new Date() };
    setPdr(updatedPdr);
    localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(updatedPdr));
  };

  const deletePdr = () => {
    // Clear all related data
    localStorage.removeItem(`demo_pdr_${pdrId}`);
    localStorage.removeItem(`demo_goals_${pdrId}`);
    localStorage.removeItem(`demo_behaviors_${pdrId}`);
    // Reset to initial state
    setPdr(DEMO_PDR);
  };

  return {
    data: pdr,
    isLoading,
    error,
    updatePdr,
    deletePdr,
  };
}

export function useDemoGoals(pdrId: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading] = useState(false);

  useEffect(() => {
    // Load goals from localStorage if they exist
    const savedGoals = localStorage.getItem(`demo_goals_${pdrId}`);
    if (savedGoals) {
      try {
        setGoals(JSON.parse(savedGoals));
      } catch {
        setGoals([]);
      }
    }
  }, [pdrId]);

  const addGoal = (goalData: GoalFormData) => {
    const newGoal: Goal = {
      id: `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12)}`,
      pdrId,
      title: goalData.title,
      description: goalData.description || undefined,
      targetOutcome: goalData.targetOutcome || undefined,
      successCriteria: goalData.successCriteria || undefined,
      priority: goalData.priority || 'MEDIUM',
      employeeRating: undefined,
      ceoRating: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem(`demo_goals_${pdrId}`, JSON.stringify(updatedGoals));
  };

  const updateGoal = (goalId: string, goalData: GoalFormData) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId ? { ...goal, ...goalData, updatedAt: new Date() } : goal
    );
    setGoals(updatedGoals);
    localStorage.setItem(`demo_goals_${pdrId}`, JSON.stringify(updatedGoals));
  };

  const deleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    setGoals(updatedGoals);
    localStorage.setItem(`demo_goals_${pdrId}`, JSON.stringify(updatedGoals));
  };

  return {
    data: goals,
    isLoading,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}

export function useDemoCompanyValues() {
  return {
    data: DEMO_COMPANY_VALUES,
    isLoading: false,
    error: null,
  };
}

export function useDemoBehaviors(pdrId: string) {
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [isLoading] = useState(false);

  useEffect(() => {
    // Load behaviors from localStorage if they exist
    const savedBehaviors = localStorage.getItem(`demo_behaviors_${pdrId}`);
    if (savedBehaviors) {
      try {
        setBehaviors(JSON.parse(savedBehaviors));
      } catch {
        setBehaviors([]);
      }
    }
  }, [pdrId]);

  const addBehavior = (behaviorData: BehaviorFormData) => {
    const newBehavior: Behavior = {
      id: `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12)}`,
      pdrId,
      valueId: behaviorData.valueId,
      description: behaviorData.description || '',
      examples: behaviorData.examples || null,
      employeeRating: behaviorData.employeeRating || null,
      employeeSelfAssessment: behaviorData.employeeSelfAssessment || null,
      ceoComments: null,
      ceoRating: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedBehaviors = [...behaviors, newBehavior];
    setBehaviors(updatedBehaviors);
    localStorage.setItem(`demo_behaviors_${pdrId}`, JSON.stringify(updatedBehaviors));
  };

  const updateBehavior = (behaviorId: string, behaviorData: Partial<BehaviorFormData>) => {
    const updatedBehaviors = behaviors.map(behavior =>
      behavior.id === behaviorId ? { ...behavior, ...behaviorData, updatedAt: new Date() } : behavior
    );
    setBehaviors(updatedBehaviors);
    localStorage.setItem(`demo_behaviors_${pdrId}`, JSON.stringify(updatedBehaviors));
  };

  const deleteBehavior = (behaviorId: string) => {
    const updatedBehaviors = behaviors.filter(behavior => behavior.id !== behaviorId);
    setBehaviors(updatedBehaviors);
    localStorage.setItem(`demo_behaviors_${pdrId}`, JSON.stringify(updatedBehaviors));
  };

  return {
    data: behaviors,
    isLoading,
    addBehavior,
    updateBehavior,
    deleteBehavior,
  };
}

// Hook for dashboard - manages current PDR for the user
export function useDemoPDRDashboard() {
  const [currentPDR, setCurrentPDR] = useState<PDR | null>(null);
  const [isLoading] = useState(false);

  useEffect(() => {
    // Load current PDR from localStorage
    const savedPdr = localStorage.getItem('demo_current_pdr');
    if (savedPdr) {
      try {
        const parsedPdr = JSON.parse(savedPdr);
        // Convert date strings back to Date objects
        setCurrentPDR({
          ...parsedPdr,
          createdAt: new Date(parsedPdr.createdAt),
          updatedAt: new Date(parsedPdr.updatedAt),
          ...(parsedPdr.submittedAt && { submittedAt: new Date(parsedPdr.submittedAt) }),
        });
      } catch {
        setCurrentPDR(null);
      }
    }
  }, []);

  const createPDR = () => {
    const newPDR: PDR = {
      id: `demo-pdr-${Date.now()}`,
      userId: 'demo-employee-1',
      periodId: '550e8400-e29b-41d4-a716-446655440300',
      status: 'Created',
      currentStep: 1,
      isLocked: false,
      meetingBooked: false,
      fyLabel: '2024',
      fyStartDate: new Date('2024-07-01'),
      fyEndDate: new Date('2025-06-30'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setCurrentPDR(newPDR);
    localStorage.setItem('demo_current_pdr', JSON.stringify(newPDR));
    localStorage.setItem(`demo_pdr_${newPDR.id}`, JSON.stringify(newPDR));
    
    return newPDR;
  };

  return {
    data: currentPDR,
    isLoading,
    createPDR,
    resetDemo: () => {
      // Clear all localStorage demo data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('demo_')) {
          localStorage.removeItem(key);
        }
      });
      setCurrentPDR(null);
      console.log('🧹 Demo data cleared - refresh page to see updated demo with realistic dates');
    }
  };
}
