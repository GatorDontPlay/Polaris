import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'PDR System',
    template: '%s | PDR System',
  },
  description: 'Performance & Development Review System for managing employee goals, behaviors, and performance assessments.',
  keywords: ['PDR', 'Performance Review', 'Development', 'Goals', 'Employee Management'],
  authors: [{ name: 'PDR System Team' }],
  creator: 'PDR System',
  publisher: 'PDR System',
  robots: {
    index: false,
    follow: false,
  },

  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'PDR System',
    description: 'Performance & Development Review System',
    siteName: 'PDR System',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDR System',
    description: 'Performance & Development Review System',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
