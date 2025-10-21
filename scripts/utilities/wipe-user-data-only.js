const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].replace(/^"(.*)"$/, '$1');
      env[key] = value;
    }
  });
  
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function wipeUserDataOnly() {
  console.log('👥 Wiping USER DATA only (preserving system data)');
  console.log('📊 Will keep: company_values, pdr_periods');
  console.log('🗑️  Will clear: profiles, pdrs, goals, behaviors, notifications, etc.');
  console.log('');
  
  try {
    // Tables that contain user data (will be cleared)
    const userDataTables = [
      'audit_logs',
      'end_year_reviews',
      'mid_year_reviews', 
      'behavior_entries',
      'behaviors',
      'goals', 
      'notifications',
      'pdrs',
      'profiles'  // This will cascade to most other tables
    ];
    
    // System tables to preserve (will NOT be cleared)
    const systemTables = [
      'company_values',
      'pdr_periods'  
    ];
    
    console.log('🔍 Checking current data counts...');
    
    // Show current counts
    for (const table of userDataTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`📊 ${table}: ${count} records`);
        }
      } catch (e) {
        console.log(`⚠️  ${table}: not accessible`);
      }
    }
    
    console.log('\n🗑️  Starting user data deletion...');
    
    let totalDeleted = 0;
    
    // Delete user data in dependency order
    for (const table of userDataTables) {
      console.log(`\n🗑️  Clearing ${table}...`);
      
      try {
        // Get count first
        const { count: beforeCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (beforeCount === 0) {
          console.log(`✅ ${table} is already empty`);
          continue;
        }
        
        // Delete all records
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)
        
        if (error) {
          console.log(`❌ Error clearing ${table}:`, error.message);
        } else {
          console.log(`✅ ${table} cleared (${beforeCount} records deleted)`);
          totalDeleted += beforeCount;
        }
        
      } catch (error) {
        console.log(`❌ Failed to process ${table}:`, error.message);
      }
    }
    
    console.log('\n📊 Verifying system data preservation...');
    
    // Verify system tables are intact
    for (const table of systemTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`✅ ${table}: ${count} records preserved`);
        }
      } catch (e) {
        console.log(`⚠️  ${table}: could not verify`);
      }
    }
    
    console.log(`\n🎉 User data wipe complete!`);
    console.log(`📊 Total user records deleted: ${totalDeleted}`);
    console.log(`📋 System data preserved (company values, periods)`);
    console.log(`🏗️  Database structure intact`);
    console.log('');
    console.log('✅ Ready for new users to sign up and create PDRs');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Confirmation prompt  
console.log('⚠️  WARNING: This will delete all USER DATA!');
console.log('');
console.log('Will DELETE:');
console.log('  • All user profiles');
console.log('  • All PDRs, goals, and behaviors');
console.log('  • All notifications and audit logs');
console.log('');
console.log('Will PRESERVE:');
console.log('  • Company values');
console.log('  • PDR periods');
console.log('  • Table structure');
console.log('');
console.log('Are you sure? Run with: node wipe-user-data-only.js --confirm');

if (process.argv.includes('--confirm')) {
  wipeUserDataOnly().catch(console.error);
} else {
  console.log('');
  console.log('💡 To proceed, run: node wipe-user-data-only.js --confirm');
}
