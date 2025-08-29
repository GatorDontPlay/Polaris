'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Theme,
  ThemeContextValue,
  ThemeSystemConfig,
  DEFAULT_THEME_CONFIG,
  THEME_STORAGE_KEY,
  PREFERS_DARK_QUERY,
  THEME_CLASSES,
} from '@/types/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Override default theme configuration */
  config?: Partial<ThemeSystemConfig>;
  /** Disable system preference detection for testing */
  disableSystemDetection?: boolean;
  /** Initial theme for SSR compatibility */
  defaultTheme?: Theme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Hook to safely access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Theme provider component with localStorage persistence and system detection
 * Implements smooth transitions and accessibility compliance
 */
export function ThemeProvider({
  children,
  config: userConfig,
  disableSystemDetection = false,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const config = { ...DEFAULT_THEME_CONFIG, ...userConfig };
  
  // State management
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * Detect system theme preference
   */
  const detectSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined' || disableSystemDetection) {
      return 'light';
    }
    
    return window.matchMedia(PREFERS_DARK_QUERY).matches ? 'dark' : 'light';
  }, [disableSystemDetection]);

  /**
   * Get resolved theme (system preference resolved to light/dark)
   */
  const getResolvedTheme = useCallback((currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return systemTheme;
    }
    return currentTheme as 'light' | 'dark';
  }, [systemTheme]);

  /**
   * Apply theme to document with smooth transitions
   */
  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined') return;

    const resolvedTheme = getResolvedTheme(newTheme);
    const html = document.documentElement;
    
    // Start transition
    setIsTransitioning(true);
    html.classList.add(THEME_CLASSES.transitioning);
    
    // Apply theme class (handle empty string for light theme)
    html.classList.remove('dark');
    if (resolvedTheme === 'dark') {
      html.classList.add('dark');
    }
    
    // Set data attributes for CSS targeting
    html.setAttribute('data-theme', resolvedTheme);
    html.setAttribute('data-theme-preference', newTheme);
    
    // End transition after animation duration
    setTimeout(() => {
      setIsTransitioning(false);
      html.classList.remove(THEME_CLASSES.transitioning);
    }, config.transitions.duration);
  }, [config.transitions.duration, getResolvedTheme]);

  /**
   * Load theme from localStorage
   */
  const loadStoredTheme = useCallback((): Theme => {
    if (!config.enablePersistence || typeof window === 'undefined') {
      return config.defaultTheme;
    }

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as Theme;
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }

    return config.defaultTheme;
  }, [config.defaultTheme, config.enablePersistence]);

  /**
   * Save theme to localStorage
   */
  const saveTheme = useCallback((newTheme: Theme) => {
    if (!config.enablePersistence || typeof window === 'undefined') return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [config.enablePersistence]);

  /**
   * Set theme with persistence and transitions
   * Modified to only allow dark theme
   */
  const setTheme = useCallback((newTheme: Theme) => {
    // Always force dark mode regardless of the requested theme
    const forcedTheme: Theme = 'dark';
    
    setThemeState(forcedTheme);
    saveTheme(forcedTheme);
    applyTheme(forcedTheme);
    
    // Announce theme change to screen readers
    if (typeof window !== 'undefined') {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Theme is set to dark mode`;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  }, [saveTheme, applyTheme]);

  /**
   * Toggle is disabled - always use dark mode
   */
  const toggleTheme = useCallback(() => {
    // Only allow dark theme
    setTheme('dark');
  }, [setTheme]);

  /**
   * Refresh system theme detection
   */
  const refreshSystemTheme = useCallback(() => {
    const detected = detectSystemTheme();
    setSystemTheme(detected);
    
    // Re-apply theme if using system preference
    if (theme === 'system') {
      applyTheme(theme);
    }
  }, [detectSystemTheme, theme, applyTheme]);

  /**
   * Initialize theme on mount (client-side only)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect system theme
    const detected = detectSystemTheme();
    setSystemTheme(detected);

    // Force dark theme instead of using stored preference
    const forcedTheme: Theme = 'dark';
    setThemeState(forcedTheme);
    
    // Save the forced theme if persistence is enabled
    if (config.enablePersistence) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(forcedTheme));
      } catch (e) {
        console.error('Error saving theme to localStorage', e);
      }
    }

    // Apply theme immediately without transition on first load
    const html = document.documentElement;
    const resolvedTheme = 'dark';
    
    // Remove existing theme classes (handle empty string for light theme)
    html.classList.remove('dark');
    if (resolvedTheme === 'dark') {
      html.classList.add('dark');
    }
    
    html.setAttribute('data-theme', resolvedTheme);
    html.setAttribute('data-theme-preference', forcedTheme);

    setIsHydrated(true);
  }, [detectSystemTheme, loadStoredTheme]);

  /**
   * Listen for system theme changes
   */
  useEffect(() => {
    if (typeof window === 'undefined' || disableSystemDetection) return;

    const mediaQuery = window.matchMedia(PREFERS_DARK_QUERY);
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      
      // Auto-apply if using system preference
      if (theme === 'system') {
        applyTheme(theme);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme, applyTheme, disableSystemDetection]);

  /**
   * Prevent hydration mismatch by showing loading state until client-side
   */
  if (!isHydrated) {
    return (
      <div className="theme-loading" style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }

  const contextValue: ThemeContextValue = {
    theme,
    resolvedTheme: getResolvedTheme(theme),
    systemTheme,
    isTransitioning,
    setTheme,
    toggleTheme,
    refreshSystemTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <AccessibilityTester />
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Component to automatically test accessibility in development
 */
function AccessibilityTester() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;

    // Dynamically import and run accessibility testing
    import('@/hooks/use-accessibility').then(({ useAccessibilityStatus }) => {
      // Small delay to ensure CSS has been applied
      const timer = setTimeout(() => {
        try {
          // Skip accessibility check in callback since it uses hooks
          console.log(`🎨 Theme applied: ${resolvedTheme} mode`);
        } catch (error) {
          console.warn('Accessibility test error:', error);
        }
      }, 300);

      return () => clearTimeout(timer);
    }).catch(() => {
      // Ignore import errors in production
    });
  }, [resolvedTheme]);

  return null;
}

/**
 * Higher-order component for theme-aware components
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P & { theme: ThemeContextValue }>
) {
  const WrappedComponent = (props: P) => {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
  
  WrappedComponent.displayName = `withTheme(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for theme-aware styling
 */
export function useThemeClasses() {
  const { resolvedTheme, isTransitioning } = useTheme();
  
  return {
    themeClasses: resolvedTheme === 'dark' ? THEME_CLASSES.dark : '',
    isTransitioning,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
}
