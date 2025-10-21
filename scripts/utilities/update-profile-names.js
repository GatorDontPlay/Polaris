#!/usr/bin/env node
/**
 * UPDATE PROFILE NAMES
 * 
 * Update the profile with proper first_name and last_name
 */

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

async function updateProfileNames() {
  console.log('🔄 Updating profile names...');
  
  try {
    const env = loadEnvLocal();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    const testEmail = 'ryan.higginson@codefishstudio.com';
    
    // Get user ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === testEmail);
    
    if (!authUser) {
      throw new Error('User not found');
    }
    
    // Update profile with names
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: 'Ryan',
        last_name: 'Higginson'
      })
      .eq('id', authUser.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return;
    }
    
    console.log('✅ Profile updated successfully!');
    console.log('   Name:', updatedProfile.first_name, updatedProfile.last_name);
    console.log('   Role:', updatedProfile.role);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  updateProfileNames();
}
