/**
 * Theme utilities for accessibility compliance and color manipulation
 */

/**
 * Convert HSL color string to RGB values
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Calculate relative luminance for accessibility compliance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Parse HSL color values from CSS custom property format
  const parseHsl = (color: string): [number, number, number] => {
    // Remove 'hsl(' and ')' and split by spaces or commas
    const cleaned = color.replace(/hsl\(|\)/g, '').replace(/,/g, ' ');
    const values = cleaned.split(/\s+/).filter(v => v.length > 0);
    
    if (values.length >= 3) {
      const h = parseFloat(values[0]);
      const s = parseFloat(values[1].replace('%', ''));
      const l = parseFloat(values[2].replace('%', ''));
      return [h, s, l];
    }
    
    // Fallback for space-separated values (our format)
    if (values.length >= 3) {
      return [parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])];
    }
    
    throw new Error(`Invalid color format: ${color}`);
  };

  try {
    const [h1, s1, l1] = parseHsl(color1);
    const [h2, s2, l2] = parseHsl(color2);
    
    const [r1, g1, b1] = hslToRgb(h1, s1, l1);
    const [r2, g2, b2] = hslToRgb(h2, s2, l2);
    
    const lum1 = getRelativeLuminance(r1, g1, b1);
    const lum2 = getRelativeLuminance(r2, g2, b2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  } catch (error) {
    console.warn('Error calculating contrast ratio:', error);
    return 1; // Return minimum contrast if calculation fails
  }
}

/**
 * Check if a color combination meets WCAG accessibility standards
 */
export interface AccessibilityCheck {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  level: 'fail' | 'aa' | 'aaa';
}

export function checkAccessibility(
  textColor: string, 
  backgroundColor: string,
  isLargeText: boolean = false
): AccessibilityCheck {
  const ratio = getContrastRatio(textColor, backgroundColor);
  const minRatio = isLargeText ? 3 : 4.5;
  const enhancedRatio = isLargeText ? 4.5 : 7;
  
  const wcagAA = ratio >= minRatio;
  const wcagAAA = ratio >= enhancedRatio;
  
  let level: 'fail' | 'aa' | 'aaa' = 'fail';
  if (wcagAAA) level = 'aaa';
  else if (wcagAA) level = 'aa';
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    wcagAA,
    wcagAAA,
    level,
  };
}

/**
 * Validate all theme color combinations for accessibility
 */
export interface ThemeAccessibilityReport {
  theme: 'light' | 'dark';
  passed: number;
  failed: number;
  total: number;
  details: Array<{
    name: string;
    textColor: string;
    backgroundColor: string;
    check: AccessibilityCheck;
    isLargeText?: boolean;
  }>;
}

export function validateThemeAccessibility(theme: 'light' | 'dark'): ThemeAccessibilityReport {
  // Get CSS custom properties for the current theme
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  // Helper to get CSS custom property value
  const getCSSProperty = (property: string): string => {
    const value = computedStyle.getPropertyValue(`--${property}`).trim();
    return `hsl(${value})`;
  };

  // Define color combinations to test
  const colorTests = [
    // Basic text combinations
    { name: 'Body Text', text: '--foreground', bg: '--background' },
    { name: 'Card Text', text: '--card-foreground', bg: '--card' },
    { name: 'Muted Text', text: '--muted-foreground', bg: '--background' },
    { name: 'Primary Button', text: '--primary-foreground', bg: '--primary' },
    { name: 'Secondary Button', text: '--secondary-foreground', bg: '--secondary' },
    { name: 'Destructive Button', text: '--destructive-foreground', bg: '--destructive' },
    
    // Status colors
    { name: 'Success Status', text: '--status-success-foreground', bg: '--status-success' },
    { name: 'Warning Status', text: '--status-warning-foreground', bg: '--status-warning' },
    { name: 'Error Status', text: '--status-error-foreground', bg: '--status-error' },
    { name: 'Info Status', text: '--status-info-foreground', bg: '--status-info' },
    
    // Priority colors
    { name: 'High Priority', text: '--priority-high-foreground', bg: '--priority-high' },
    { name: 'Medium Priority', text: '--priority-medium-foreground', bg: '--priority-medium' },
    { name: 'Low Priority', text: '--priority-low-foreground', bg: '--priority-low' },
    
    // PDR status colors
    { name: 'Draft PDR', text: '--pdr-draft-foreground', bg: '--pdr-draft' },
    { name: 'Submitted PDR', text: '--pdr-submitted-foreground', bg: '--pdr-submitted' },
    { name: 'Review PDR', text: '--pdr-review-foreground', bg: '--pdr-review' },
    { name: 'Mid-year PDR', text: '--pdr-midyear-foreground', bg: '--pdr-midyear' },
    { name: 'End-year PDR', text: '--pdr-endyear-foreground', bg: '--pdr-endyear' },
    { name: 'Completed PDR', text: '--pdr-completed-foreground', bg: '--pdr-completed' },
    { name: 'Locked PDR', text: '--pdr-locked-foreground', bg: '--pdr-locked' },
  ];

  const details = colorTests.map(test => {
    try {
      const textColor = getCSSProperty(test.text);
      const backgroundColor = getCSSProperty(test.bg);
      const check = checkAccessibility(textColor, backgroundColor, false);
      
      return {
        name: test.name,
        textColor,
        backgroundColor,
        check,
        isLargeText: false,
      };
    } catch (error) {
      console.warn(`Failed to test ${test.name}:`, error);
      return {
        name: test.name,
        textColor: 'unknown',
        backgroundColor: 'unknown',
        check: { ratio: 0, wcagAA: false, wcagAAA: false, level: 'fail' as const },
        isLargeText: false,
      };
    }
  });

  const passed = details.filter(d => d.check.wcagAA).length;
  const failed = details.length - passed;

  return {
    theme,
    passed,
    failed,
    total: details.length,
    details,
  };
}

/**
 * Log accessibility report to console
 */
export function logAccessibilityReport(report: ThemeAccessibilityReport): void {
  console.group(`🎨 Theme Accessibility Report - ${report.theme.toUpperCase()} Mode`);
  console.log(`✅ Passed: ${report.passed}/${report.total} (${Math.round(report.passed / report.total * 100)}%)`);
  console.log(`❌ Failed: ${report.failed}/${report.total}`);
  
  if (report.failed > 0) {
    console.group('❌ Failed Tests');
    report.details
      .filter(d => !d.check.wcagAA)
      .forEach(d => {
        console.log(`${d.name}: ${d.check.ratio}:1 (needs 4.5:1 minimum)`);
      });
    console.groupEnd();
  }
  
  console.group('📊 All Results');
  console.table(report.details.map(d => ({
    'Test': d.name,
    'Ratio': `${d.check.ratio}:1`,
    'WCAG AA': d.check.wcagAA ? '✅' : '❌',
    'WCAG AAA': d.check.wcagAAA ? '✅' : '❌',
    'Level': d.check.level.toUpperCase(),
  })));
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Test both light and dark themes and log results
 */
export function validateAllThemes(): void {
  const html = document.documentElement;
  const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
  
  // Test light theme
  html.classList.remove('dark');
  const lightReport = validateThemeAccessibility('light');
  logAccessibilityReport(lightReport);
  
  // Test dark theme
  html.classList.add('dark');
  const darkReport = validateThemeAccessibility('dark');
  logAccessibilityReport(darkReport);
  
  // Restore original theme
  if (currentTheme === 'light') {
    html.classList.remove('dark');
  }
  
  // Summary
  console.group('🎯 Accessibility Summary');
  console.log(`Light theme: ${lightReport.passed}/${lightReport.total} passed`);
  console.log(`Dark theme: ${darkReport.passed}/${darkReport.total} passed`);
  console.log(`Overall: ${lightReport.passed + darkReport.passed}/${lightReport.total + darkReport.total} passed`);
  console.groupEnd();
}

/**
 * Hook for development mode accessibility testing
 */
export function useAccessibilityTesting(): {
  testCurrentTheme: () => ThemeAccessibilityReport;
  testAllThemes: () => void;
} {
  const testCurrentTheme = (): ThemeAccessibilityReport => {
    const html = document.documentElement;
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    return validateThemeAccessibility(currentTheme);
  };

  const testAllThemes = (): void => {
    validateAllThemes();
  };

  return {
    testCurrentTheme,
    testAllThemes,
  };
}
