'use client';

import React from 'react';
import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/lib/utils';
import { Theme } from '@/types/theme';

interface ThemeToggleProps {
  /** Show as icon button or dropdown */
  variant?: 'icon' | 'dropdown';
  /** Button size */
  size?: 'sm' | 'default' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show labels in dropdown */
  showLabels?: boolean;
  /** Align dropdown content */
  align?: 'start' | 'center' | 'end';
}

const themeConfig = {
  light: {
    icon: Sun,
    label: 'Light mode',
    description: 'Use light theme',
  },
  dark: {
    icon: Moon,
    label: 'Dark mode', 
    description: 'Use dark theme',
  },
  system: {
    icon: Monitor,
    label: 'System',
    description: 'Follow system preference',
  },
} as const;

/**
 * Theme toggle component with smooth icon transitions and accessibility
 */
export function ThemeToggle({
  variant = 'icon',
  size = 'default',
  className,
  showLabels = true,
  align = 'end',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, isTransitioning } = useTheme();

  // Simple toggle for icon variant
  if (variant === 'icon') {
    const currentConfig = themeConfig[theme === 'system' ? resolvedTheme : theme];
    const Icon = currentConfig.icon;

    return (
      <Button
        variant="ghost"
        size={size}
        onClick={toggleTheme}
        className={cn(
          'relative overflow-hidden transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isTransitioning && 'animate-pulse',
          className
        )}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
        aria-pressed={resolvedTheme === 'dark'}
      >
        <Icon 
          className={cn(
            'h-4 w-4 transition-all duration-300',
            theme === 'light' && 'rotate-0 scale-100',
            theme === 'dark' && 'rotate-90 scale-100',
            theme === 'system' && 'scale-110'
          )} 
        />
        <span className="sr-only">
          Current theme: {currentConfig.label}
        </span>
      </Button>
    );
  }

  // Dropdown variant with all options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={cn(
            'relative overflow-hidden transition-all duration-200',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isTransitioning && 'animate-pulse',
            className
          )}
          aria-label="Theme options"
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">
            Theme options - Current: {themeConfig[theme].label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align={align} className="w-48">
        {showLabels && (
          <>
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        
        {(Object.entries(themeConfig) as Array<[Theme, typeof themeConfig[Theme]]>).map(
          ([themeValue, config]) => {
            const Icon = config.icon;
            const isActive = theme === themeValue;
            
            return (
              <DropdownMenuItem
                key={themeValue}
                onClick={() => setTheme(themeValue)}
                className={cn(
                  'cursor-pointer transition-colors duration-150',
                  'focus:bg-accent focus:text-accent-foreground',
                  isActive && 'bg-accent/50'
                )}
                aria-current={isActive ? 'true' : 'false'}
              >
                <Icon 
                  className={cn(
                    'mr-2 h-4 w-4 transition-all duration-200',
                    isActive && 'text-primary',
                    themeValue === 'light' && isActive && 'rotate-0',
                    themeValue === 'dark' && isActive && 'rotate-90',
                    themeValue === 'system' && isActive && 'scale-110'
                  )} 
                />
                <div className="flex flex-col">
                  <span className={cn('font-medium', isActive && 'text-primary')}>
                    {config.label}
                  </span>
                  {showLabels && (
                    <span className="text-xs text-muted-foreground">
                      {config.description}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            );
          }
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Compact theme toggle for mobile or minimal UI
 */
export function CompactThemeToggle({ className, ...props }: Omit<ThemeToggleProps, 'variant'>) {
  return (
    <ThemeToggle
      variant="icon"
      size="sm"
      className={cn('h-8 w-8', className)}
      {...props}
    />
  );
}

/**
 * Theme status indicator (read-only)
 */
export function ThemeIndicator({ className }: { className?: string }) {
  const { theme, resolvedTheme } = useTheme();
  const config = themeConfig[theme];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center space-x-2 text-sm text-muted-foreground', className)}>
      <Icon className="h-3 w-3" />
      <span>
        {config.label}
        {theme === 'system' && (
          <span className="text-xs"> ({resolvedTheme})</span>
        )}
      </span>
    </div>
  );
}
