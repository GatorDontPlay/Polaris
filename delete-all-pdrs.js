const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qekkojxnjllmhdjywyrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla2tvanhuamxsbWhkanl3eXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ0NTYwNywiZXhwIjoyMDcyMDIxNjA3fQ.oGQ8-rHZSV2IAUwduH1zcqC_052tmv7WGq1ddi2xto8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllPDRs() {
  console.log('🗑️  Starting PDR deletion process...\n');
  
  // First, get count of all PDRs
  const { count, error: countError } = await supabase
    .from('pdrs')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error counting PDRs:', countError);
    return;
  }
  
  console.log(`Found ${count} PDRs to delete\n`);
  
  if (count === 0) {
    console.log('✅ No PDRs to delete!');
    return;
  }
  
  // Delete related data first (due to foreign key constraints)
  console.log('🔄 Deleting related data...');
  
  // Delete mid-year reviews
  const { error: midYearError } = await supabase
    .from('mid_year_reviews')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (midYearError) {
    console.log('⚠️  Mid-year reviews deletion:', midYearError.message);
  } else {
    console.log('✅ Mid-year reviews deleted');
  }
  
  // Delete end-year reviews
  const { error: endYearError } = await supabase
    .from('end_year_reviews')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (endYearError) {
    console.log('⚠️  End-year reviews deletion:', endYearError.message);
  } else {
    console.log('✅ End-year reviews deleted');
  }
  
  // Delete behavior entries
  const { error: behaviorEntriesError } = await supabase
    .from('behavior_entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (behaviorEntriesError) {
    console.log('⚠️  Behavior entries deletion:', behaviorEntriesError.message);
  } else {
    console.log('✅ Behavior entries deleted');
  }
  
  // Delete behaviors
  const { error: behaviorsError } = await supabase
    .from('behaviors')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (behaviorsError) {
    console.log('⚠️  Behaviors deletion:', behaviorsError.message);
  } else {
    console.log('✅ Behaviors deleted');
  }
  
  // Delete goals
  const { error: goalsError } = await supabase
    .from('goals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (goalsError) {
    console.log('⚠️  Goals deletion:', goalsError.message);
  } else {
    console.log('✅ Goals deleted');
  }
  
  // Delete audit logs related to PDRs
  const { error: auditError } = await supabase
    .from('audit_logs')
    .delete()
    .in('table_name', ['pdrs', 'goals', 'behaviors', 'behavior_entries', 'mid_year_reviews', 'end_year_reviews']);
  
  if (auditError) {
    console.log('⚠️  Audit logs deletion:', auditError.message);
  } else {
    console.log('✅ Audit logs deleted');
  }
  
  console.log('\n🔄 Deleting PDRs...');
  
  // Finally, delete all PDRs
  const { error: pdrsError } = await supabase
    .from('pdrs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (pdrsError) {
    console.error('❌ Error deleting PDRs:', pdrsError);
    return;
  }
  
  console.log('✅ All PDRs deleted successfully!\n');
  
  // Verify deletion
  const { count: finalCount } = await supabase
    .from('pdrs')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Final count: ${finalCount} PDRs remaining`);
  
  if (finalCount === 0) {
    console.log('\n🎉 Database successfully cleaned!');
  } else {
    console.log('\n⚠️  Some PDRs may still remain');
  }
}

deleteAllPDRs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

