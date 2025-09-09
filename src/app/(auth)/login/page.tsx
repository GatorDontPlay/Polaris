'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AuthForm from './auth-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
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
          <CardTitle className="tracking-tight text-2xl font-bold text-center">
            Performance & Development Review
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your Performance Development Review account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
            <AuthForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}