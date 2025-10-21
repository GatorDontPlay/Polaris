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

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function wipeDatabaseData() {
  console.log('🗑️  WARNING: This will delete ALL data from the database!');
  console.log('📊 Structure (tables, columns, constraints) will be preserved');
  console.log('');
  
  try {
    // Get list of all tables to wipe
    const tablesToWipe = [
      // Delete in order that respects foreign key constraints
      // Child tables first, parent tables last
      'audit_logs',
      'end_year_reviews', 
      'mid_year_reviews',
      'behavior_entries',
      'behaviors',
      'goals',
      'notifications',
      'pdrs',
      'pdr_periods',
      'company_values',
      'profiles'  // Last because other tables reference it
    ];
    
    console.log('🔍 Checking which tables exist...');
    
    // Check which tables actually exist
    const existingTables = [];
    for (const table of tablesToWipe) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          existingTables.push({ name: table, count: data?.length || 0 });
          console.log(`📋 Found table: ${table} (${data?.length || 0} rows)`);
        } else {
          console.log(`⚠️  Table ${table} not found or inaccessible`);
        }
      } catch (e) {
        console.log(`⚠️  Table ${table} not found: ${e.message}`);
      }
    }
    
    if (existingTables.length === 0) {
      console.log('❌ No accessible tables found!');
      return;
    }
    
    console.log(`\n🗑️  About to delete data from ${existingTables.length} tables`);
    console.log('⏳ Starting deletion process...\n');
    
    // Method 1: Delete row by row (safer, respects RLS)
    let totalDeleted = 0;
    
    for (const table of existingTables) {
      console.log(`🗑️  Deleting from ${table.name}...`);
      
      try {
        // Get all IDs first
        const { data: records, error: fetchError } = await supabase
          .from(table.name)
          .select('id');
        
        if (fetchError) {
          console.log(`❌ Failed to fetch ${table.name} IDs:`, fetchError.message);
          continue;
        }
        
        if (!records || records.length === 0) {
          console.log(`✅ ${table.name} is already empty`);
          continue;
        }
        
        console.log(`   Found ${records.length} records to delete...`);
        
        // Delete in batches of 100
        const batchSize = 100;
        let deleted = 0;
        
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const ids = batch.map(r => r.id);
          
          const { error: deleteError } = await supabase
            .from(table.name)
            .delete()
            .in('id', ids);
          
          if (deleteError) {
            console.log(`❌ Error deleting batch from ${table.name}:`, deleteError.message);
            break;
          }
          
          deleted += batch.length;
          console.log(`   Deleted ${deleted}/${records.length} records...`);
        }
        
        totalDeleted += deleted;
        console.log(`✅ ${table.name} cleared (${deleted} records deleted)`);
        
      } catch (error) {
        console.log(`❌ Error processing ${table.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Data wipe complete!`);
    console.log(`📊 Total records deleted: ${totalDeleted}`);
    console.log(`📋 Table structures preserved`);
    
    // Option: Re-insert seed data
    console.log('\n🌱 Do you want to insert fresh seed data? (company values, etc.)');
    console.log('   This will add basic company values and a default PDR period');
    
    // Insert basic seed data
    console.log('\n🌱 Inserting fresh seed data...');
    
    // Insert company values
    try {
      const { error: valuesError } = await supabase
        .from('company_values')
        .insert([
          {
            name: 'Innovation',
            description: 'We embrace creativity and continuously seek new ways to improve and grow.',
            sort_order: 1,
            is_active: true
          },
          {
            name: 'Integrity', 
            description: 'We act with honesty, transparency, and ethical behavior in all our interactions.',
            sort_order: 2,
            is_active: true
          },
          {
            name: 'Collaboration',
            description: 'We work together effectively, sharing knowledge and supporting each other.',
            sort_order: 3,
            is_active: true
          },
          {
            name: 'Excellence',
            description: 'We strive for the highest quality in everything we do and continuously improve.',
            sort_order: 4,
            is_active: true
          },
          {
            name: 'Customer Focus',
            description: 'We put our customers at the center of everything we do and exceed their expectations.',
            sort_order: 5,
            is_active: true
          }
        ]);
      
      if (valuesError) {
        console.log('❌ Error inserting company values:', valuesError.message);
      } else {
        console.log('✅ Company values inserted');
      }
    } catch (e) {
      console.log('⚠️  Could not insert company values:', e.message);
    }
    
    // Insert default PDR period
    try {
      const { error: periodError } = await supabase
        .from('pdr_periods')
        .insert({
          name: 'FY2024-2025',
          start_date: '2024-07-01',
          end_date: '2025-06-30',
          is_active: true
        });
      
      if (periodError) {
        console.log('❌ Error inserting PDR period:', periodError.message);
      } else {
        console.log('✅ Default PDR period inserted');
      }
    } catch (e) {
      console.log('⚠️  Could not insert PDR period:', e.message);
    }
    
    console.log('\n🎯 Database reset complete!');
    console.log('   - All user data cleared');
    console.log('   - Table structure intact'); 
    console.log('   - Fresh seed data inserted');
    console.log('   - Ready for new users and PDRs');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This will permanently delete ALL DATA from your database!');
console.log('');
console.log('This includes:');
console.log('  • All user profiles');
console.log('  • All PDRs and reviews');  
console.log('  • All goals and behaviors');
console.log('  • All notifications');
console.log('  • All audit logs');
console.log('');
console.log('Table structure will be preserved.');
console.log('');
console.log('Are you sure? Run with: node wipe-database-data.js --confirm');

if (process.argv.includes('--confirm')) {
  wipeDatabaseData().catch(console.error);
} else {
  console.log('');
  console.log('💡 To proceed, run: node wipe-database-data.js --confirm');
}
