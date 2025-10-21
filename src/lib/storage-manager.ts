/**
 * Storage Manager - Handles localStorage with quota management
 * 
 * Prevents "QuotaExceededError" by managing storage efficiently
 */

const STORAGE_KEYS_PREFIX = {
  CEO_GOAL_FEEDBACK: 'ceo_goal_feedback_',
  CEO_BEHAVIOR_FEEDBACK: 'ceo_behavior_feedback_',
  CEO_ADDITIONAL_FEEDBACK: 'ceo_additional_feedback_',
  MID_YEAR_GOAL_COMMENTS: 'mid_year_goal_comments_',
  MID_YEAR_BEHAVIOR_COMMENTS: 'mid_year_behavior_comments_',
  FINAL_GOAL_REVIEWS: 'final_goal_reviews_',
  FINAL_BEHAVIOR_REVIEWS: 'final_behavior_reviews_',
  CEO_REVIEW: 'ceo_review_',
  DEVELOPMENT_DRAFT: 'development_draft_',
  END_YEAR_REVIEW_DRAFT: 'end_year_review_draft_',
};

/**
 * Get estimated size of localStorage in bytes
 */
export function getLocalStorageSize(): number {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += key.length + (localStorage.getItem(key)?.length || 0);
    }
  }
  return total;
}

/**
 * Get localStorage size in MB
 */
export function getLocalStorageSizeMB(): number {
  return getLocalStorageSize() / (1024 * 1024);
}

/**
 * Check if localStorage is approaching quota (80% full)
 */
export function isStorageNearQuota(): boolean {
  const sizeMB = getLocalStorageSizeMB();
  // Assume 5MB quota (conservative estimate)
  return sizeMB > 4;
}

/**
 * Get all PDR-related keys for a specific PDR
 */
export function getPDRStorageKeys(pdrId: string): string[] {
  const keys: string[] = [];
  Object.values(STORAGE_KEYS_PREFIX).forEach(prefix => {
    const key = `${prefix}${pdrId}`;
    if (localStorage.getItem(key)) {
      keys.push(key);
    }
  });
  return keys;
}

/**
 * Clean up storage for a specific PDR (when review is completed)
 */
export function cleanupPDRStorage(pdrId: string): void {
  const keys = getPDRStorageKeys(pdrId);
  console.log(`🧹 Cleaning up ${keys.length} localStorage keys for PDR ${pdrId}`);
  
  keys.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`  ✅ Removed: ${key}`);
    } catch (error) {
      console.error(`  ❌ Failed to remove: ${key}`, error);
    }
  });
}

/**
 * Clean up old/stale PDR data (older than 30 days)
 */
export function cleanupStaleStorage(): number {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  let removedCount = 0;
  
  Object.values(STORAGE_KEYS_PREFIX).forEach(prefix => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const savedAt = parsed.savedAt || parsed.createdAt || parsed.updatedAt;
            
            if (savedAt) {
              const savedDate = new Date(savedAt).getTime();
              if (savedDate < thirtyDaysAgo) {
                localStorage.removeItem(key);
                removedCount++;
                console.log(`🗑️ Removed stale data: ${key}`);
              }
            }
          }
        } catch (error) {
          // Skip invalid data
        }
      }
    }
  });
  
  return removedCount;
}

/**
 * Emergency cleanup - remove oldest PDR data if storage is full
 */
export function emergencyCleanup(): number {
  const pdrData: { key: string; timestamp: number }[] = [];
  
  // Collect all PDR-related data with timestamps
  Object.values(STORAGE_KEYS_PREFIX).forEach(prefix => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const timestamp = new Date(parsed.savedAt || parsed.createdAt || parsed.updatedAt || 0).getTime();
            pdrData.push({ key, timestamp });
          }
        } catch (error) {
          // Invalid data - add with old timestamp to be removed
          pdrData.push({ key, timestamp: 0 });
        }
      }
    }
  });
  
  // Sort by timestamp (oldest first)
  pdrData.sort((a, b) => a.timestamp - b.timestamp);
  
  // Remove oldest 25% of data
  const toRemove = Math.ceil(pdrData.length * 0.25);
  let removedCount = 0;
  
  for (let i = 0; i < toRemove && i < pdrData.length; i++) {
    try {
      localStorage.removeItem(pdrData[i].key);
      removedCount++;
      console.log(`🚨 Emergency removal: ${pdrData[i].key}`);
    } catch (error) {
      console.error(`Failed to remove: ${pdrData[i].key}`, error);
    }
  }
  
  return removedCount;
}

/**
 * Safe localStorage.setItem with quota handling
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage quota exceeded, attempting cleanup...');
      
      // Try cleanup strategies in order
      
      // 1. Clean stale data (older than 30 days)
      const staleRemoved = cleanupStaleStorage();
      console.log(`🧹 Removed ${staleRemoved} stale items`);
      
      // 2. If still not enough space, emergency cleanup
      if (isStorageNearQuota()) {
        const emergencyRemoved = emergencyCleanup();
        console.log(`🚨 Emergency cleanup removed ${emergencyRemoved} items`);
      }
      
      // 3. Try again after cleanup
      try {
        localStorage.setItem(key, value);
        console.log('✅ Successfully saved after cleanup');
        return true;
      } catch (retryError) {
        console.error('❌ Still failed after cleanup:', retryError);
        
        // 4. Last resort: alert user
        alert('Storage quota exceeded. Some data may not be saved. Please complete your current review and refresh the page.');
        return false;
      }
    } else {
      console.error('localStorage error:', error);
      return false;
    }
  }
}

/**
 * Safe localStorage.setItem with JSON stringification
 */
export function safeSetItemJSON<T>(key: string, value: T): boolean {
  try {
    const jsonString = JSON.stringify(value);
    return safeSetItem(key, jsonString);
  } catch (error) {
    console.error('Failed to stringify value:', error);
    return false;
  }
}

/**
 * Get item from localStorage with JSON parsing
 */
export function safeGetItemJSON<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error('Failed to parse JSON from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Log storage statistics
 */
export function logStorageStats(): void {
  const sizeMB = getLocalStorageSizeMB();
  const itemCount = localStorage.length;
  
  console.group('📊 localStorage Statistics');
  console.log(`Size: ${sizeMB.toFixed(2)} MB`);
  console.log(`Items: ${itemCount}`);
  console.log(`Near Quota: ${isStorageNearQuota() ? '⚠️ YES' : '✅ NO'}`);
  console.groupEnd();
}

