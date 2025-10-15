const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qekkojxnjllmhdjywyrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla2tvanhuamxsbWhkanl3eXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ0NTYwNywiZXhwIjoyMDcyMDIxNjA3fQ.oGQ8-rHZSV2IAUwduH1zcqC_052tmv7WGq1ddi2xto8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEnumAndUpdate() {
  console.log('🔍 Testing PDR status enum and update capability...\n');
  
  // Find a PDR with PLAN_LOCKED status that has a mid-year review
  const { data: pdrs, error: pdrsError } = await supabase
    .from('pdrs')
    .select(`
      id,
      user_id,
      status,
      is_locked,
      current_step,
      mid_year_review:mid_year_reviews(id, progress_summary, submitted_at)
    `)
    .eq('status', 'PLAN_LOCKED')
    .not('mid_year_review', 'is', null)
    .limit(1);
  
  if (pdrsError) {
    console.error('❌ Error querying PDRs:', pdrsError);
    return;
  }
  
  if (!pdrs || pdrs.length === 0) {
    console.log('⚠️  No PDRs found with status PLAN_LOCKED that have a mid-year review');
    console.log('   This is expected if the employee has not yet submitted their mid-year review.');
    return;
  }
  
  const pdr = pdrs[0];
  const midYearReview = Array.isArray(pdr.mid_year_review) ? pdr.mid_year_review[0] : pdr.mid_year_review;
  
  console.log('📋 Found PDR that needs status update:');
  console.log('   PDR ID:', pdr.id);
  console.log('   Current Status:', pdr.status);
  console.log('   Is Locked:', pdr.is_locked);
  console.log('   Current Step:', pdr.current_step);
  console.log('   Mid-Year Review ID:', midYearReview?.id);
  console.log('   Mid-Year Submitted:', midYearReview?.submitted_at || 'Not set');
  
  console.log('\n🧪 Testing if we can update to MID_YEAR_SUBMITTED...');
  
  // Try to update the status (using service role, so RLS is bypassed)
  const { data: updatedPdr, error: updateError } = await supabase
    .from('pdrs')
    .update({
      status: 'MID_YEAR_SUBMITTED',
      current_step: 5,
    })
    .eq('id', pdr.id)
    .select('id, status, current_step');
  
  if (updateError) {
    console.error('❌ Update failed:', updateError);
    console.log('\n🔧 This likely means the enum value MID_YEAR_SUBMITTED does not exist.');
    console.log('   You need to run the migration: pdr-status-enum-migration-final.sql');
    return;
  }
  
  console.log('✅ Update successful!');
  console.log('   New Status:', updatedPdr[0].status);
  console.log('   New Current Step:', updatedPdr[0].current_step);
  
  console.log('\n🎯 Result: The PDR is now ready to appear in the CEO mid-year filter!');
  console.log('   CEO Dashboard → Mid Year Checkin tab should show this PDR.');
  
  // Get the employee info
  const { data: employee, error: employeeError } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', pdr.user_id)
    .single();
  
  if (!employeeError && employee) {
    console.log(`\n👤 Employee: ${employee.first_name} ${employee.last_name} (${employee.email})`);
  }
}

testEnumAndUpdate()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  });

