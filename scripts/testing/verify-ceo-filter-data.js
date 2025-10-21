const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qekkojxnjllmhdjywyrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla2tvanhuamxsbWhkanl3eXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ0NTYwNywiZXhwIjoyMDcyMDIxNjA3fQ.oGQ8-rHZSV2IAUwduH1zcqC_052tmv7WGq1ddi2xto8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCEOFilterData() {
  console.log('🔍 Verifying CEO Dashboard Filter Data...\n');
  
  // Get PDRs that should appear in CEO dashboard filters
  const { data: allPDRs, error: allError } = await supabase
    .from('pdrs')
    .select(`
      id,
      status,
      user_id,
      submitted_at,
      updated_at,
      user:profiles!pdrs_user_id_fkey(first_name, last_name, email, role)
    `)
    .order('updated_at', { ascending: false });
  
  if (allError) {
    console.error('❌ Error querying PDRs:', allError);
    return;
  }
  
  console.log('📊 All PDRs grouped by status:\n');
  
  const statusGroups = {};
  allPDRs.forEach(pdr => {
    if (!statusGroups[pdr.status]) {
      statusGroups[pdr.status] = [];
    }
    statusGroups[pdr.status].push(pdr);
  });
  
  // Count by filter category
  const goalSettingCount = allPDRs.filter(p => p.status === 'SUBMITTED').length;
  const midYearCount = allPDRs.filter(p => p.status === 'MID_YEAR_SUBMITTED').length;
  const yearEndCount = allPDRs.filter(p => p.status === 'END_YEAR_SUBMITTED').length;
  const calibrationCount = allPDRs.filter(p => p.status === 'COMPLETED').length;
  
  console.log('🎯 CEO Dashboard Filter Counts:');
  console.log(`  📝 Goal Setting (SUBMITTED): ${goalSettingCount}`);
  console.log(`  📅 Mid Year Checkin (MID_YEAR_SUBMITTED): ${midYearCount}`);
  console.log(`  📊 Year End Review (END_YEAR_SUBMITTED): ${yearEndCount}`);
  console.log(`  📈 Calibration (COMPLETED): ${calibrationCount}`);
  console.log(`  🔒 Closed (COMPLETED): ${calibrationCount}`);
  
  console.log('\n📋 PDRs by Status:');
  Object.keys(statusGroups).sort().forEach(status => {
    const pdrs = statusGroups[status];
    console.log(`\n  ${status} (${pdrs.length} PDRs):`);
    pdrs.forEach(pdr => {
      const employee = pdr.user;
      const name = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
      const email = employee ? employee.email : 'N/A';
      console.log(`    - ${name} (${email})`);
      console.log(`      PDR ID: ${pdr.id}`);
      console.log(`      Updated: ${new Date(pdr.updated_at).toLocaleString()}`);
    });
  });
  
  if (midYearCount > 0) {
    console.log('\n✅ SUCCESS! Mid-year reviews are now visible to CEO');
    console.log('   The CEO dashboard "Mid Year Checkin" tab will show these PDRs.');
  } else {
    console.log('\n⚠️  No PDRs in MID_YEAR_SUBMITTED status');
    console.log('   This could mean:');
    console.log('   1. No employees have submitted mid-year reviews yet');
    console.log('   2. The status update failed (check API logs)');
  }
  
  // Get specific PDR that we just updated
  const { data: updatedPDR, error: updatedError } = await supabase
    .from('pdrs')
    .select(`
      *,
      user:profiles!pdrs_user_id_fkey(first_name, last_name, email),
      mid_year_review:mid_year_reviews(*)
    `)
    .eq('id', '17650396-6a77-491b-813d-865e9ae147c5')
    .single();
  
  if (!updatedError && updatedPDR) {
    console.log('\n🎯 Verified PDR Details:');
    console.log(`   Employee: ${updatedPDR.user.first_name} ${updatedPDR.user.last_name}`);
    console.log(`   Status: ${updatedPDR.status}`);
    console.log(`   Current Step: ${updatedPDR.current_step}`);
    console.log(`   Is Locked: ${updatedPDR.is_locked}`);
    
    const midYear = Array.isArray(updatedPDR.mid_year_review) 
      ? updatedPDR.mid_year_review[0] 
      : updatedPDR.mid_year_review;
      
    if (midYear) {
      console.log(`   Mid-Year Review: YES`);
      console.log(`   Progress Summary: ${midYear.progress_summary?.substring(0, 50)}...`);
    }
    
    console.log('\n✅ This PDR should now appear in CEO Dashboard → Mid Year Checkin tab');
  }
}

verifyCEOFilterData()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  });

