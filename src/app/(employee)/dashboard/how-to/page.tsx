'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Fish,
  Building2, 
  Target, 
  TrendingUp, 
  Users, 
  PieChart,
  Trophy,
  BarChart3,
  Handshake
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingScreen {
  id: number;
  headline: string;
  bodyText: string | React.ReactNode;
  visualCue: {
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  };
  ctaText: string;
}

const onboardingScreens: OnboardingScreen[] = [
  {
    id: 1,
    headline: "Welcome to CodeFish Studio!",
    bodyText: "Welcome to the team! We're excited to have you. At CodeFish Studio, we believe in clear expectations and rewarding great work. This quick guide will walk you through how your performance contributes to our collective success and your growth here.",
    visualCue: {
      icon: Fish,
      description: "CodeFish Studio logo with welcoming team illustration"
    },
    ctaText: "Start Journey"
  },
  {
    id: 2,
    headline: "Our Four Strategic Pillars",
    bodyText: (
      <div className="space-y-3 max-w-4xl mx-auto">
        <p className="mb-3">Everything we do is built on four strategic pillars. They're not just buzzwords; they're how we ensure we're always building a stronger team, delivering exceptional products, and evolving how we work.</p>
        <div className="bg-muted/20 p-3 rounded-lg text-left space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>People & Culture:</strong> Building a supportive and thriving environment</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Value-Driven Innovation:</strong> Creating products that truly matter</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Operating Efficiency:</strong> Working smarter, not just harder</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Customer Experience:</strong> Delighting our clients every step of the way</div>
          </div>
        </div>
      </div>
    ),
    visualCue: {
      icon: Building2,
      description: "Four interconnected pillars or foundation blocks icon"
    },
    ctaText: "Next"
  },
  {
    id: 3,
    headline: "How We Measure Your Impact (The 50/30/20 Model)",
    bodyText: (
      <div className="space-y-3 max-w-4xl mx-auto">
        <p className="mb-3">Your annual performance is measured in three key areas. Think of it as a simple formula for success:</p>
        <div className="bg-muted/20 p-3 rounded-lg text-left space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>50% Role Expectations:</strong> What you deliver in your specific role—quality, meeting requirements, and timely delivery</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>30% Values & Behaviours:</strong> How you embody CodeFish Studio's core values—collaboration, communication, integrity, and accountability</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>20% Continuous Improvement & Innovation:</strong> Your proactive ideas, feedback, and contributions to positive change and growth</div>
          </div>
        </div>
      </div>
    ),
    visualCue: {
      icon: PieChart,
      description: "Pie chart or balanced scale showing the 50/30/20 split"
    },
    ctaText: "Got It!"
  },
  {
    id: 4,
    headline: "Your Growth & Rewards",
    bodyText: (
      <div className="space-y-3 max-w-4xl mx-auto">
        <p className="mb-3">Your annual performance review directly links to these weightings and determines your salary progression. We have three clear achievement levels:</p>
        <div className="bg-muted/20 p-3 rounded-lg text-left space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Level 1: Needs Improvement</strong> (Below 70%) → No salary increase + Support plan</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Level 2: Solid Performance</strong> (70–89%) → CPI salary increase</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Level 3: High Achiever</strong> (90% or more) → CPI + merit increase</div>
          </div>
        </div>
      </div>
    ),
    visualCue: {
      icon: Trophy,
      description: "Three-tier trophy or achievement badge system"
    },
    ctaText: "Understand"
  },
  {
    id: 5,
    headline: "Set Your Goals & Objectives (50% of Your Overall Score)",
    bodyText: (
      <div className="space-y-4">
        <p>Define 3–5 tangible goals that contribute to our strategy. Each goal should align with one strategic pillar and have a weighting in points. The total points for all your goals must sum to 100 points. This 100-point total represents the 50% "Role Expectations" portion of your overall performance.</p>
        <div className="bg-muted/30 p-2.5 rounded-lg text-left max-w-4xl mx-auto">
          <h4 className="font-medium mb-1.5 text-sm">For each goal, you'll specify:</h4>
          <ul className="space-y-0 text-xs">
            <li>• <strong>Goal title:</strong> Clear, specific objective</li>
            <li>• <strong>Strategic pillar:</strong> Which of our 4 pillars it supports</li>
            <li>• <strong>Why it matters:</strong> Business impact and importance</li>
            <li>• <strong>Weighting:</strong> Point value assigned to how much it contributes to your overall performance.</li>
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">Your manager will help you set these up in your actual scorecard after this overview.</p>
      </div>
    ),
    visualCue: {
      icon: Target,
      description: "Target/bullseye with progress indicator"
    },
    ctaText: "Understand"
  },
  {
    id: 6,
    headline: "Company Values & Behaviours Plan (30% + 20% of Your Overall Score)",
    bodyText: (
      <div className="space-y-4">
        <p>Describe how you'll contribute to our values, grow your skills, and help others. The commitments and plans on this page will be weighted in points and must sum to 100 points. This 100-point total represents the combined 30% "Values & Behaviours" and 20% "Continuous Improvement & Innovation" portions.</p>
        <div className="bg-muted/30 p-2.5 rounded-lg text-left max-w-4xl mx-auto">
          <h4 className="font-medium mb-1.5 text-sm">This section includes:</h4>
          <div className="space-y-1.5 text-xs">
            <div>
              <strong>Values Commitments:</strong>
              <ul className="ml-3 mt-0.5 space-y-0">
                <li>• How you'll embody CodeFish Studio values</li>
                <li>• Strategic pillar alignment</li>
                <li>• Measurable success criteria</li>
              </ul>
            </div>
            <div>
              <strong>Growth Grant Plan ($1000):</strong>
              <ul className="ml-3 mt-0.5 space-y-0">
                <li>• Optional professional development funding</li>
                <li>• Courses, conferences, certifications, tools</li>
                <li>• Expected learning outcomes</li>
              </ul>
            </div>
            <div>
              <strong>Knowledge Sharing:</strong>
              <ul className="ml-3 mt-0.5 space-y-0">
                <li>• Workshop facilitation or mentorship</li>
                <li>• Community contributions and collaboration</li>
                <li>• Sharing expertise with the team</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Your manager will guide you through setting up these commitments in your scorecard.</p>
      </div>
    ),
    visualCue: {
      icon: TrendingUp,
      description: "Growth tree or interconnected network of people"
    },
    ctaText: "Understand"
  },
  {
    id: 7,
    headline: "Your Scorecard & Tracking Progress",
    bodyText: "We use a simple scorecard to track your progress. It's where you'll see your goals, add weekly notes, and link evidence of your great work (like project deliverables, feedback, or new ideas). Your manager will guide you through setting it up and using it effectively.",
    visualCue: {
      icon: BarChart3,
      description: "Dashboard or scorecard interface mockup"
    },
    ctaText: "Acknowledge"
  },
  {
    id: 8,
    headline: "Next Steps & Support",
    bodyText: (
      <div className="space-y-3 max-w-4xl mx-auto">
        <p className="mb-3">You've completed this quick overview! Should you have any questions or concerns, we encourage you to speak with your manager. The next steps are:</p>
        
        <div className="bg-muted/20 p-3 rounded-lg text-left space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <p className="font-medium">Setting your draft KPI's in your PDR for the year</p>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <p className="font-medium">Your manager will review and discuss with you, your goals, required support and ensure alignment with company strategy</p>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <p className="font-medium">Your PDR will be locked in and reviewed mid year to see how things are going</p>
          </div>
        </div>
        
        <p className="mt-3">In May, your final end of year review is due. We look back and see how things went, and you will self assess against your goals.</p>
        
        <div className="bg-primary/5 border-l-4 border-primary p-3 rounded-r-lg mt-3">
          <p className="font-medium text-primary">Remember: This is about growth, not just measurement. We want to help you succeed at CodeFish Studio.</p>
        </div>
      </div>
    ),
    visualCue: {
      icon: Handshake,
      description: "Handshake or supportive team collaboration icon"
    },
    ctaText: "Complete Onboarding"
  }
];

export default function HowToPage() {
  const [currentScreen, setCurrentScreen] = useState(0);

  const nextScreen = () => {
    setCurrentScreen(prev => Math.min(prev + 1, onboardingScreens.length - 1));
  };

  const prevScreen = () => {
    setCurrentScreen(prev => Math.max(prev - 1, 0));
  };

  const goToScreen = (index: number) => {
    setCurrentScreen(index);
  };

  const currentData = onboardingScreens[currentScreen];

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center mb-1">CodeFish Studio Performance Onboarding</h1>
        <p className="text-sm text-muted-foreground text-center">
          Complete guide to understanding your performance framework
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-1.5">
          {onboardingScreens.map((_, index) => (
            <button
              key={index}
              onClick={() => goToScreen(index)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-200",
                index === currentScreen 
                  ? "bg-primary scale-125" 
                  : index < currentScreen 
                    ? "bg-primary/60" 
                    : "bg-muted"
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="mb-4">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <currentData.visualCue.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <Badge variant="outline" className="text-xs mb-1 block w-fit">
                Step {currentScreen + 1} of {onboardingScreens.length}
              </Badge>
              <CardTitle className="text-lg font-bold leading-tight">
                {currentData.headline}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center pt-0 pb-4">
          <div className="text-sm text-muted-foreground leading-relaxed max-w-4xl mx-auto">
            {currentData.bodyText}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          onClick={prevScreen}
          disabled={currentScreen === 0}
          className="flex items-center gap-1 h-8 px-2 text-xs"
          size="sm"
        >
          <ChevronLeft className="w-3 h-3" />
          Previous
        </Button>

        <span className="text-xs text-muted-foreground font-medium">
          {currentScreen + 1} / {onboardingScreens.length}
        </span>

        {currentScreen === onboardingScreens.length - 1 ? (
          <Button
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-1 h-8 px-2 text-xs"
            size="sm"
          >
            {currentData.ctaText}
            <Handshake className="w-3 h-3" />
          </Button>
        ) : (
          <Button
            onClick={nextScreen}
            className="flex items-center gap-1 h-8 px-2 text-xs"
            size="sm"
          >
            {currentData.ctaText}
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="pt-4 border-t">
        <h2 className="text-base font-semibold mb-2 text-center">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {onboardingScreens.map((screen, index) => (
            <Card 
              key={screen.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-sm hover:bg-accent/50",
                index === currentScreen ? "ring-1 ring-primary bg-primary/5" : ""
              )}
              onClick={() => goToScreen(index)}
            >
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <screen.visualCue.icon className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="font-medium text-xs leading-tight">{screen.headline}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {typeof screen.bodyText === 'string' ? screen.bodyText.slice(0, 50) + '...' : 'Detailed guidance'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
