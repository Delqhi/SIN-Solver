import { errorHandler } from '../../utils/errorHandler';
import { validateInput } from '../../utils/validators';
import { logger } from '../../utils/logger';

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
    logger.info('WORKFLOW_CORRECT', `[${req.method}] ${req.url}`);

    // 4. Validate HTTP method
    if (req.method !== 'POST') {
      return res.status(405).json(
        errorHandler.methodNotAllowed(`Method ${req.method} not allowed`)
      );
    }

    // 5. Validate input
    const validation = validateInput(req.body, ['feedback', 'rating']);
    if (!validation.valid) {
      return res.status(400).json(
        errorHandler.badRequest(`Validation failed: ${validation.errors.join(', ')}`)
      );
    }

    // 6. Business logic - MOCK DATA ONLY
    const { id } = req.query;
    const result = {
      success: true,
      data: {
        workflow_id: id,
        feedback_received: true,
        rating: req.body.rating,
        status: 'completed_with_feedback',
        processed_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // 7. Success response
    logger.info('WORKFLOW_CORRECT', '[SUCCESS] 200 OK');
    return res.status(200).json(result);

  } catch (error) {
    // 8. Error handling
    logger.error('WORKFLOW_CORRECT', error.message);
    return res.status(500).json(
      errorHandler.internal('Internal server error')
    );
  }
}
