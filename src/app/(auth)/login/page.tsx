'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { loginSchema } from '@/lib/validations';
import type { LoginFormData } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Login successful',
          description: 'Redirecting to dashboard...',
        });
        
        // Invalidate auth queries to refetch user data
        await queryClient.invalidateQueries({ queryKey: ['auth'] });
        
        // Small delay to allow auth state to update
        setTimeout(() => {
          // Redirect based on user role
          if (result.data.user.role === 'CEO') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        }, 100);
      } else {
        toast({
          title: 'Login failed',
          description: result.error || 'Invalid credentials',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Login error',
        description: 'Unable to connect to server. For testing, try the demo login.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: 'employee' | 'ceo') => {
    toast({
      title: 'Demo Mode',
      description: `Simulating ${role} login for testing...`,
    });
    
    // For testing without database, simulate login success
    localStorage.setItem('demo_user', JSON.stringify({
      id: `demo-${role}-1`,
      email: `${role}@demo.com`,
      firstName: role === 'ceo' ? 'CEO' : 'Employee',
      lastName: 'Demo',
      role: role.toUpperCase(),
    }));

    setTimeout(() => {
      if (role === 'ceo') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Image
              src="/company-logo.svg"
              alt="Company Logo"
              width={180}
              height={54}
              className="h-12 w-auto"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">PDR Advanced</CardTitle>
          <CardDescription className="text-center">
            Sign in to your Performance Development Review account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Testing Without Database
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDemoLogin('employee')}
              className="w-full"
            >
              Demo Employee
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDemoLogin('ceo')}
              className="w-full"
            >
              Demo CEO
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground space-y-1">
            <p>For testing the PDR workflow without database connection:</p>
            <p>• Click "Demo Employee" to test employee PDR workflow</p>
            <p>• Click "Demo CEO" to test admin dashboard</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}