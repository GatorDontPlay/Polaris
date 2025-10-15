'use client';

import { useEffect } from 'react';
import { cleanupStaleData } from '@/lib/storage-cleanup';

/**
 * Storage Cleanup Initializer
 * Runs minimal cleanup on app initialization - only removes very stale data (>30 days)
 */
export function StorageCleanupInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Run minimal cleanup on app initialization (only very old data)
    console.log('🧹 Initializing minimal storage cleanup...');
    
    // Only clean up very stale data (older than 30 days)
    const staleRemoved = cleanupStaleData(30);
    if (staleRemoved > 0) {
      console.log(`🧹 Removed ${staleRemoved} stale storage items (>30 days old)`);
    }
  }, []);

  // This component doesn't render anything
  return null;
}


