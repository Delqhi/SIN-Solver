import { errorHandler } from '../utils/errorHandler.js';
import { validateInput } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

export default function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // 2. Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Log incoming request
  logger.info('CHAT_MESSAGE', `Incoming ${req.method} request`);

  // 4. Validate HTTP method
  if (req.method !== 'POST') {
    const errorResponse = errorHandler.methodNotAllowed(`Method ${req.method} not allowed`);
    res.status(405).json(errorResponse);
    return;
  }

  // 5. Validate input fields
  const validation = validateInput(req.body, ['user_id', 'message']);
  if (!validation.valid) {
    const errorResponse = errorHandler.badRequest(`Validation failed: ${validation.errors.join(', ')}`);
    res.status(400).json(errorResponse);
    logger.error('CHAT_MESSAGE', `Validation failed: ${validation.errors.join(', ')}`);
    return;
  }

  // 6. Business logic / generate mock data
  const { user_id, message } = req.body;
  const messageData = {
    message_id: `msg-${Date.now()}`,
    user_id: user_id,
    message: message,
    status: 'sent',
    sent_at: new Date().toISOString()
  };

  logger.info('CHAT_MESSAGE', 'Message sent successfully');

  // 7. Success response
  res.status(200).json({
    success: true,
    data: messageData,
    timestamp: new Date().toISOString()
  });

  // 8. Error handling
  try {
    // All error handling above in validation
  } catch (error) {
    const errorResponse = errorHandler.internal('Internal server error');
    res.status(500).json(errorResponse);
    logger.error('CHAT_MESSAGE', error.message);
  }
}
