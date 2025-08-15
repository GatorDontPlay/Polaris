/**
 * Theme system type definitions
 * Provides comprehensive type safety for the theme system with accessibility compliance
 */

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  /** Current active theme */
  theme: Theme;
  /** Resolved theme (system preference resolved to light/dark) */
  resolvedTheme: 'light' | 'dark';
  /** Whether the system is currently using dark mode */
  systemTheme: 'light' | 'dark';
  /** Whether theme is currently transitioning */
  isTransitioning: boolean;
}

export interface ThemeContextValue extends ThemeConfig {
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark mode */
  toggleTheme: () => void;
  /** Force refresh system theme detection */
  refreshSystemTheme: () => void;
}

/**
 * Semantic color tokens for improved maintainability
 * These map to CSS custom properties and provide type safety
 */
export interface SemanticColors {
  // Status colors for PDR system
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
    draft: string;
    submitted: string;
    review: string;
    midyear: string;
    endyear: string;
    completed: string;
    locked: string;
  };
  
  // Priority levels
  priority: {
    high: string;
    medium: string;
    low: string;
  };
  
  // Activity types
  activity: {
    submission: string;
    review: string;
    deadline: string;
    goal: string;
    behavior: string;
    general: string;
  };
  
  // Rating colors
  rating: {
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
}

/**
 * Color contrast ratios for accessibility compliance
 */
export interface ContrastConfig {
  text: {
    normal: number; // 4.5:1 minimum
    large: number;  // 3:1 minimum
    enhanced: number; // 7:1 preferred
  };
  interactive: {
    normal: number; // 3:1 minimum
    focus: number;  // 3:1 minimum
  };
}

/**
 * Theme transition configuration
 */
export interface TransitionConfig {
  duration: number; // in milliseconds
  easing: string;
  properties: string[];
}

/**
 * Complete theme configuration
 */
export interface ThemeSystemConfig {
  /** Default theme on first visit */
  defaultTheme: Theme;
  /** Enable system preference detection */
  enableSystemDetection: boolean;
  /** Enable localStorage persistence */
  enablePersistence: boolean;
  /** Transition configuration */
  transitions: TransitionConfig;
  /** Accessibility settings */
  accessibility: ContrastConfig;
  /** Semantic color mappings */
  colors: SemanticColors;
}

/**
 * Theme storage key for localStorage
 */
export const THEME_STORAGE_KEY = 'pdr-theme-preference' as const;

/**
 * CSS class names for theme application
 */
export const THEME_CLASSES = {
  dark: 'dark',
  transitioning: 'theme-transitioning',
} as const;

/**
 * Media query for system preference detection
 */
export const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)' as const;

/**
 * Default theme system configuration
 */
export const DEFAULT_THEME_CONFIG: ThemeSystemConfig = {
  defaultTheme: 'system',
  enableSystemDetection: true,
  enablePersistence: true,
  transitions: {
    duration: 250,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    properties: ['background-color', 'border-color', 'color', 'box-shadow'],
  },
  accessibility: {
    text: {
      normal: 4.5,
      large: 3,
      enhanced: 7,
    },
    interactive: {
      normal: 3,
      focus: 3,
    },
  },
  colors: {
    status: {
      success: 'hsl(var(--status-success))',
      warning: 'hsl(var(--status-warning))',
      error: 'hsl(var(--status-error))',
      info: 'hsl(var(--status-info))',
      draft: 'hsl(var(--pdr-draft))',
      submitted: 'hsl(var(--pdr-submitted))',
      review: 'hsl(var(--pdr-review))',
      midyear: 'hsl(var(--pdr-midyear))',
      endyear: 'hsl(var(--pdr-endyear))',
      completed: 'hsl(var(--pdr-completed))',
      locked: 'hsl(var(--pdr-locked))',
    },
    priority: {
      high: 'hsl(var(--priority-high))',
      medium: 'hsl(var(--priority-medium))',
      low: 'hsl(var(--priority-low))',
    },
    activity: {
      submission: 'hsl(var(--activity-submission))',
      review: 'hsl(var(--activity-review))',
      deadline: 'hsl(var(--activity-deadline))',
      goal: 'hsl(var(--activity-goal))',
      behavior: 'hsl(var(--activity-behavior))',
      general: 'hsl(var(--activity-general))',
    },
    rating: {
      1: 'hsl(var(--rating-1))',
      2: 'hsl(var(--rating-2))',
      3: 'hsl(var(--rating-3))',
      4: 'hsl(var(--rating-4))',
      5: 'hsl(var(--rating-5))',
    },
  },
};
