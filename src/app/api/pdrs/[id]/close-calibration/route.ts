import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const pdrId = params.id;

    // Only CEOs can close calibration
    if (user.role !== 'CEO') {
      return createApiError('Only CEOs can close calibration', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const supabase = await createClient();

    // Get PDR and verify it's completed
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select('*')
      .eq('id', pdrId)
      .single();

    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }

    // Check if PDR is completed
    if (pdr.status !== 'COMPLETED') {
      return createApiError(
        `PDR must be COMPLETED to close calibration. Current status: ${pdr.status}`,
        400,
        'INVALID_STATUS'
      );
    }

    // Check if already calibrated
    if (pdr.calibrated_at) {
      return createApiError(
        'Calibration has already been closed for this PDR',
        400,
        'ALREADY_CALIBRATED'
      );
    }

    // Mark PDR as calibrated
    const { data: updatedPdr, error: updateError } = await supabase
      .from('pdrs')
      .update({
        calibrated_at: new Date().toISOString(),
        calibrated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdrId)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
        calibrated_by_user:profiles!pdrs_calibrated_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit log
    await createAuditLog({
      tableName: 'pdrs',
      recordId: pdrId,
      action: 'UPDATE',
      oldValues: { calibrated_at: null, calibrated_by: null },
      newValues: { calibrated_at: updatedPdr.calibrated_at, calibrated_by: updatedPdr.calibrated_by },
      userId: user.id,
      ipAddress: request.ip || 'Unknown',
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    return createApiResponse({
      pdr: updatedPdr,
      message: 'Calibration closed successfully. PDR moved to Closed status.',
    });

  } catch (error) {
    return handleApiError(error);
  }
}

