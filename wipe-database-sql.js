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

async function sqlWipeDatabaseData() {
  console.log('🗑️  SQL-based database wipe (faster method)');
  console.log('📊 This uses TRUNCATE CASCADE to quickly clear all data');
  console.log('');
  
  try {
    // Method: TRUNCATE CASCADE (fastest, but requires direct SQL access)
    const wipeSql = `
      -- Disable triggers temporarily for faster deletion
      SET session_replication_role = replica;
      
      -- Truncate all tables with CASCADE to handle foreign keys
      TRUNCATE TABLE 
        audit_logs,
        end_year_reviews,
        mid_year_reviews, 
        behavior_entries,
        behaviors,
        goals,
        notifications,
        pdrs,
        pdr_periods,
        company_values,
        profiles
      RESTART IDENTITY CASCADE;
      
      -- Re-enable triggers
      SET session_replication_role = DEFAULT;
      
      -- Insert fresh seed data
      INSERT INTO company_values (name, description, sort_order, is_active) VALUES
      ('Innovation', 'We embrace creativity and continuously seek new ways to improve and grow.', 1, true),
      ('Integrity', 'We act with honesty, transparency, and ethical behavior in all our interactions.', 2, true),
      ('Collaboration', 'We work together effectively, sharing knowledge and supporting each other.', 3, true),
      ('Excellence', 'We strive for the highest quality in everything we do and continuously improve.', 4, true),
      ('Customer Focus', 'We put our customers at the center of everything we do and exceed their expectations.', 5, true);
      
      INSERT INTO pdr_periods (name, start_date, end_date, is_active) VALUES
      ('FY2024-2025', '2024-07-01', '2025-06-30', true);
    `;
    
    console.log('⏳ Executing SQL wipe...');
    
    try {
      await supabase.rpc('query', { sql: wipeSql });
      console.log('✅ SQL wipe completed successfully!');
      
      console.log('\n🎉 Database reset complete!');
      console.log('   - All tables truncated');
      console.log('   - Identity sequences reset');
      console.log('   - Fresh seed data inserted');
      console.log('   - Ready for new data');
      
    } catch (sqlError) {
      console.log('❌ SQL wipe failed:', sqlError.message);
      console.log('\n💡 Trying alternative approach...');
      
      // Fallback: Individual table truncation
      const tables = [
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
        'profiles'
      ];
      
      console.log('🗑️  Truncating tables individually...');
      
      for (const table of tables) {
        try {
          await supabase.rpc('query', { 
            sql: `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;` 
          });
          console.log(`✅ Truncated: ${table}`);
        } catch (e) {
          console.log(`⚠️  Could not truncate ${table}:`, e.message);
          
          // Try simple DELETE as last resort
          try {
            await supabase.rpc('query', { sql: `DELETE FROM ${table};` });
            console.log(`✅ Deleted all from: ${table}`);
          } catch (deleteError) {
            console.log(`❌ Failed to clear ${table}:`, deleteError.message);
          }
        }
      }
      
      // Insert seed data
      console.log('\n🌱 Inserting seed data...');
      try {
        await supabase.rpc('query', {
          sql: `
            INSERT INTO company_values (name, description, sort_order, is_active) VALUES
            ('Innovation', 'We embrace creativity and continuously seek new ways to improve and grow.', 1, true),
            ('Integrity', 'We act with honesty, transparency, and ethical behavior in all our interactions.', 2, true),
            ('Collaboration', 'We work together effectively, sharing knowledge and supporting each other.', 3, true),
            ('Excellence', 'We strive for the highest quality in everything we do and continuously improve.', 4, true),
            ('Customer Focus', 'We put our customers at the center of everything we do and exceed their expectations.', 5, true);
            
            INSERT INTO pdr_periods (name, start_date, end_date, is_active) VALUES
            ('FY2024-2025', '2024-07-01', '2025-06-30', true);
          `
        });
        console.log('✅ Seed data inserted');
      } catch (seedError) {
        console.log('⚠️  Seed data insertion failed:', seedError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: SQL-based database wipe!');
console.log('');
console.log('This will PERMANENTLY DELETE ALL DATA using SQL TRUNCATE');
console.log('This is FASTER but more dangerous than the row-by-row method');
console.log('');
console.log('Are you sure? Run with: node wipe-database-sql.js --confirm');

if (process.argv.includes('--confirm')) {
  sqlWipeDatabaseData().catch(console.error);
} else {
  console.log('');
  console.log('💡 To proceed, run: node wipe-database-sql.js --confirm');
  console.log('💡 For safer row-by-row deletion, use: node wipe-database-data.js --confirm');
}
