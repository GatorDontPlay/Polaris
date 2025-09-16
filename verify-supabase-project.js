#!/usr/bin/env node

/**
 * VERIFY SUPABASE PROJECT CONNECTION
 * Check if the app is connected to the correct Supabase project
 */

const fs = require('fs');
const path = require('path');

function checkSupabaseProject() {
    console.log('🔍 VERIFYING SUPABASE PROJECT CONNECTION');
    console.log('=========================================');
    
    // Expected project ID from the URL you shared
    const expectedProjectId = 'qekkojxnjllmhdjywyrv';
    console.log('Expected Project ID (from your SQL editor):', expectedProjectId);
    
    // Check .env.local file
    const envLocalPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envLocalPath)) {
        console.log('\n📁 Reading .env.local file...');
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        
        // Extract Supabase URL
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
        if (urlMatch) {
            const supabaseUrl = urlMatch[1].trim().replace(/["']/g, '');
            console.log('Found Supabase URL:', supabaseUrl);
            
            // Extract project ID from URL
            const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
            if (projectIdMatch) {
                const actualProjectId = projectIdMatch[1];
                console.log('Actual Project ID (from .env.local):', actualProjectId);
                
                if (actualProjectId === expectedProjectId) {
                    console.log('✅ PROJECT MATCH! Your app is connected to the correct Supabase project.');
                    console.log('   The issue must be something else.');
                } else {
                    console.log('❌ PROJECT MISMATCH!');
                    console.log('   Expected:', expectedProjectId);
                    console.log('   Actual:  ', actualProjectId);
                    console.log('\n🔧 SOLUTION: Update your .env.local file:');
                    console.log(`   NEXT_PUBLIC_SUPABASE_URL=https://${expectedProjectId}.supabase.co`);
                }
            } else {
                console.log('❌ Could not extract project ID from URL');
            }
        } else {
            console.log('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
        }
        
        // Check for anon key
        const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
        if (anonKeyMatch) {
            console.log('✅ Anon key found in .env.local');
        } else {
            console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
        }
        
    } else {
        console.log('❌ .env.local file not found!');
        console.log('   Create .env.local with:');
        console.log(`   NEXT_PUBLIC_SUPABASE_URL=https://${expectedProjectId}.supabase.co`);
        console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    }
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. If project IDs match: The company values should work');
    console.log('2. If project IDs differ: Update .env.local to use the correct project');
    console.log('3. Restart your dev server after any .env.local changes');
}

checkSupabaseProject();
