import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { SupabaseAuthProvider } from '@/providers/supabase-auth-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PDR Advanced - Performance Development Review System',
  description: 'A comprehensive Performance Development Review system for Australian businesses, featuring goal management, behavioral assessments, and structured review processes.',
  publisher: 'PDR Advanced',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'PDR Advanced - Performance Development Review System',
    description: 'A comprehensive Performance Development Review system for Australian businesses.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'PDR Advanced',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDR Advanced - Performance Development Review System',
    description: 'A comprehensive Performance Development Review system for Australian businesses.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans h-full bg-background text-foreground antialiased`}>
        <ThemeProvider defaultTheme="dark">
          <QueryProvider>
            <SupabaseAuthProvider>
              <div id="root" className="min-h-screen bg-background flex flex-col">
                {children}
              </div>
              <Toaster />
            </SupabaseAuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}