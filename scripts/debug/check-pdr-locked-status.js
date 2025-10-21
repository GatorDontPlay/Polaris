const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qekkojxnjllmhdjywyrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla2tvanhuamxsbWhkanl3eXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ0NTYwNywiZXhwIjoyMDcyMDIxNjA3fQ.oGQ8-rHZSV2IAUwduH1zcqC_052tmv7WGq1ddi2xto8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPDRLockedStatus() {
  console.log('🔍 Checking PDR locked status and mid-year review...\n');
  
  const pdrId = '00d091df-461b-47a5-a55c-e46d48fe155a';
  
  const { data: pdr, error } = await supabase
    .from('pdrs')
    .select('id, user_id, status, is_locked, locked_at, locked_by, mid_year_review:mid_year_reviews(*)')
    .eq('id', pdrId)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('PDR Details:');
  console.log('  ID:', pdr.id);
  console.log('  Status:', pdr.status);
  console.log('  Is Locked:', pdr.is_locked);
  console.log('  Locked At:', pdr.locked_at);
  console.log('  Locked By:', pdr.locked_by);
  console.log('\nMid-Year Review:');
  if (pdr.mid_year_review) {
    console.log('  Exists: YES');
    console.log('  ID:', pdr.mid_year_review.id);
    console.log('  Submitted At:', pdr.mid_year_review.submitted_at);
    console.log('  Progress Summary:', pdr.mid_year_review.progress_summary?.substring(0, 50));
  } else {
    console.log('  Exists: NO');
  }
  
  console.log('\n❌ ISSUE IDENTIFIED:');
  console.log('The PDR is locked (is_locked = true) which prevents the employee');
  console.log('from updating the status from PLAN_LOCKED to MID_YEAR_SUBMITTED.');
  console.log('The mid-year review was created, but the PDR status was not updated.');
  console.log('\n✅ SOLUTION:');
  console.log('The CEO dashboard should check for PDRs with:');
  console.log('  - status = PLAN_LOCKED');
  console.log('  - AND mid_year_review exists (submitted)');
  console.log('This would correctly identify PDRs awaiting mid-year CEO review.');
}

checkPDRLockedStatus().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

