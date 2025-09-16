#!/usr/bin/env node

/**
 * DEBUG SUPABASE CONNECTION
 * Test direct connection to Supabase to see if we can fetch company values
 */

const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
    console.log('🔍 DEBUG: Testing Supabase Connection');
    console.log('=====================================');
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('❌ Missing required environment variables!');
        return;
    }
    
    // Create Supabase client
    console.log('\n🔗 Creating Supabase client...');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    try {
        // Test basic connection
        console.log('\n🏥 Testing basic connection...');
        const { data: tables, error: tablesError } = await supabase
            .from('company_values')
            .select('count', { count: 'exact', head: true });
            
        if (tablesError) {
            console.log('❌ Connection failed:', tablesError.message);
            return;
        }
        
        console.log('✅ Connection successful!');
        console.log('📊 Total company_values count:', tables);
        
        // Test the exact query the API uses
        console.log('\n📋 Testing API query...');
        const { data: values, error } = await supabase
            .from('company_values')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
            
        if (error) {
            console.log('❌ Query failed:', error.message);
            console.log('Error details:', error);
            return;
        }
        
        console.log('✅ Query successful!');
        console.log('📊 Active company values found:', values?.length || 0);
        
        if (values && values.length > 0) {
            console.log('\n📋 Company Values:');
            values.forEach((value, index) => {
                console.log(`${index + 1}. ${value.name} (${value.sort_order})`);
                console.log(`   ${value.description}`);
                console.log(`   Active: ${value.is_active}, Created: ${value.created_at}`);
                console.log('');
            });
        } else {
            console.log('⚠️  No active company values found!');
            
            // Check if there are any company values at all
            console.log('\n🔍 Checking for any company values (including inactive)...');
            const { data: allValues, error: allError } = await supabase
                .from('company_values')
                .select('*')
                .order('sort_order', { ascending: true });
                
            if (allError) {
                console.log('❌ Query failed:', allError.message);
            } else {
                console.log('📊 Total company values (all):', allValues?.length || 0);
                if (allValues && allValues.length > 0) {
                    console.log('\n📋 All Company Values:');
                    allValues.forEach((value, index) => {
                        console.log(`${index + 1}. ${value.name} (sort: ${value.sort_order}, active: ${value.is_active})`);
                    });
                }
            }
        }
        
    } catch (error) {
        console.log('💥 Unexpected error:', error.message);
        console.log('Error details:', error);
    }
}

testSupabaseConnection().catch(console.error);
