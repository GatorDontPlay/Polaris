// Temporary utility to clean up duplicate behaviors in localStorage
// Run this in browser console if needed

function cleanupDuplicateBehaviors() {
  const keys = Object.keys(localStorage);
  const behaviorKeys = keys.filter(key => key.startsWith('demo_behaviors_'));
  
  behaviorKeys.forEach(key => {
    try {
      const behaviors = JSON.parse(localStorage.getItem(key) || '[]');
      if (behaviors.length > 0) {
        const uniqueBehaviors = new Map();
        
        // Keep only the latest behavior for each valueId
        behaviors.forEach(behavior => {
          const existing = uniqueBehaviors.get(behavior.valueId);
          if (!existing || new Date(behavior.updatedAt) > new Date(existing.updatedAt)) {
            uniqueBehaviors.set(behavior.valueId, behavior);
          }
        });
        
        const cleanedBehaviors = Array.from(uniqueBehaviors.values());
        
        if (cleanedBehaviors.length !== behaviors.length) {
          console.log(`Cleaning ${key}: ${behaviors.length} -> ${cleanedBehaviors.length} behaviors`);
          localStorage.setItem(key, JSON.stringify(cleanedBehaviors));
        }
      }
    } catch (error) {
      console.error(`Error cleaning ${key}:`, error);
    }
  });
  
  console.log('Cleanup complete! Refresh the page to see changes.');
}

// Export for console use
if (typeof window !== 'undefined') {
  window.cleanupDuplicateBehaviors = cleanupDuplicateBehaviors;
}
