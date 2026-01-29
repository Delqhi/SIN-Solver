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
    logger.info('CAPTCHA_STATUS', `[${req.method}] ${req.url}`);

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
        status: 'online',
        workers: 5,
        active_jobs: 2,
        queue_length: 12
      },
      timestamp: new Date().toISOString()
    };

    // 6. Success response
    logger.info('CAPTCHA_STATUS', '[SUCCESS] 200 OK');
    return res.status(200).json(result);

  } catch (error) {
    // 7. Error handling
    logger.error('CAPTCHA_STATUS', error.message);
    return res.status(500).json(
      errorHandler.internal('Internal server error')
    );
  }
}
