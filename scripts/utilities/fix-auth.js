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

async function fixAuthentication() {
  console.log('🔧 Fixing authentication setup...\n');

  try {
    // 1. Create user_role enum
    console.log('1. Creating user_role enum...');
    const { error: enumError } = await supabase.rpc('execute_sql', {
      sql: `DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
              CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'CEO');
          END IF;
      END $$;`
    });
    
    if (enumError) {
      console.error('   ❌ Error creating enum:', enumError.message);
    } else {
      console.log('   ✅ user_role enum created');
    }

    // 2. Create profiles table
    console.log('2. Creating profiles table...');
    const { error: tableError } = await supabase.rpc('execute_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          email TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role user_role NOT NULL DEFAULT 'EMPLOYEE',
          avatar_url TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    });
    
    if (tableError) {
      console.error('   ❌ Error creating table:', tableError.message);
    } else {
      console.log('   ✅ profiles table created');
    }

    // 3. Enable RLS
    console.log('3. Enabling RLS...');
    const { error: rlsError } = await supabase.rpc('execute_sql', {
      sql: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`
    });
    
    if (rlsError) {
      console.error('   ❌ Error enabling RLS:', rlsError.message);
    } else {
      console.log('   ✅ RLS enabled');
    }

    // 4. Create RLS policies
    console.log('4. Creating RLS policies...');
    const policies = [
      {
        name: 'view_all_profiles',
        sql: `CREATE POLICY "Allow authenticated users to view all profiles" ON public.profiles
              FOR SELECT USING (auth.role() = 'authenticated');`
      },
      {
        name: 'insert_own_profile',
        sql: `CREATE POLICY "Users can insert their own profile" ON public.profiles
              FOR INSERT WITH CHECK (auth.uid() = id);`
      },
      {
        name: 'update_own_profile',
        sql: `CREATE POLICY "Users can update their own profile" ON public.profiles
              FOR UPDATE USING (auth.uid() = id);`
      },
      {
        name: 'ceo_update_any',
        sql: `CREATE POLICY "CEO can update any profile" ON public.profiles
              FOR UPDATE USING (
                  EXISTS (
                      SELECT 1 FROM public.profiles 
                      WHERE id = auth.uid() AND role = 'CEO'
                  )
              );`
      }
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('execute_sql', {
        sql: `DROP POLICY IF EXISTS "${policy.name.replace('_', ' ')}" ON public.profiles; ${policy.sql}`
      });
      
      if (policyError) {
        console.error(`   ❌ Error creating policy ${policy.name}:`, policyError.message);
      } else {
        console.log(`   ✅ Policy ${policy.name} created`);
      }
    }

    // 5. Create handle_new_user function
    console.log('5. Creating handle_new_user function...');
    const { error: functionError } = await supabase.rpc('execute_sql', {
      sql: `CREATE OR REPLACE FUNCTION public.handle_new_user() 
      RETURNS trigger 
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
          INSERT INTO public.profiles (id, email, first_name, last_name, role)
          VALUES (
              NEW.id, 
              NEW.email,
              COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
              COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
              COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'EMPLOYEE'::user_role)
          );
          RETURN NEW;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE LOG 'Error in handle_new_user: %', SQLERRM;
              RAISE;
      END;
      $$ LANGUAGE plpgsql;`
    });
    
    if (functionError) {
      console.error('   ❌ Error creating function:', functionError.message);
    } else {
      console.log('   ✅ handle_new_user function created');
    }

    // 6. Create trigger
    console.log('6. Creating trigger...');
    const { error: triggerError } = await supabase.rpc('execute_sql', {
      sql: `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
    });
    
    if (triggerError) {
      console.error('   ❌ Error creating trigger:', triggerError.message);
    } else {
      console.log('   ✅ Trigger created');
    }

    // 7. Grant permissions
    console.log('7. Granting permissions...');
    const { error: permissionError } = await supabase.rpc('execute_sql', {
      sql: `GRANT USAGE ON SCHEMA public TO authenticated;
            GRANT ALL ON public.profiles TO authenticated;
            GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;`
    });
    
    if (permissionError) {
      console.error('   ❌ Error granting permissions:', permissionError.message);
    } else {
      console.log('   ✅ Permissions granted');
    }

    // 8. Create indexes
    console.log('8. Creating indexes...');
    const { error: indexError } = await supabase.rpc('execute_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
            CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);`
    });
    
    if (indexError) {
      console.error('   ❌ Error creating indexes:', indexError.message);
    } else {
      console.log('   ✅ Indexes created');
    }

    console.log('\n🎉 Authentication setup completed successfully!');
    console.log('\n✅ You can now try creating an employee account again.');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

fixAuthentication();

