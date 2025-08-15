'use client';

import { useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { validateAllThemes, logAccessibilityReport, validateThemeAccessibility } from '@/lib/theme-utils';

/**
 * Development hook for accessibility testing
 * Only runs in development mode and provides console commands
 */
export function useAccessibility() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') return;

    // Add global accessibility testing functions to window for easy console access
    if (typeof window !== 'undefined') {
      (window as any).testAccessibility = {
        /**
         * Test current theme accessibility
         */
        current: () => {
          const report = validateThemeAccessibility(resolvedTheme);
          logAccessibilityReport(report);
          return report;
        },
        
        /**
         * Test all themes accessibility
         */
        all: () => {
          validateAllThemes();
        },
        
        /**
         * Quick accessibility check
         */
        quick: () => {
          console.log('🎨 Running quick accessibility check...');
          const report = validateThemeAccessibility(resolvedTheme);
          const passRate = Math.round((report.passed / report.total) * 100);
          
          console.log(`Theme: ${report.theme}`);
          console.log(`Pass rate: ${passRate}% (${report.passed}/${report.total})`);
          
          if (report.failed > 0) {
            console.warn(`⚠️  ${report.failed} accessibility issues found. Run testAccessibility.current() for details.`);
          } else {
            console.log('✅ All accessibility tests passed!');
          }
          
          return { passRate, passed: report.passed, total: report.total };
        },
      };

      // Log helpful message
      console.log('🎨 Accessibility testing available in development mode:');
      console.log('  testAccessibility.current() - Test current theme');
      console.log('  testAccessibility.all() - Test all themes');
      console.log('  testAccessibility.quick() - Quick check');
    }
  }, [resolvedTheme]);

  // Automatically run quick check when theme changes in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    // Small delay to ensure CSS has been applied
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).testAccessibility) {
        (window as any).testAccessibility.quick();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [resolvedTheme]);
}

/**
 * Hook for runtime accessibility validation
 * Returns accessibility status for UI indicators
 */
export function useAccessibilityStatus() {
  const { resolvedTheme } = useTheme();

  const getStatus = () => {
    if (typeof window === 'undefined') {
      return { isValid: true, passRate: 100, issues: 0 };
    }

    try {
      const report = validateThemeAccessibility(resolvedTheme);
      const passRate = Math.round((report.passed / report.total) * 100);
      
      return {
        isValid: report.failed === 0,
        passRate,
        issues: report.failed,
        total: report.total,
        report,
      };
    } catch (error) {
      console.warn('Accessibility validation error:', error);
      return { isValid: true, passRate: 100, issues: 0 };
    }
  };

  return getStatus();
}
