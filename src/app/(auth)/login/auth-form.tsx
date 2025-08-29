'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/providers/supabase-auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Mail, Lock, User, UserCog } from 'lucide-react'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['EMPLOYEE', 'CEO'], { required_error: 'Please select a role' }),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type LoginFormData = z.infer<typeof loginSchema>
type SignupFormData = z.infer<typeof signupSchema>
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { signIn, signUp, resetPassword } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'login')

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'EMPLOYEE',
    },
  })

  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const { error } = await signIn(data.email, data.password)
      
      if (error) {
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Login successful',
        description: 'Redirecting to dashboard...',
      })
      
      // The auth provider will handle the redirect based on user role
    } catch (error) {
      toast({
        title: 'Login error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      const { error } = await signUp(data.email, data.password, {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      })

      if (error) {
        toast({
          title: 'Signup failed',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Account created successfully',
        description: 'Please check your email to confirm your account.',
      })
      
      setActiveTab('login')
      signupForm.reset()
    } catch (error) {
      toast({
        title: 'Signup error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    try {
      const { error } = await resetPassword(data.email)

      if (error) {
        toast({
          title: 'Reset password failed',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Password reset email sent',
        description: 'Please check your email for password reset instructions.',
      })
      
      forgotPasswordForm.reset()
    } catch (error) {
      toast({
        title: 'Reset password error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="login">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
        <TabsTrigger value="forgot">Reset Password</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="space-y-4">
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                className="pl-10"
                autoComplete="email"
                {...loginForm.register('email')}
              />
            </div>
            {loginForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {loginForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                className="pl-10"
                autoComplete="current-password"
                {...loginForm.register('password')}
              />
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {loginForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="space-y-4">
        <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-first-name">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-first-name"
                  placeholder="First name"
                  className="pl-10"
                  autoComplete="given-name"
                  {...signupForm.register('first_name')}
                />
              </div>
              {signupForm.formState.errors.first_name && (
                <p className="text-sm text-destructive">
                  {signupForm.formState.errors.first_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-last-name">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-last-name"
                  placeholder="Last name"
                  className="pl-10"
                  autoComplete="family-name"
                  {...signupForm.register('last_name')}
                />
              </div>
              {signupForm.formState.errors.last_name && (
                <p className="text-sm text-destructive">
                  {signupForm.formState.errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-email"
                type="email"
                placeholder="Enter your email"
                className="pl-10"
                autoComplete="email"
                {...signupForm.register('email')}
              />
            </div>
            {signupForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {signupForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-password"
                type="password"
                placeholder="Create a password"
                className="pl-10"
                autoComplete="new-password"
                {...signupForm.register('password')}
              />
            </div>
            {signupForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {signupForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-role">Role</Label>
            <Select
              defaultValue="EMPLOYEE"
              onValueChange={(value) => signupForm.setValue('role', value as 'EMPLOYEE' | 'CEO')}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center">
                  <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select your role" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="CEO">CEO</SelectItem>
              </SelectContent>
            </Select>
            {signupForm.formState.errors.role && (
              <p className="text-sm text-destructive">
                {signupForm.formState.errors.role.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="forgot" className="space-y-4">
        <div className="text-center text-sm text-muted-foreground mb-4">
          Enter your email address and we'll send you a link to reset your password.
        </div>
        
        <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                className="pl-10"
                autoComplete="email"
                {...forgotPasswordForm.register('email')}
              />
            </div>
            {forgotPasswordForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {forgotPasswordForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setActiveTab('login')}
            className="text-sm"
          >
            Back to Sign In
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  )
}
