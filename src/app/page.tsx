'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserCheck } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const selectRole = (role: 'employee' | 'ceo') => {
    // Set role in localStorage for the session
    localStorage.setItem('app_role', role);
    localStorage.setItem('demo_user', JSON.stringify({
      id: `demo-${role}-1`,
      email: `${role}@demo.com`,
      firstName: role === 'ceo' ? 'CEO' : 'Employee',
      lastName: 'Demo',
      role: role.toUpperCase(),
    }));

    // Navigate directly to the appropriate dashboard
    if (role === 'ceo') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border/50 shadow-2xl">
        <CardHeader className="space-y-6 pb-8">
          <div className="flex justify-center">
            <Image
              src="/company-logo.svg"
              alt="Company Logo"
              width={240}
              height={72}
              className="h-16 w-auto"
              priority
            />
          </div>
          <div className="space-y-3">
            <CardTitle className="tracking-tight text-3xl font-bold text-center leading-tight">
              Performance & Development Review
            </CardTitle>
            <CardDescription className="text-center text-base text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
              Choose your role to access the Performance Development Review system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-0">
          <div className="grid grid-cols-1 gap-4">
            <Button
              onClick={() => selectRole('employee')}
              className="h-24 flex items-center justify-start p-6 space-x-4 hover:scale-[1.02] transition-all duration-200 hover:shadow-lg group"
              variant="outline"
            >
              <div className="flex-shrink-0 p-3 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <User className="h-6 w-6 text-white" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))' }} />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-lg text-foreground">Employee</div>
                <div className="text-sm text-muted-foreground/80 mt-1">Create and manage your performance review</div>
              </div>
            </Button>
            
            <Button
              onClick={() => selectRole('ceo')}
              className="h-24 flex items-center justify-start p-6 space-x-4 hover:scale-[1.02] transition-all duration-200 hover:shadow-lg group"
              variant="outline"
            >
              <div className="flex-shrink-0 p-3 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <UserCheck className="h-6 w-6 text-red-400" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))' }} />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-lg text-foreground">CEO</div>
                <div className="text-sm text-muted-foreground/80 mt-1">Review and manage team performance</div>
              </div>
            </Button>
          </div>

          <div className="border-t border-border/50 pt-6">
            <div className="text-center text-sm text-muted-foreground/70 space-y-2">
              <p className="font-medium">Demo Environment</p>
              <div className="text-xs space-y-1">
                <p>• Employee: Complete PDR workflow and self-assessments</p>
                <p>• CEO: Review submissions and provide feedback</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
