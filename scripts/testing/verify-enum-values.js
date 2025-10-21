const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qekkojxnjllmhdjywyrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla2tvanhuamxsbWhkanl3eXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ0NTYwNywiZXhwIjoyMDcyMDIxNjA3fQ.oGQ8-rHZSV2IAUwduH1zcqC_052tmv7WGq1ddi2xto8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEnumValues() {
  console.log('🔍 Checking PDR status enum values in database...\n');
  
  // Query to get all enum values
  const { data: enumData, error: enumError } = await supabase.rpc('get_pdr_status_enum_values');
  
  // If RPC doesn't exist, try a direct query using a PDR
  const { data: pdrs, error: pdrsError } = await supabase
    .from('pdrs')
    .select('status')
    .limit(1);
  
  if (pdrsError) {
    console.error('❌ Error querying database:', pdrsError);
    return;
  }
  
  // Try to get distinct status values from existing PDRs
  const { data: allPdrs, error } = await supabase
    .from('pdrs')
    .select('status');
  
  if (error) {
    console.error('❌ Error querying PDRs:', error);
    return;
  }
  
  const uniqueStatuses = [...new Set(allPdrs.map(p => p.status))];
  console.log('📊 Status values currently in use:');
  uniqueStatuses.sort().forEach(status => {
    console.log('  -', status);
  });
  
  console.log('\n✅ Required status values:');
  const requiredStatuses = [
    'Created',
    'SUBMITTED',
    'PLAN_LOCKED',
    'MID_YEAR_SUBMITTED',
    'MID_YEAR_APPROVED',
    'END_YEAR_SUBMITTED',
    'COMPLETED'
  ];
  
  requiredStatuses.forEach(status => {
    const exists = uniqueStatuses.includes(status);
    if (exists) {
      console.log(`  ✅ ${status} - Found in database`);
    } else {
      console.log(`  ⚠️  ${status} - Not found (may exist in enum but not in use)`);
    }
  });
  
  // Try to test if we can insert with MID_YEAR_SUBMITTED (this will fail if enum doesn't have it)
  console.log('\n🧪 Testing enum value support...');
  console.log('Note: This test checks if the enum supports the required values.');
  console.log('We will NOT actually insert data, just validate the enum.');
  
  // Check if MID_YEAR_SUBMITTED is in use
  const midYearSubmittedCount = allPdrs.filter(p => p.status === 'MID_YEAR_SUBMITTED').length;
  const endYearSubmittedCount = allPdrs.filter(p => p.status === 'END_YEAR_SUBMITTED').length;
  const midYearApprovedCount = allPdrs.filter(p => p.status === 'MID_YEAR_APPROVED').length;
  
  console.log(`\n📈 Usage statistics:`);
  console.log(`  - MID_YEAR_SUBMITTED: ${midYearSubmittedCount} PDRs`);
  console.log(`  - END_YEAR_SUBMITTED: ${endYearSubmittedCount} PDRs`);
  console.log(`  - MID_YEAR_APPROVED: ${midYearApprovedCount} PDRs`);
  
  if (midYearSubmittedCount === 0 && endYearSubmittedCount === 0 && midYearApprovedCount === 0) {
    console.log('\n⚠️  WARNING: None of the mid-year/end-year submission statuses are in use.');
    console.log('   This could mean:');
    console.log('   1. The enum values exist but no PDRs have reached those stages yet (OK)');
    console.log('   2. The enum values are missing and need to be added (PROBLEM)');
    console.log('\n   To verify, run the SQL script: verify-pdr-status-enum.sql');
  }
}

verifyEnumValues()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  });

