#!/usr/bin/env node
/**
 * UPDATE EXISTING PDR DATA
 * 
 * Fix the existing PDR to have proper fy_label and other fields
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

function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  if (month >= 6) { // July onwards
    return {
      label: `FY${year}-${year + 1}`,
      startDate: `${year}-07-01`,
      endDate: `${year + 1}-06-30`
    };
  } else {
    return {
      label: `FY${year - 1}-${year}`,
      startDate: `${year - 1}-07-01`,
      endDate: `${year}-06-30`
    };
  }
}

async function updateExistingPDR() {
  console.log('🔄 Updating existing PDR data...');
  
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
    
    // Get current financial year
    const currentFY = getCurrentFinancialYear();
    
    // Update existing PDRs with missing fy_label
    const { data: updatedPDRs, error: updateError } = await supabase
      .from('pdrs')
      .update({
        fy_label: currentFY.label,
        fy_start_date: currentFY.startDate,
        fy_end_date: currentFY.endDate,
        status: 'DRAFT', // Reset to proper initial status
        current_step: 1,
        is_locked: false,
        meeting_booked: false
      })
      .eq('user_id', authUser.id)
      .is('fy_label', null)
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return;
    }
    
    if (updatedPDRs && updatedPDRs.length > 0) {
      console.log('✅ Updated PDR successfully!');
      updatedPDRs.forEach(pdr => {
        console.log(`   • PDR ID: ${pdr.id}`);
        console.log(`   • FY: ${pdr.fy_label}`);
        console.log(`   • Status: ${pdr.status}`);
        console.log(`   • Step: ${pdr.current_step}`);
      });
    } else {
      console.log('ℹ️  No PDRs needed updating (fy_label already set)');
    }
    
    // Show current PDRs
    const { data: allPDRs, error: selectError } = await supabase
      .from('pdrs')
      .select('*')
      .eq('user_id', authUser.id);
    
    if (!selectError && allPDRs) {
      console.log('\n📋 Current PDRs:');
      allPDRs.forEach(pdr => {
        console.log(`   • ${pdr.fy_label || 'No FY'}: ${pdr.status} (Step ${pdr.current_step})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  updateExistingPDR();
}
