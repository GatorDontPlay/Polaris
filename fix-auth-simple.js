#!/usr/bin/env node
/**
 * SIMPLE AUTHENTICATION FIX
 * 
 * This script focuses on the immediate issue: creating the missing profile
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
  reset: '\x1b[0m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error(colorize('red', '❌ .env.local file not found!'));
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

async function fixAuthSimple() {
  console.log(colorize('cyan', '🔧 SIMPLE AUTHENTICATION FIX'));
  console.log(colorize('cyan', '==============================='));
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

    // 1. Get user from auth.users
    console.log(colorize('blue', '1. Finding user in auth.users...'));
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Cannot access users: ${usersError.message}`);
    }
    
    const authUser = users.find(u => u.email === testEmail);
    
    if (!authUser) {
      console.log(colorize('red', '❌ User not found in auth.users'));
      return;
    }
    
    console.log(colorize('green', '✅ User found'));
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);

    // 2. Check if profile exists
    console.log('');
    console.log(colorize('blue', '2. Checking profile in profiles table...'));
    
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (existingProfile) {
      console.log(colorize('green', '✅ Profile already exists'));
      console.log(`   Name: ${existingProfile.first_name} ${existingProfile.last_name}`);
      console.log(`   Role: ${existingProfile.role}`);
      console.log('');
      console.log(colorize('yellow', '🤔 Profile exists but you\'re still getting 401 errors?'));
      console.log('   This might be a schema or RLS policy issue.');
      console.log('   Try restarting your dev server: npm run dev');
      return;
    }

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Profile check failed: ${profileError.message}`);
    }

    // 3. Create the missing profile
    console.log(colorize('yellow', '⚠️  Profile missing - creating now...'));
    
    const profileData = {
      id: authUser.id,
      email: authUser.email,
      first_name: authUser.user_metadata?.first_name || 'Ryan',
      last_name: authUser.user_metadata?.last_name || 'Higginson', 
      role: authUser.user_metadata?.role || 'EMPLOYEE',
      is_active: true
    };
    
    console.log('Profile data to insert:', profileData);
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (insertError) {
      console.log(colorize('red', '❌ Failed to create profile:'), insertError.message);
      
      // If it's a table doesn't exist error, we need to set up the schema
      if (insertError.code === '42P01') {
        console.log('');
        console.log(colorize('yellow', '🏗️  Database schema not set up.'));
        console.log('   Please run the schema in Supabase SQL Editor:');
        console.log('   File: supabase-complete-schema.sql');
        console.log('');
        console.log('   Then run this script again.');
        return;
      }
      
      throw new Error(insertError.message);
    }
    
    console.log(colorize('green', '✅ Profile created successfully!'));
    console.log(`   Name: ${newProfile.first_name} ${newProfile.last_name}`);
    console.log(`   Role: ${newProfile.role}`);
    console.log(`   Active: ${newProfile.is_active}`);
    
    // 4. Final test
    console.log('');
    console.log(colorize('blue', '3. Testing profile access...'));
    
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (testError) {
      console.log(colorize('red', '❌ Profile test failed:'), testError.message);
      return;
    }
    
    console.log(colorize('green', '✅ Profile access test successful!'));
    
    console.log('');
    console.log(colorize('green', '🎉 AUTHENTICATION FIX COMPLETE!'));
    console.log('');
    console.log(colorize('yellow', '📋 Next Steps:'));
    console.log('   1. Restart your dev server: npm run dev');
    console.log('   2. Clear browser cache and cookies');
    console.log('   3. Login again - the 401 errors should be gone');
    console.log('');
    console.log('   If you still get 401 errors, the database schema might need setup.');
    console.log('   Run the complete schema in Supabase SQL Editor: supabase-complete-schema.sql');
    
  } catch (error) {
    console.error(colorize('red', '❌ Fix failed:'), error.message);
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  fixAuthSimple().catch(error => {
    console.error(colorize('red', '❌ Error:'), error.message);
    process.exit(1);
  });
}

module.exports = { fixAuthSimple };
