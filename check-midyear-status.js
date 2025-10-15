const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qekkojxnjllmhdjywyrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla2tvanhuamxsbWhkanl3eXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ0NTYwNywiZXhwIjoyMDcyMDIxNjA3fQ.oGQ8-rHZSV2IAUwduH1zcqC_052tmv7WGq1ddi2xto8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMidYearPDRs() {
  console.log('🔍 Checking for recently updated PDRs...\n');
  
  // Get all PDRs sorted by most recently updated
  const { data: pdrs, error } = await supabase
    .from('pdrs')
    .select('id, user_id, status, current_step, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching PDRs:', error);
    return;
  }
  
  console.log('Recent PDRs:');
  console.table(pdrs);
  
  // Check for mid-year related PDRs
  const midYearPDRs = pdrs.filter(p => p.status.includes('MID') || p.status === 'PLAN_LOCKED');
  console.log('\n🎯 Mid-year related PDRs:');
  console.table(midYearPDRs);
  
  // Get profile info for all users
  if (pdrs.length > 0) {
    const recentPDR = pdrs[0];
    console.log('\n📋 Most Recent PDR (ID: ' + recentPDR.id + '):');
    console.log('Status:', recentPDR.status);
    console.log('Updated At:', recentPDR.updated_at);
    
    const { data: fullPDR, error: fullError } = await supabase
      .from('pdrs')
      .select('*, mid_year_review:mid_year_reviews(*), user:profiles!pdrs_user_id_fkey(first_name, last_name, email, role)')
      .eq('id', recentPDR.id)
      .single();
    
    if (!fullError) {
      console.log('\nEmployee:', fullPDR.user?.first_name, fullPDR.user?.last_name, '(' + fullPDR.user?.role + ')');
      console.log('Mid-Year Review:', fullPDR.mid_year_review ? 'EXISTS' : 'NONE');
      if (fullPDR.mid_year_review) {
        console.log('Mid-Year Review Details:', {
          id: fullPDR.mid_year_review.id,
          progress_summary: fullPDR.mid_year_review.progress_summary?.substring(0, 50) + '...',
          submitted_at: fullPDR.mid_year_review.submitted_at,
          updated_at: fullPDR.mid_year_review.updated_at
        });
      }
    } else {
      console.error('Error fetching full PDR:', fullError);
    }
  }
}

checkMidYearPDRs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

