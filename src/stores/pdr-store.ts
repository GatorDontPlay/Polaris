import { create } from 'zustand';
import { PDR, Goal, Behavior } from '@/types';

interface PDRState {
  currentPDR: PDR | null;
  goals: Goal[];
  behaviors: Behavior[];
  isSubmitting: boolean;
  
  // Actions
  setCurrentPDR: (pdr: PDR | null) => void;
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  removeGoal: (goalId: string) => void;
  setBehaviors: (behaviors: Behavior[]) => void;
  addBehavior: (behavior: Behavior) => void;
  updateBehavior: (behaviorId: string, updates: Partial<Behavior>) => void;
  removeBehavior: (behaviorId: string) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentPDR: null,
  goals: [],
  behaviors: [],
  isSubmitting: false,
};

export const usePDRStore = create<PDRState>((set, get) => ({
  ...initialState,

  setCurrentPDR: (currentPDR) => set({ currentPDR }),

  setGoals: (goals) => set({ goals }),

  addGoal: (goal) => 
    set((state) => ({ 
      goals: [...state.goals, goal] 
    })),

  updateGoal: (goalId, updates) =>
    set((state) => ({
      goals: state.goals.map(goal =>
        goal.id === goalId ? { ...goal, ...updates } : goal
      ),
    })),

  removeGoal: (goalId) =>
    set((state) => ({
      goals: state.goals.filter(goal => goal.id !== goalId),
    })),

  setBehaviors: (behaviors) => set({ behaviors }),

  addBehavior: (behavior) =>
    set((state) => ({
      behaviors: [...state.behaviors, behavior],
    })),

  updateBehavior: (behaviorId, updates) =>
    set((state) => ({
      behaviors: state.behaviors.map(behavior =>
        behavior.id === behaviorId ? { ...behavior, ...updates } : behavior
      ),
    })),

  removeBehavior: (behaviorId) =>
    set((state) => ({
      behaviors: state.behaviors.filter(behavior => behavior.id !== behaviorId),
    })),

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  reset: () => set(initialState),
}));
