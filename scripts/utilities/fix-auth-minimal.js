#!/usr/bin/env node
/**
 * MINIMAL AUTHENTICATION FIX
 * 
 * Creates a basic profile with minimal required fields
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors
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

async function fixAuthMinimal() {
  console.log(colorize('cyan', '🔧 MINIMAL AUTHENTICATION FIX'));
  console.log(colorize('cyan', '=============================='));
  console.log('');

  try {
    const env = loadEnvLocal();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const testEmail = 'ryan.higginson@codefishstudio.com';

    // 1. Get user
    console.log(colorize('blue', '1. Getting user...'));
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === testEmail);
    
    if (!authUser) {
      throw new Error('User not found');
    }
    
    console.log(colorize('green', '✅ User found:'), authUser.id);

    // 2. Check current profile table structure
    console.log('');
    console.log(colorize('blue', '2. Checking profiles table structure...'));
    
    // Try to get any existing profile to see the structure
    const { data: sampleProfiles, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    let tableSchema = {};
    if (sampleProfiles && sampleProfiles.length > 0) {
      tableSchema = Object.keys(sampleProfiles[0]);
      console.log('   Table columns:', tableSchema.join(', '));
    } else {
      console.log('   Table is empty, trying basic insert...');
    }

    // 3. Try different profile structures
    console.log('');
    console.log(colorize('blue', '3. Creating profile...'));
    
    // Start with the most basic profile structure
    let profileData = {
      id: authUser.id,
      email: authUser.email
    };
    
    // Add common fields that might exist
    if (authUser.user_metadata?.first_name) {
      profileData.first_name = authUser.user_metadata.first_name;
    }
    
    if (authUser.user_metadata?.last_name) {
      profileData.last_name = authUser.user_metadata.last_name;
    }
    
    // Try EMPLOYEE role
    try {
      profileData.role = 'EMPLOYEE';
    } catch (e) {
      // Role might not exist
    }
    
    console.log('   Trying profile data:', JSON.stringify(profileData, null, 2));
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (insertError) {
      console.log(colorize('red', '❌ Insert failed:'), insertError.message);
      
      // Try with even more minimal data
      console.log('');
      console.log(colorize('yellow', '⚠️  Trying with minimal data...'));
      
      const minimalData = {
        id: authUser.id,
        email: authUser.email
      };
      
      const { data: minimalProfile, error: minimalError } = await supabase
        .from('profiles')
        .insert(minimalData)
        .select()
        .single();
      
      if (minimalError) {
        console.log(colorize('red', '❌ Minimal insert also failed:'), minimalError.message);
        
        // Database schema issue
        console.log('');
        console.log(colorize('yellow', '🏗️  DATABASE SCHEMA NEEDS SETUP'));
        console.log('');
        console.log('The profiles table exists but doesn\'t match the expected schema.');
        console.log('Please run the complete schema setup in Supabase SQL Editor:');
        console.log('');
        console.log('File: supabase-complete-schema.sql');
        console.log('');
        console.log('This will:');
        console.log('- Set up correct table structure');
        console.log('- Enable Row Level Security policies');
        console.log('- Create system data (company values, PDR periods)');
        console.log('- Set up triggers for auto-profile creation');
        
        return;
      }
      
      console.log(colorize('green', '✅ Minimal profile created!'));
      console.log('   ID:', minimalProfile.id);
      console.log('   Email:', minimalProfile.email);
      
    } else {
      console.log(colorize('green', '✅ Full profile created!'));
      console.log('   ID:', newProfile.id);
      console.log('   Email:', newProfile.email);
      console.log('   Name:', newProfile.first_name, newProfile.last_name);
      console.log('   Role:', newProfile.role);
    }
    
    // 4. Test access
    console.log('');
    console.log(colorize('blue', '4. Testing profile access...'));
    
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (testError) {
      console.log(colorize('red', '❌ Test failed:'), testError.message);
      return;
    }
    
    console.log(colorize('green', '✅ Profile access successful!'));
    console.log('   Profile data:', JSON.stringify(testProfile, null, 2));
    
    console.log('');
    console.log(colorize('green', '🎉 BASIC PROFILE CREATED!'));
    console.log('');
    console.log(colorize('yellow', '📋 Next Steps:'));
    console.log('   1. Restart dev server: npm run dev');
    console.log('   2. Clear browser cache');
    console.log('   3. Try logging in again');
    console.log('');
    console.log('   If 401 errors persist:');
    console.log('   → Run complete schema: supabase-complete-schema.sql');
    console.log('   → This sets up proper RLS policies and table structure');
    
  } catch (error) {
    console.error(colorize('red', '❌ Error:'), error.message);
    console.error(error);
  }
}

if (require.main === module) {
  fixAuthMinimal();
}

module.exports = { fixAuthMinimal };
