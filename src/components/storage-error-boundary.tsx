'use client';

import { Component, ReactNode } from 'react';
import { emergencyCleanup } from '@/lib/storage-cleanup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasStorageError: boolean;
  error: Error | null;
}

export class StorageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasStorageError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a storage quota error
    if (error.message && 
        (error.message.includes('quota') || 
         error.message.includes('QuotaExceeded') ||
         error.message.includes('kQuotaBytes'))) {
      return { hasStorageError: true, error };
    }
    
    // Re-throw non-storage errors
    throw error;
  }

  handleRetry = () => {
    console.log('🔄 User triggered storage cleanup retry');
    emergencyCleanup();
    this.setState({ hasStorageError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasStorageError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Storage Limit Reached
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your browser's storage is full. We'll clean up temporary data and try again.
              </p>
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  Clean Up & Retry
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This typically happens when lots of data has been cached. 
                Cleaning up won't affect your saved work.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
