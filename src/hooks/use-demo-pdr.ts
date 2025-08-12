'use client';

import { useState, useEffect } from 'react';
import type { PDR, Goal, CompanyValue, Behavior } from '@/types';

// Demo data for testing
const DEMO_PDR: PDR = {
  id: 'test-123',
  userId: 'demo-employee-1',
  periodId: 'demo-period-1',
  status: 'DRAFT',
  currentStep: 1,
  isLocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEMO_COMPANY_VALUES: CompanyValue[] = [
  {
    id: 'value-1',
    name: 'Innovation',
    description: 'We embrace change and drive creative solutions',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'value-2',
    name: 'Collaboration',
    description: 'We work together to achieve common goals',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'value-3',
    name: 'Excellence',
    description: 'We strive for the highest quality in everything we do',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function useDemoPDR(pdrId: string) {
  const [pdr] = useState<PDR>(DEMO_PDR);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return {
    data: pdr,
    isLoading,
    error,
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

  const addGoal = (goalData: Partial<Goal>) => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      pdrId,
      title: goalData.title || '',
      description: goalData.description || null,
      targetOutcome: goalData.targetOutcome || null,
      successCriteria: goalData.successCriteria || null,
      priority: goalData.priority || 'MEDIUM',
      employeeRating: null,
      managerRating: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem(`demo_goals_${pdrId}`, JSON.stringify(updatedGoals));
  };

  const updateGoal = (goalId: string, goalData: Partial<Goal>) => {
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

  const addBehavior = (behaviorData: Partial<Behavior>) => {
    const newBehavior: Behavior = {
      id: `behavior-${Date.now()}`,
      pdrId,
      companyValueId: behaviorData.companyValueId || '',
      description: behaviorData.description || '',
      examples: behaviorData.examples || null,
      employeeRating: behaviorData.employeeRating || null,
      employeeSelfAssessment: behaviorData.employeeSelfAssessment || null,
      managerRating: null,
      managerComments: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedBehaviors = [...behaviors, newBehavior];
    setBehaviors(updatedBehaviors);
    localStorage.setItem(`demo_behaviors_${pdrId}`, JSON.stringify(updatedBehaviors));
  };

  const updateBehavior = (behaviorId: string, behaviorData: Partial<Behavior>) => {
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
