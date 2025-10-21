import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

/**
 * Batch save behavior ratings for end-year review
 * POST /api/pdrs/[id]/save-behavior-ratings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🎯 Batch Behavior Ratings: Starting batch save for PDR:', params.id);
    
    const authResult = await authenticateRequest(request);
    if (!authResult.success) return authResult.response;
    
    const { user } = authResult;
    const pdrId = params.id;
    
    // Parse request body
    const body = await request.json();
    const { behaviorRatings } = body;
    
    if (!behaviorRatings || typeof behaviorRatings !== 'object') {
      return createApiError('Invalid request body - behaviorRatings required', 400, 'INVALID_BODY');
    }
    
    const behaviorIds = Object.keys(behaviorRatings);
    console.log('📦 Batch Behavior Ratings: Received ratings for behaviors:', behaviorIds);
    
    const supabase = await createClient();
    
    // Verify PDR access and get all behaviors for this PDR
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select('id, user_id, status, behaviors(id)')
      .eq('id', pdrId)
      .single();
      
    if (pdrError || !pdr) {
      console.error('❌ Batch Behavior Ratings: PDR not found:', pdrError);
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }
    
    // Check access permissions
    if (pdr.user_id !== user.id && user.role !== 'CEO') {
      console.error('❌ Batch Behavior Ratings: Access denied for user:', user.id);
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }
    
    // Validate all behavior IDs belong to this PDR
    const pdrBehaviorIds = pdr.behaviors.map((b: any) => b.id);
    const invalidBehaviors = behaviorIds.filter(id => !pdrBehaviorIds.includes(id));
    
    if (invalidBehaviors.length > 0) {
      console.error('❌ Batch Behavior Ratings: Invalid behavior IDs:', invalidBehaviors);
      return createApiError(
        `Invalid behavior IDs: ${invalidBehaviors.join(', ')}`,
        400,
        'INVALID_BEHAVIOR_IDS'
      );
    }
    
    console.log('✅ Batch Behavior Ratings: All behavior IDs validated');
    
    // Save all behavior ratings in parallel
    const updatePromises = behaviorIds.map((behaviorId) => {
      const data = behaviorRatings[behaviorId];
      return supabase
        .from('behaviors')
        .update({
          employee_rating: data.rating,
          examples: data.examples,
          updated_at: new Date().toISOString()
        })
        .eq('id', behaviorId)
        .select('id, value_id, employee_rating, examples');
    });
    
    console.log('💾 Batch Behavior Ratings: Saving updates in parallel...');
    const results = await Promise.all(updatePromises);
    
    // Check for failures
    const failures = results.filter(r => r.error);
    if (failures.length > 0) {
      console.error('❌ Batch Behavior Ratings: Failed to update some behaviors:', failures.map(f => f.error));
      return createApiError(
        `Failed to update ${failures.length} behavior(s)`,
        500,
        'PARTIAL_UPDATE_FAILURE'
      );
    }
    
    // Collect successfully updated behaviors
    const updatedBehaviors = results
      .map(r => r.data)
      .flat()
      .filter(Boolean);
    
    console.log(`✅ Batch Behavior Ratings: Successfully updated ${updatedBehaviors.length} behaviors:`,
      updatedBehaviors.map(b => ({ id: b.id, valueId: b.value_id, rating: b.employee_rating }))
    );
    
    return createApiResponse({
      success: true,
      updatedCount: updatedBehaviors.length,
      behaviors: updatedBehaviors
    });
    
  } catch (error) {
    console.error('❌ Batch Behavior Ratings: Unexpected error:', error);
    return handleApiError(error);
  }
}

