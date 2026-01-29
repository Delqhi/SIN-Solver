import { errorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // 2. Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 3. Log incoming request
    logger.info('WORKFLOW_ACTIVE', `[${req.method}] ${req.url}`);

    // 4. Validate HTTP method
    if (req.method !== 'GET') {
      return res.status(405).json(
        errorHandler.methodNotAllowed(`Method ${req.method} not allowed`)
      );
    }

    // 5. Business logic - MOCK DATA ONLY
    const result = {
      success: true,
      data: {
        active_workflows: [
          {
            workflow_id: `wf-${Date.now() - 200000}`,
            task_type: 'captcha_solving',
            status: 'in_progress',
            progress: 65,
            assigned_to: 'worker-1'
          },
          {
            workflow_id: `wf-${Date.now() - 300000}`,
            task_type: 'data_entry',
            status: 'in_progress',
            progress: 40,
            assigned_to: 'worker-2'
          }
        ],
        total_active: 2,
        total_completed_today: 15
      },
      timestamp: new Date().toISOString()
    };

    // 6. Success response
    logger.info('WORKFLOW_ACTIVE', '[SUCCESS] 200 OK');
    return res.status(200).json(result);

  } catch (error) {
    // 7. Error handling
    logger.error('WORKFLOW_ACTIVE', error.message);
    return res.status(500).json(
      errorHandler.internal('Internal server error')
    );
  }
}
