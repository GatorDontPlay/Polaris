'use client';

import { useRouter } from 'next/navigation';
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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">PDR Advanced</CardTitle>
          <CardDescription className="text-center">
            Select your role to access the Performance Development Review system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <Button
              onClick={() => selectRole('employee')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
            >
              <User className="h-8 w-8" />
              <div>
                <div className="font-semibold">Employee</div>
                <div className="text-xs text-muted-foreground">Access PDR workflow</div>
              </div>
            </Button>
            
            <Button
              onClick={() => selectRole('ceo')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
            >
              <UserCheck className="h-8 w-8" />
              <div>
                <div className="font-semibold">CEO</div>
                <div className="text-xs text-muted-foreground">Admin dashboard</div>
              </div>
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground space-y-1">
            <p>Demo system for testing PDR workflows</p>
            <p>• Employee: Create and manage your PDR</p>
            <p>• CEO: Review and approve PDRs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
