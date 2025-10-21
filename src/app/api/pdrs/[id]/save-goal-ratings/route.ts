import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

/**
 * Batch save goal ratings for end-year review
 * POST /api/pdrs/[id]/save-goal-ratings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🎯 Batch Goal Ratings: Starting batch save for PDR:', params.id);
    
    const authResult = await authenticateRequest(request);
    if (!authResult.success) return authResult.response;
    
    const { user } = authResult;
    const pdrId = params.id;
    
    // Parse request body
    const body = await request.json();
    const { goalRatings } = body;
    
    if (!goalRatings || typeof goalRatings !== 'object') {
      return createApiError('Invalid request body - goalRatings required', 400, 'INVALID_BODY');
    }
    
    const goalIds = Object.keys(goalRatings);
    console.log('📦 Batch Goal Ratings: Received ratings for goals:', goalIds);
    
    const supabase = await createClient();
    
    // Verify PDR access and get all goals for this PDR
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select('id, user_id, status, goals(id)')
      .eq('id', pdrId)
      .single();
      
    if (pdrError || !pdr) {
      console.error('❌ Batch Goal Ratings: PDR not found:', pdrError);
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }
    
    // Check access permissions
    if (pdr.user_id !== user.id && user.role !== 'CEO') {
      console.error('❌ Batch Goal Ratings: Access denied for user:', user.id);
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }
    
    // Validate all goal IDs belong to this PDR
    const pdrGoalIds = pdr.goals.map((g: any) => g.id);
    const invalidGoals = goalIds.filter(id => !pdrGoalIds.includes(id));
    
    if (invalidGoals.length > 0) {
      console.error('❌ Batch Goal Ratings: Invalid goal IDs:', invalidGoals);
      return createApiError(
        `Invalid goal IDs: ${invalidGoals.join(', ')}`,
        400,
        'INVALID_GOAL_IDS'
      );
    }
    
    console.log('✅ Batch Goal Ratings: All goal IDs validated');
    
    // Save all goal ratings in parallel
    const updatePromises = goalIds.map((goalId) => {
      const data = goalRatings[goalId];
      return supabase
        .from('goals')
        .update({
          employee_rating: data.rating,
          employee_progress: data.progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select('id, title, employee_rating, employee_progress');
    });
    
    console.log('💾 Batch Goal Ratings: Saving updates in parallel...');
    const results = await Promise.all(updatePromises);
    
    // Check for failures
    const failures = results.filter(r => r.error);
    if (failures.length > 0) {
      console.error('❌ Batch Goal Ratings: Failed to update some goals:', failures.map(f => f.error));
      return createApiError(
        `Failed to update ${failures.length} goal(s)`,
        500,
        'PARTIAL_UPDATE_FAILURE'
      );
    }
    
    // Collect successfully updated goals
    const updatedGoals = results
      .map(r => r.data)
      .flat()
      .filter(Boolean);
    
    console.log(`✅ Batch Goal Ratings: Successfully updated ${updatedGoals.length} goals:`,
      updatedGoals.map(g => ({ id: g.id, title: g.title, rating: g.employee_rating }))
    );
    
    return createApiResponse({
      success: true,
      updatedCount: updatedGoals.length,
      goals: updatedGoals
    });
    
  } catch (error) {
    console.error('❌ Batch Goal Ratings: Unexpected error:', error);
    return handleApiError(error);
  }
}

