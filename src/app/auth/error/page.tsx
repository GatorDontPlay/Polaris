'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            There was an error confirming your account or resetting your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium text-destructive">Error: {error}</p>
              {errorDescription && (
                <p className="text-sm text-destructive/80 mt-1">{errorDescription}</p>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p>This could happen if:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The link has expired (links expire after 1 hour)</li>
              <li>The link has already been used</li>
              <li>The link is invalid or corrupted</li>
              <li>The Site URL in Supabase doesn't match your app URL</li>
            </ul>
          </div>

          <div className="p-3 bg-muted/50 border rounded-md">
            <p className="text-sm font-medium mb-2">Troubleshooting:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Try requesting a new confirmation email</li>
              <li>• Check that the link URL starts with: http://localhost:3000</li>
              <li>• Make sure you're using the latest email</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">Return to Login</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login?tab=signup">Sign Up Again</Link>
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact{' '}
              <a href="mailto:support@company.com" className="text-primary hover:underline">
                support@company.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
