/**
 * Storage Cleanup Utility
 * Manages browser localStorage to prevent quota exceeded errors
 */

interface StorageInfo {
  used: number;
  available: number;
  percentUsed: number;
}

/**
 * Get current storage usage information
 */
export function getStorageUsage(): StorageInfo | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    // Estimate storage usage
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }

    // Most browsers have ~5-10MB limit
    const estimatedLimit = 10 * 1024 * 1024; // 10MB
    const percentUsed = (totalSize / estimatedLimit) * 100;

    return {
      used: totalSize,
      available: estimatedLimit - totalSize,
      percentUsed,
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return null;
  }
}

/**
 * Clean up only temporary localStorage keys for a specific PDR
 * Only removes explicit temporary keys, NOT legitimate user data
 */
export function cleanupPDRStorage(pdrId: string): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  // Only clean up explicitly temporary keys
  const tempKeyPatterns = [
    `_temp_${pdrId}`,
  ];

  let removedCount = 0;
  
  // Collect all keys that match temporary patterns
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && tempKeyPatterns.some(pattern => key.includes(pattern))) {
      keysToRemove.push(key);
    }
  }

  // Remove collected keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    removedCount++;
    console.log(`🧹 Cleaned up temporary storage key: ${key}`);
  });

  return removedCount;
}

// cleanupAllDemoStorage() function removed - demo infrastructure no longer used

/**
 * Clean up stale draft data older than specified days
 * Default: 30 days to preserve legitimate user drafts
 */
export function cleanupStaleData(daysOld: number = 30): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffTimestamp = cutoffDate.getTime();

  let removedCount = 0;
  const keysToRemove: string[] = [];

  // Look for draft keys with timestamps
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('_draft_')) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const data = JSON.parse(value);
          if (data.lastSaved) {
            const savedDate = new Date(data.lastSaved).getTime();
            if (savedDate < cutoffTimestamp) {
              keysToRemove.push(key);
            }
          }
        }
      } catch (error) {
        // If we can't parse it, consider it stale
        keysToRemove.push(key);
      }
    }
  }

  // Remove stale keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    removedCount++;
    console.log(`🧹 Cleaned up stale data: ${key}`);
  });

  return removedCount;
}

/**
 * Comprehensive cleanup - removes stale temporary data only
 */
export function performComprehensiveCleanup(): {
  staleDataRemoved: number;
  storageInfo: StorageInfo | null;
} {
  console.log('🧹 Starting minimal storage cleanup...');

  const staleDataRemoved = cleanupStaleData(30);
  const storageInfo = getStorageUsage();

  console.log('🧹 Cleanup complete:', {
    staleDataRemoved,
    storageInfo,
  });

  return {
    staleDataRemoved,
    storageInfo,
  };
}

/**
 * Check if storage is close to quota and clean up if needed
 */
export function checkAndCleanupStorage(): boolean {
  const storageInfo = getStorageUsage();
  
  if (!storageInfo) {
    return false;
  }

  console.log('📊 Storage usage:', storageInfo);

  // If storage is over 70% full, perform cleanup
  if (storageInfo.percentUsed > 70) {
    console.warn('⚠️ Storage is over 70% full. Performing cleanup...');
    performComprehensiveCleanup();
    return true;
  }

  return false;
}

/**
 * Emergency cleanup - removes only very old stale data
 * Use this only when quota is exceeded
 */
export function emergencyCleanup(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  console.warn('⚠️ Emergency cleanup: Removing stale data (>7 days old)');

  // Only remove very old stale data
  const staleRemoved = cleanupStaleData(7);
  
  const finalInfo = getStorageUsage();
  console.log('⚠️ Emergency cleanup complete:', {
    staleDataRemoved: staleRemoved,
    storageUsage: finalInfo,
  });
}

/**
 * Initialize storage monitoring and automatic cleanup
 * Call this in app initialization (layout or provider)
 */
export function initStorageMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Check storage on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const storageInfo = getStorageUsage();
      if (storageInfo && storageInfo.percentUsed > 80) {
        console.warn('⚠️ Storage >80% full, performing cleanup...');
        performComprehensiveCleanup();
      }
    }
  });

  // Periodic cleanup check (every 5 minutes when page is active)
  let intervalId: NodeJS.Timeout | null = null;
  
  const startMonitoring = () => {
    if (intervalId) return;
    intervalId = setInterval(() => {
      const storageInfo = getStorageUsage();
      if (storageInfo && storageInfo.percentUsed > 75) {
        console.warn('⚠️ Periodic storage check: >75% full, cleaning...');
        cleanupStaleData(30); // Clean up month-old data only
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  };

  const stopMonitoring = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Start/stop based on page visibility
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  });

  // Start immediately if page is visible
  if (document.visibilityState === 'visible') {
    startMonitoring();
  }

  // Initial cleanup on app start
  checkAndCleanupStorage();
}

