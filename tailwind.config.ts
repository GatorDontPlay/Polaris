import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			status: {
  				success: 'hsl(var(--status-success))',
  				'success-foreground': 'hsl(var(--status-success-foreground))',
  				warning: 'hsl(var(--status-warning))',
  				'warning-foreground': 'hsl(var(--status-warning-foreground))',
  				error: 'hsl(var(--status-error))',
  				'error-foreground': 'hsl(var(--status-error-foreground))',
  				info: 'hsl(var(--status-info))',
  				'info-foreground': 'hsl(var(--status-info-foreground))'
  			},
  			priority: {
  				high: 'hsl(var(--priority-high))',
  				'high-foreground': 'hsl(var(--priority-high-foreground))',
  				'high-background': 'hsl(var(--priority-high-background))',
  				medium: 'hsl(var(--priority-medium))',
  				'medium-foreground': 'hsl(var(--priority-medium-foreground))',
  				'medium-background': 'hsl(var(--priority-medium-background))',
  				low: 'hsl(var(--priority-low))',
  				'low-foreground': 'hsl(var(--priority-low-foreground))',
  				'low-background': 'hsl(var(--priority-low-background))'
  			},
  			activity: {
  				submission: 'hsl(var(--activity-submission))',
  				'submission-background': 'hsl(var(--activity-submission-background))',
  				review: 'hsl(var(--activity-review))',
  				'review-background': 'hsl(var(--activity-review-background))',
  				deadline: 'hsl(var(--activity-deadline))',
  				'deadline-background': 'hsl(var(--activity-deadline-background))',
  				goal: 'hsl(var(--activity-goal))',
  				'goal-background': 'hsl(var(--activity-goal-background))',
  				behavior: 'hsl(var(--activity-behavior))',
  				'behavior-background': 'hsl(var(--activity-behavior-background))',
  				general: 'hsl(var(--activity-general))',
  				'general-background': 'hsl(var(--activity-general-background))'
  			},
  			pdr: {
  				draft: 'hsl(var(--pdr-draft))',
  				'draft-foreground': 'hsl(var(--pdr-draft-foreground))',
  				submitted: 'hsl(var(--pdr-submitted))',
  				'submitted-foreground': 'hsl(var(--pdr-submitted-foreground))',
  				review: 'hsl(var(--pdr-review))',
  				'review-foreground': 'hsl(var(--pdr-review-foreground))',
  				midyear: 'hsl(var(--pdr-midyear))',
  				'midyear-foreground': 'hsl(var(--pdr-midyear-foreground))',
  				endyear: 'hsl(var(--pdr-endyear))',
  				'endyear-foreground': 'hsl(var(--pdr-endyear-foreground))',
  				completed: 'hsl(var(--pdr-completed))',
  				'completed-foreground': 'hsl(var(--pdr-completed-foreground))',
  				locked: 'hsl(var(--pdr-locked))',
  				'locked-foreground': 'hsl(var(--pdr-locked-foreground))'
  			},
  			rating: {
  				'1': 'hsl(var(--rating-1))',
  				'2': 'hsl(var(--rating-2))',
  				'3': 'hsl(var(--rating-3))',
  				'4': 'hsl(var(--rating-4))',
  				'5': 'hsl(var(--rating-5))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'step-progress': {
  				'0%': {
  					width: '0%'
  				},
  				'100%': {
  					width: '100%'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'step-progress': 'step-progress 0.5s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'system-ui',
  				'sans-serif'
  			]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
