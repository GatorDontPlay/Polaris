import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
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
          <div className="text-sm text-muted-foreground space-y-2">
            <p>This could happen if:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The link has expired</li>
              <li>The link has already been used</li>
              <li>The link is invalid or corrupted</li>
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
