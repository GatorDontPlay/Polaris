import { createApiResponse, handleApiError } from '@/lib/api-helpers';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Check Supabase database connection using service role
    const startTime = Date.now();
    let dbHealth = { success: false, latency: 0, error: null };
    
    try {
      // Use service role key for health check to bypass RLS
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - startTime;
      
      if (error) {
        dbHealth = { success: false, latency, error: error.message };
      } else {
        dbHealth = { success: true, latency, error: null };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      dbHealth = { success: false, latency, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    const health = {
      status: dbHealth.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbHealth.success,
        latency: dbHealth.latency,
        error: dbHealth.error,
      },
      uptime: process.uptime(),
    };

    const status = dbHealth.success ? 200 : 503;
    
    return createApiResponse(health, status);
  } catch (error) {
    return handleApiError(error);
  }
}
