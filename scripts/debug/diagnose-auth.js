#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey;

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim().replace(/"/g, '');
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file:', error.message);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDiagnostic() {
  console.log('🔍 Running authentication diagnostic...\n');

  try {
    // 1. Check if user_role enum exists
    const { data: enumCheck } = await supabase.rpc('execute_sql', {
      sql: `SELECT CASE 
              WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') 
              THEN 'EXISTS' 
              ELSE 'MISSING' 
            END as status`
    });
    console.log('1. user_role enum:', enumCheck?.[0]?.status === 'EXISTS' ? '✅ EXISTS' : '❌ MISSING');

    // 2. Check if profiles table exists
    const { data: tableCheck } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');
    console.log('2. profiles table:', tableCheck?.length > 0 ? '✅ EXISTS' : '❌ MISSING');

    // 3. Check profiles table structure
    if (tableCheck?.length > 0) {
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'profiles')
        .eq('table_schema', 'public')
        .order('ordinal_position');
      
      console.log('3. profiles table columns:');
      columns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // 4. Check if handle_new_user function exists
    const { data: functionCheck } = await supabase.rpc('execute_sql', {
      sql: `SELECT CASE 
              WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
              THEN 'EXISTS' 
              ELSE 'MISSING' 
            END as status`
    });
    console.log('4. handle_new_user function:', functionCheck?.[0]?.status === 'EXISTS' ? '✅ EXISTS' : '❌ MISSING');

    // 5. Check if trigger exists
    const { data: triggerCheck } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_name', 'on_auth_user_created')
      .eq('event_object_table', 'users')
      .eq('event_object_schema', 'auth');
    console.log('5. on_auth_user_created trigger:', triggerCheck?.length > 0 ? '✅ EXISTS' : '❌ MISSING');

    // 6. Check RLS policies
    const { data: policies } = await supabase.rpc('execute_sql', {
      sql: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles'`
    });
    console.log('6. RLS policies on profiles:');
    if (policies?.length > 0) {
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('   ❌ No policies found');
    }

  } catch (error) {
    console.error('❌ Error running diagnostic:', error.message);
    
    // Try simpler checks
    try {
      console.log('\n🔄 Trying simpler checks...');
      
      // Check if we can query profiles table
      const { data, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      console.log('Can query profiles table:', !profilesError ? '✅ YES' : '❌ NO');
      if (profilesError) {
        console.log('   Error:', profilesError.message);
      }
      
    } catch (simpleError) {
      console.error('❌ Even simple checks failed:', simpleError.message);
    }
  }
}

runDiagnostic().then(() => {
  console.log('\n✅ Diagnostic complete');
}).catch(error => {
  console.error('❌ Diagnostic failed:', error);
});
