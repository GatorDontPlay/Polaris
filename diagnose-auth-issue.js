#!/usr/bin/env node
/**
 * AUTHENTICATION ISSUE DIAGNOSTICS
 * 
 * Run this first to understand the current state of your authentication system
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error(colorize('red', '❌ .env.local file not found!'));
    console.log('Please create .env.local with your Supabase credentials.');
    process.exit(1);
  }
  
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

async function diagnoseAuth() {
  console.log(colorize('cyan', '🔍 PDR AUTHENTICATION DIAGNOSTICS'));
  console.log(colorize('cyan', '================================='));
  console.log('');

  try {
    const env = loadEnvLocal();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const testEmail = 'ryan.higginson@codefishstudio.com';

    // 1. Check Supabase connection
    console.log(colorize('blue', '1. 📡 Supabase Connection'));
    console.log('   Testing connection...');
    
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' }).limit(1);
      if (error) throw error;
      console.log(colorize('green', '   ✅ Connection successful'));
    } catch (error) {
      console.log(colorize('red', '   ❌ Connection failed:'), error.message);
      return;
    }

    // 2. Check auth.users
    console.log('');
    console.log(colorize('blue', '2. 👤 Auth Users Table'));
    
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log(colorize('red', '   ❌ Cannot access users:'), usersError.message);
      return;
    }

    const authUser = users.find(u => u.email === testEmail);
    if (authUser) {
      console.log(colorize('green', '   ✅ User found in auth.users'));
      console.log(`      ID: ${authUser.id}`);
      console.log(`      Email: ${authUser.email}`);
      console.log(`      Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`      Role in metadata: ${authUser.user_metadata?.role || 'Not set'}`);
    } else {
      console.log(colorize('red', '   ❌ User not found in auth.users'));
      console.log('      This user needs to be created or the email is different');
      return;
    }

    // 3. Check profiles table
    console.log('');
    console.log(colorize('blue', '3. 📝 Profiles Table'));
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log(colorize('red', '   ❌ Profile not found in profiles table'));
        console.log('      This is likely the main cause of 401 errors');
      } else {
        console.log(colorize('red', '   ❌ Profile table error:'), profileError.message);
      }
    } else {
      console.log(colorize('green', '   ✅ Profile found'));
      console.log(`      Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`      Role: ${profile.role}`);
      console.log(`      Active: ${profile.is_active}`);
      console.log(`      Email: ${profile.email}`);
    }

    // 4. Check PDRs
    console.log('');
    console.log(colorize('blue', '4. 📋 PDRs Table'));
    
    const { data: pdrs, error: pdrError } = await supabase
      .from('pdrs')
      .select('id, fy_label, status, current_step')
      .eq('user_id', authUser.id)
      .limit(5);

    if (pdrError) {
      console.log(colorize('red', '   ❌ PDR query failed:'), pdrError.message);
    } else {
      console.log(colorize('green', `   ✅ Found ${pdrs.length} PDR(s)`));
      pdrs.forEach(pdr => {
        console.log(`      • ${pdr.fy_label}: ${pdr.status} (Step ${pdr.current_step})`);
      });
    }

    // 5. Check system tables
    console.log('');
    console.log(colorize('blue', '5. 🏢 System Tables'));
    
    const { data: values, error: valuesError } = await supabase
      .from('company_values')
      .select('count', { count: 'exact' });

    const { data: periods, error: periodsError } = await supabase
      .from('pdr_periods')
      .select('count', { count: 'exact' });

    if (!valuesError) {
      console.log(colorize('green', `   ✅ Company values: ${values.length > 0 ? values[0].count : 0} records`));
    } else {
      console.log(colorize('red', '   ❌ Company values table error'));
    }

    if (!periodsError) {
      console.log(colorize('green', `   ✅ PDR periods: ${periods.length > 0 ? periods[0].count : 0} records`));
    } else {
      console.log(colorize('red', '   ❌ PDR periods table error'));
    }

    // 6. Summary and recommendations
    console.log('');
    console.log(colorize('yellow', '📋 DIAGNOSIS SUMMARY'));
    console.log('─────────────────────');

    if (!authUser) {
      console.log(colorize('red', '❌ CRITICAL: User not found in auth.users'));
      console.log('   → User needs to sign up or email address is different');
    } else if (profileError) {
      console.log(colorize('red', '❌ CRITICAL: Profile missing from profiles table'));
      console.log('   → This is the root cause of 401 Unauthorized errors');
      console.log('   → Run: node fix-auth-complete.js to fix');
    } else if (!profile.role || !profile.first_name) {
      console.log(colorize('yellow', '⚠️  WARNING: Profile incomplete'));
      console.log('   → Profile exists but missing required fields');
      console.log('   → Run: node fix-auth-complete.js to fix');
    } else {
      console.log(colorize('green', '✅ Authentication setup looks good'));
      console.log('   → If you\'re still getting 401 errors, check:');
      console.log('     • Browser cookies/cache');
      console.log('     • Next.js dev server restart');
      console.log('     • Network/CORS issues');
    }

    console.log('');
    
  } catch (error) {
    console.error(colorize('red', '❌ Diagnosis failed:'), error.message);
  }
}

// Run diagnostics
if (require.main === module) {
  diagnoseAuth().catch(error => {
    console.error(colorize('red', '❌ Error:'), error.message);
    process.exit(1);
  });
}

module.exports = { diagnoseAuth };
