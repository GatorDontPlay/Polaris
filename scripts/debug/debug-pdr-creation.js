#!/usr/bin/env node
/**
 * DEBUG PDR CREATION
 * 
 * Test PDR creation directly to see what's failing
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

async function debugPDRCreation() {
  console.log('🔍 Debugging PDR Creation...');
  
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
    
    console.log('✅ User found:', authUser.id);
    
    // Test PDR creation with the same data the frontend is sending
    const testPDRData = {
      user_id: authUser.id,
      fy_label: '2025-2026',  
      fy_start_date: '2025-07-01',
      fy_end_date: '2026-06-30',
      status: 'DRAFT',
      current_step: 1,
      is_locked: false,
      meeting_booked: false
    };
    
    console.log('📊 Attempting to create PDR with data:', testPDRData);
    
    // Check if PDR already exists
    const { data: existingPDR, error: checkError } = await supabase
      .from('pdrs')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('fy_label', '2025-2026')
      .single();
    
    if (existingPDR) {
      console.log('⚠️  PDR already exists for this FY:', existingPDR.id);
      console.log('   Deleting existing PDR first...');
      
      const { error: deleteError } = await supabase
        .from('pdrs')
        .delete()
        .eq('id', existingPDR.id);
      
      if (deleteError) {
        console.log('❌ Delete failed:', deleteError.message);
      } else {
        console.log('✅ Existing PDR deleted');
      }
    }
    
    // Try creating the PDR
    const { data: newPDR, error: createError } = await supabase
      .from('pdrs')
      .insert(testPDRData)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role)
      `)
      .single();
    
    if (createError) {
      console.log('❌ PDR creation failed:', createError);
      console.log('   Error code:', createError.code);
      console.log('   Error message:', createError.message);
      console.log('   Error details:', createError.details);
    } else {
      console.log('✅ PDR created successfully!');
      console.log('   ID:', newPDR.id);
      console.log('   FY:', newPDR.fy_label);
      console.log('   Status:', newPDR.status);
      console.log('   User:', newPDR.user?.first_name, newPDR.user?.last_name);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error);
  }
}

if (require.main === module) {
  debugPDRCreation();
}
