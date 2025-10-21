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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Checking current database state...\n');

  try {
    // 1. Check if we can query profiles table directly
    console.log('1. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.log('   ❌ Cannot query profiles:', profilesError.message);
    } else {
      console.log(`   ✅ Profiles table exists with ${profiles.length} records`);
      if (profiles.length > 0) {
        console.log('   Sample profile:', {
          id: profiles[0].id,
          email: profiles[0].email,
          role: profiles[0].role,
          first_name: profiles[0].first_name
        });
      }
    }

    // 2. Check company_values table
    console.log('2. Checking company_values table...');
    const { data: values, error: valuesError } = await supabase
      .from('company_values')
      .select('*')
      .limit(3);
    
    if (valuesError) {
      console.log('   ❌ Cannot query company_values:', valuesError.message);
    } else {
      console.log(`   ✅ Company values table exists with ${values.length} records`);
    }

    // 3. Check pdrs table
    console.log('3. Checking pdrs table...');
    const { data: pdrs, error: pdrsError } = await supabase
      .from('pdrs')
      .select('*')
      .limit(3);
    
    if (pdrsError) {
      console.log('   ❌ Cannot query pdrs:', pdrsError.message);
    } else {
      console.log(`   ✅ PDRs table exists with ${pdrs.length} records`);
    }

    // 4. Check behaviors table
    console.log('4. Checking behaviors table...');
    const { data: behaviors, error: behaviorsError } = await supabase
      .from('behaviors')
      .select('*')
      .limit(3);
    
    if (behaviorsError) {
      console.log('   ❌ Cannot query behaviors:', behaviorsError.message);
    } else {
      console.log(`   ✅ Behaviors table exists with ${behaviors.length} records`);
    }

    // 5. Try to test signup by checking auth configuration
    console.log('5. Testing auth configuration...');
    
    // Check if we can access auth.users (this will fail due to RLS but shows if auth is working)
    try {
      const { data: authTest, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.log('   ⚠️  Auth admin access error:', authError.message);
      } else {
        console.log(`   ✅ Auth working, found ${authTest.users.length} users`);
      }
    } catch (authErr) {
      console.log('   ⚠️  Auth test failed:', authErr.message);
    }

    // 6. Check if we can create a test signup (we'll cancel it)
    console.log('6. Testing signup flow...');
    try {
      const testEmail = `test-${Date.now()}@example.com`;
      const { data: signupTest, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'test123456',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User',
            role: 'EMPLOYEE'
          }
        }
      });
      
      if (signupError) {
        console.log('   ❌ Signup test failed:', signupError.message);
        console.log('   Full error:', JSON.stringify(signupError, null, 2));
      } else {
        console.log('   ✅ Signup flow works');
        // Clean up test user if created
        if (signupTest.user && signupTest.user.id) {
          await supabase.auth.admin.deleteUser(signupTest.user.id);
          console.log('   🗑️  Cleaned up test user');
        }
      }
    } catch (signupErr) {
      console.log('   ❌ Signup test error:', signupErr.message);
    }

  } catch (error) {
    console.error('❌ Error during database check:', error.message);
  }
}

checkDatabase().then(() => {
  console.log('\n✅ Database check complete');
}).catch(error => {
  console.error('❌ Database check failed:', error);
});

