#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
let supabaseUrl, supabaseAnonKey;

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim().replace(/"/g, '');
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file:', error.message);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  console.log('🧪 Testing signup flow...\n');

  try {
    const testEmail = `test-signup-${Date.now()}@example.com`;
    console.log('📧 Testing with email:', testEmail);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User', 
          role: 'EMPLOYEE'
        },
        emailRedirectTo: 'http://localhost:3001/auth/confirm'
      }
    });

    if (error) {
      console.log('❌ Signup failed with error:');
      console.log('   Code:', error.status || 'No status');
      console.log('   Message:', error.message);
      console.log('   Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Signup succeeded!');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      console.log('   Confirmed:', !!data.user?.email_confirmed_at);
      console.log('   Session:', !!data.session);
      
      // Clean up - try to delete the test user
      if (data.user?.id) {
        console.log('🗑️  Attempting to clean up test user...');
        // Note: This might fail due to permissions, that's okay
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error during signup test:', error.message);
    console.error('Full error:', error);
  }
}

testSignup().then(() => {
  console.log('\n✅ Signup test complete');
}).catch(error => {
  console.error('❌ Signup test failed:', error);
});

