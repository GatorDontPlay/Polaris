import { createApiResponse, handleApiError } from '@/lib/api-helpers';
import { checkDatabaseConnection } from '@/lib/db';

export async function GET() {
  try {
    const dbHealth = await checkDatabaseConnection();
    
    const health = {
      status: 'healthy',
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
