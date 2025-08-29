'use client';

import { useState, useEffect } from 'react';
import type { PDR, Goal, CompanyValue, Behavior, GoalFormData, BehaviorFormData } from '@/types';
import { logDemoAudit } from '@/lib/demo-audit';

// No seeded PDR data - clean slate for manual testing

const DEMO_COMPANY_VALUES: CompanyValue[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Lean Thinking',
    description: 'We embrace a lean mindset, always seeking ways to eliminate waste and improve productivity. This ensures we deliver optimal results with minimal resources and maximum impact.',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Craftsmanship',
    description: 'We take pride in creating high-quality products and services. While we use AI to enhance our capabilities and streamline delivery, it\'s our team\'s creativity, expertise, and attention to detail that shape our solutions.',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Value-Centric Innovation',
    description: 'We focus on creating products and services that add significant value to our customers\' lives. Innovation isn\'t just about new ideas, it\'s about delivering meaningful, efficient solutions that solve real-world challenges.',
    isActive: true,
    sortOrder: 3,
    createdAt: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Blameless Problem-Solving',
    description: 'We approach every challenge with a forward-looking, solution-driven mindset. Instead of assigning blame, we focus on learning, improvement, and taking ownership to move the business forward.',
    isActive: true,
    sortOrder: 4,
    createdAt: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Self Reflection',
    description: 'Self Reflection / Development Reflect on your development goals and how you\'d like to grow.',
    isActive: true,
    sortOrder: 5,
    createdAt: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'CodeFish 3D - Deep Dive Development',
    description: 'You have up to $1000 per financial year to invest in your learning and growth. This could include courses, tools, workshops, or any learning experience that sparks your curiosity and aligns with our goals. We encourage you to share what you learn with the team to create a culture of continuous improvement.',
    isActive: true,
    sortOrder: 6,
    createdAt: new Date(),
  },
];

export function useDemoPDR(pdrId: string) {
  const [pdr, setPdr] = useState<PDR | null>(null);
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
        setPdr(null);
      }
    } else {
      setPdr(null);
    }
  }, [pdrId]);

  const updatePdr = (updates: Partial<PDR>) => {
    if (!pdr) return;
    
    const oldPdr = { ...pdr };
    const updatedPdr = { ...pdr, ...updates, updatedAt: new Date() };
    setPdr(updatedPdr);
    localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(updatedPdr));
    
    // Log audit trail
    logDemoAudit({
      action: 'UPDATE',
      tableName: 'pdrs',
      recordId: pdrId,
      oldValues: oldPdr,
      newValues: updatedPdr,
    });
    
    // Trigger audit update event
    window.dispatchEvent(new CustomEvent('demo-audit-updated'));
    
    // Also update the current PDR if this is the active one
    const currentPdr = localStorage.getItem('demo_current_pdr');
    if (currentPdr) {
      try {
        const parsedCurrentPdr = JSON.parse(currentPdr);
        if (parsedCurrentPdr.id === pdrId) {
          localStorage.setItem('demo_current_pdr', JSON.stringify(updatedPdr));
          // Trigger event to update dashboard
          window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
        }
      } catch {
        // If parsing fails, assume this might be the current PDR
        localStorage.setItem('demo_current_pdr', JSON.stringify(updatedPdr));
        window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
      }
    }
  };

  const deletePdr = () => {
    // Get the current PDR data before deleting for audit log
    const currentPdrData = pdr;
    
    // Log the deletion in audit trail BEFORE clearing data
    if (currentPdrData) {
      logDemoAudit({
        action: 'DELETE',
        tableName: 'pdrs',
        recordId: pdrId,
        oldValues: currentPdrData,
        newValues: null,
      });
      
      // Trigger audit update event
      window.dispatchEvent(new CustomEvent('demo-audit-updated'));
    }
    
    // Clear all related data
    localStorage.removeItem(`demo_pdr_${pdrId}`);
    localStorage.removeItem(`demo_goals_${pdrId}`);
    localStorage.removeItem(`demo_behaviors_${pdrId}`);
    
    // Also clear the current PDR from dashboard if it matches this PDR
    const currentPdr = localStorage.getItem('demo_current_pdr');
    if (currentPdr) {
      try {
        const parsedCurrentPdr = JSON.parse(currentPdr);
        if (parsedCurrentPdr.id === pdrId) {
          localStorage.removeItem('demo_current_pdr');
          // Trigger custom event to update dashboard in same tab
          window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
        }
      } catch {
        // If parsing fails, just remove it to be safe
        localStorage.removeItem('demo_current_pdr');
        window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
      }
    }
    
    // Reset to initial state (no PDR)
    setPdr(null);
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
      goalMapping: goalData.goalMapping || 'PEOPLE_CULTURE',
      priority: goalData.priority || 'MEDIUM',
      weighting: goalData.weighting || 0,
      employeeRating: undefined,
      ceoRating: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem(`demo_goals_${pdrId}`, JSON.stringify(updatedGoals));
    
    // Log audit trail
    logDemoAudit({
      action: 'INSERT',
      tableName: 'goals',
      recordId: newGoal.id,
      newValues: newGoal,
    });
    
    // Trigger audit update event
    window.dispatchEvent(new CustomEvent('demo-audit-updated'));
  };

  const updateGoal = (goalId: string, goalData: GoalFormData) => {
    const oldGoal = goals.find(g => g.id === goalId);
    const updatedGoals = goals.map(goal =>
      goal.id === goalId ? { ...goal, ...goalData, updatedAt: new Date() } : goal
    );
    setGoals(updatedGoals);
    localStorage.setItem(`demo_goals_${pdrId}`, JSON.stringify(updatedGoals));
    
    // Log audit trail
    if (oldGoal) {
      const newGoal = updatedGoals.find(g => g.id === goalId);
      logDemoAudit({
        action: 'UPDATE',
        tableName: 'goals',
        recordId: goalId,
        oldValues: oldGoal,
        newValues: newGoal,
      });
      
      // Trigger audit update event
      window.dispatchEvent(new CustomEvent('demo-audit-updated'));
    }
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
    const loadBehaviors = () => {
      const savedBehaviors = localStorage.getItem(`demo_behaviors_${pdrId}`);
      if (savedBehaviors) {
        try {
          const parsed = JSON.parse(savedBehaviors);
          setBehaviors(parsed);

        } catch {
          setBehaviors([]);
        }
      } else {
        setBehaviors([]);
      }
    };

    // Load initially
    loadBehaviors();

    // Listen for storage events to detect changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `demo_behaviors_${pdrId}`) {
        loadBehaviors();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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
    
    // Log audit trail
    logDemoAudit({
      action: 'INSERT',
      tableName: 'behaviors',
      recordId: newBehavior.id,
      newValues: newBehavior,
    });
    
    // Trigger audit update event
    window.dispatchEvent(new CustomEvent('demo-audit-updated'));
  };

  const updateBehavior = (behaviorId: string, behaviorData: Partial<BehaviorFormData>) => {
    const oldBehavior = behaviors.find(b => b.id === behaviorId);
    const updatedBehaviors = behaviors.map(behavior =>
      behavior.id === behaviorId ? { ...behavior, ...behaviorData, updatedAt: new Date() } : behavior
    );
    setBehaviors(updatedBehaviors);
    localStorage.setItem(`demo_behaviors_${pdrId}`, JSON.stringify(updatedBehaviors));
    
    // Log audit trail
    if (oldBehavior) {
      const newBehavior = updatedBehaviors.find(b => b.id === behaviorId);
      logDemoAudit({
        action: 'UPDATE',
        tableName: 'behaviors',
        recordId: behaviorId,
        oldValues: oldBehavior,
        newValues: newBehavior,
      });
      
      // Trigger audit update event
      window.dispatchEvent(new CustomEvent('demo-audit-updated'));
    }
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

  const loadCurrentPDR = () => {
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
    } else {
      setCurrentPDR(null);
    }
  };

  useEffect(() => {
    // Load current PDR from localStorage
    loadCurrentPDR();

    // Listen for storage changes to update when PDR is deleted
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'demo_current_pdr') {
        loadCurrentPDR();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events in case deletion happens in same tab
    const handleCustomPDRChange = () => {
      loadCurrentPDR();
    };
    
    window.addEventListener('demo-pdr-changed', handleCustomPDRChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('demo-pdr-changed', handleCustomPDRChange);
    };
  }, []);

  const createPDR = (financialYear?: { label: string; startDate: Date; endDate: Date }) => {
    // Use provided financial year or default to current one
    const fyData = financialYear || {
      label: '2024-2025',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2025-06-30')
    };

    const newPDR: PDR = {
      id: `demo-pdr-${Date.now()}`,
      userId: 'demo-employee-1',
      periodId: '550e8400-e29b-41d4-a716-446655440300',
      status: 'Created',
      currentStep: 1,
      isLocked: false,
      meetingBooked: false,
      fyLabel: fyData.label,
      fyStartDate: fyData.startDate,
      fyEndDate: fyData.endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setCurrentPDR(newPDR);
    localStorage.setItem('demo_current_pdr', JSON.stringify(newPDR));
    localStorage.setItem(`demo_pdr_${newPDR.id}`, JSON.stringify(newPDR));
    
    // Log audit trail
    logDemoAudit({
      action: 'INSERT',
      tableName: 'pdrs',
      recordId: newPDR.id,
      newValues: newPDR,
    });
    
    // Trigger audit update event
    window.dispatchEvent(new CustomEvent('demo-audit-updated'));
    
    return newPDR;
  };

  const resetDemoToSubmitted = () => {
    // This function is deprecated - no hardcoded demo data
    console.log('⚠️ resetDemoToSubmitted called but no demo data exists');
    return null;
  };

  const debugLocalStorage = () => {
    console.log('🔍 Debug localStorage state:');
    const keys = Object.keys(localStorage);
    const demoKeys = keys.filter(key => key.startsWith('demo_') || key.startsWith('ceo_'));
    
    console.log('Found demo keys:', demoKeys);
    
    demoKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value ? JSON.parse(value) : null);
    });
    
    if (demoKeys.length === 0) {
      console.log('✅ No demo data found in localStorage');
    }
  };

  const clearAllDemoData = () => {
    // Clear all localStorage demo data EXCEPT user auth data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if ((key.startsWith('demo_') || key.startsWith('ceo_')) && key !== 'demo_user') {
        localStorage.removeItem(key);
      }
    });
    setCurrentPDR(null);
    
    // Trigger event to update dashboard
    window.dispatchEvent(new CustomEvent('demo-pdr-changed'));
    
    console.log('🧹 Demo PDR data cleared - keeping user auth data intact');
  };

  return {
    data: currentPDR,
    isLoading,
    createPDR,
    resetDemoToSubmitted,
  };
}

// Hook for PDR history - gets all user PDRs
export function useDemoPDRHistory() {
  const [pdrHistory, setPdrHistory] = useState<PDR[]>([]);
  const [isLoading] = useState(false);

  const loadPDRHistory = () => {
    const pdrs: PDR[] = [];
    
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    // Get current PDR
    const currentPDR = localStorage.getItem('demo_current_pdr');
    if (currentPDR) {
      try {
        const parsed = JSON.parse(currentPDR);
        pdrs.push({
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
          ...(parsed.submittedAt && { submittedAt: new Date(parsed.submittedAt) }),
        });
      } catch (error) {
        console.error('Error parsing current PDR:', error);
      }
    }

    // Get all individual PDRs stored in localStorage
    const allKeys = Object.keys(localStorage);
    const pdrKeys = allKeys.filter(key => key.startsWith('demo_pdr_') && key !== 'demo_current_pdr');
    
    for (const key of pdrKeys) {
      try {
        const pdrData = localStorage.getItem(key);
        if (pdrData) {
          const parsed = JSON.parse(pdrData);
          // Avoid duplicates
          if (!pdrs.some(pdr => pdr.id === parsed.id)) {
            pdrs.push({
              ...parsed,
              createdAt: new Date(parsed.createdAt),
              updatedAt: new Date(parsed.updatedAt),
              ...(parsed.submittedAt && { submittedAt: new Date(parsed.submittedAt) }),
            });
          }
        }
      } catch (error) {
        console.error(`Error parsing PDR ${key}:`, error);
      }
    }

    // Sort by creation date (newest first)
    pdrs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setPdrHistory(pdrs);
  };

  useEffect(() => {
    loadPDRHistory();

    // Listen for PDR changes to update history
    const handlePDRChange = () => {
      loadPDRHistory();
    };

    window.addEventListener('demo-pdr-changed', handlePDRChange);

    return () => {
      window.removeEventListener('demo-pdr-changed', handlePDRChange);
    };
  }, []);

  return {
    data: pdrHistory,
    isLoading,
  };
}
