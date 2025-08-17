'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Crown,
  Building2, 
  Target, 
  TrendingUp, 
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
    headline: "Welcome to CodeFish Studio Leadership!",
    bodyText: "As a leader at CodeFish Studio, you have access to powerful tools for overseeing team performance, reviewing PDRs, and driving strategic success. This guide will help you understand your role in our performance development system.",
    visualCue: {
      icon: Crown,
      description: "CodeFish Studio leadership badge with executive authority"
    },
    ctaText: "Get Started"
  },
  {
    id: 2,
    headline: "Understanding Our Four Strategic Pillars",
    bodyText: (
      <div className="space-y-3 max-w-4xl mx-auto">
        <p className="mb-3">As a leader, you'll see these strategic pillars reflected throughout your team's goals and performance plans:</p>
        <div className="bg-muted/20 p-3 rounded-lg text-left space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>People & Culture:</strong> Supporting team growth and maintaining our collaborative environment</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Value-Driven Innovation:</strong> Ensuring our products create meaningful impact</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Operating Efficiency:</strong> Optimizing processes and resource utilization</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <div><strong>Customer Experience:</strong> Maintaining our commitment to client success</div>
          </div>
        </div>
      </div>
    ),
    visualCue: {
      icon: Building2,
      description: "Four strategic pillars forming organizational foundation"
    },
    ctaText: "Next"
  },
  {
    id: 3,
    headline: "The 50/30/20 Performance Framework",
    bodyText: (
      <div className="space-y-4">
        <p>Every team member's performance is evaluated using our balanced framework. As a leader, you'll review and approve based on:</p>
        <ul className="space-y-2 text-left max-w-2xl mx-auto">
          <li><strong>• 50% Role Expectations:</strong> Core job performance and deliverable quality</li>
          <li><strong>• 30% Values & Behaviours:</strong> How they embody CodeFish Studio values</li>
          <li><strong>• 20% Continuous Improvement:</strong> Innovation and growth contributions</li>
        </ul>
        <p className="font-medium">Your role: Ensure fair assessment and provide strategic guidance on goal alignment.</p>
      </div>
    ),
    visualCue: {
      icon: PieChart,
      description: "Performance framework visualization with leadership oversight"
    },
    ctaText: "Understand"
  },
  {
    id: 4,
    headline: "Review & Reward Levels",
    bodyText: (
      <div className="space-y-4">
        <p>You'll make final decisions on performance ratings that directly impact salary progression:</p>
        <ul className="space-y-2 text-left max-w-2xl mx-auto">
          <li><strong>• Level 1: Needs Improvement</strong> (Below 70%) → No increase + development support</li>
          <li><strong>• Level 2: Solid Performance</strong> (70–89%) → CPI salary increase</li>
          <li><strong>• Level 3: High Achiever</strong> (90% or more) → CPI + merit increase</li>
        </ul>
        <p className="font-medium">Your approval is required for all Level 3 ratings and merit increases.</p>
      </div>
    ),
    visualCue: {
      icon: Trophy,
      description: "Three-tier achievement system with leadership approval workflow"
    },
    ctaText: "Got It"
  },
  {
    id: 5,
    headline: "Reviewing Goals & Objectives",
    bodyText: "Your team members set goals worth 100 points total, aligned with our strategic pillars. You'll review these for strategic alignment, challenge level, and measurability. Ensure goals stretch your team while remaining achievable.",
    visualCue: {
      icon: Target,
      description: "Strategic goal review dashboard with alignment indicators"
    },
    ctaText: "Review Process"
  },
  {
    id: 6,
    headline: "Overseeing Values & Growth Plans",
    bodyText: "Team members create development plans including values commitments, growth grant usage ($1000 each), and knowledge sharing activities. Your role is to approve growth investments and ensure alignment with team and company objectives.",
    visualCue: {
      icon: TrendingUp,
      description: "Team development oversight with growth investment tracking"
    },
    ctaText: "Understand"
  },
  {
    id: 7,
    headline: "Your Leadership Dashboard",
    bodyText: "Access real-time performance tracking, PDR completion status, team analytics, and approval workflows. Use these insights to make informed decisions about promotions, development opportunities, and resource allocation.",
    visualCue: {
      icon: BarChart3,
      description: "Executive dashboard with team performance metrics"
    },
    ctaText: "Explore Dashboard"
  },
  {
    id: 8,
    headline: "Leading Your Team to Success",
    bodyText: (
      <div className="space-y-4">
        <p>You're now ready to effectively lead performance development at CodeFish Studio. Key actions:</p>
        <ul className="space-y-2 text-left max-w-2xl mx-auto">
          <li>• Review and approve team member goals and development plans</li>
          <li>• Monitor progress through regular check-ins and scorecard updates</li>
          <li>• Make strategic decisions on performance ratings and growth investments</li>
          <li>• Foster a culture of continuous improvement and achievement</li>
        </ul>
        <p className="font-medium">Remember: Your leadership drives both individual growth and organizational success.</p>
      </div>
    ),
    visualCue: {
      icon: Handshake,
      description: "Leadership collaboration and team success indicators"
    },
    ctaText: "Start Leading"
  }
];

export default function AdminHowToPage() {
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
        <h1 className="text-2xl font-bold text-center mb-1">CodeFish Studio Leadership Guide</h1>
        <p className="text-sm text-muted-foreground text-center">
          Master your role in our performance development system and drive team excellence
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
            onClick={() => window.location.href = '/admin'}
            className="flex items-center gap-1 h-8 px-2 text-xs"
            size="sm"
          >
            {currentData.ctaText}
            <Crown className="w-3 h-3" />
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
        <h2 className="text-base font-semibold mb-2 text-center">Leadership Quick Reference</h2>
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
                  {typeof screen.bodyText === 'string' ? screen.bodyText.slice(0, 50) + '...' : 'Leadership guidance'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
