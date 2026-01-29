import { errorHandler } from '../utils/errorHandler.js';
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
  logger.info('CHAT_HISTORY', `Incoming ${req.method} request`);

  // 4. Validate HTTP method
  if (req.method !== 'GET') {
    const errorResponse = errorHandler.methodNotAllowed(`Method ${req.method} not allowed`);
    res.status(405).json(errorResponse);
    return;
  }

  // 5. Extract query parameters
  const { user_id, limit } = req.query;
  const msgLimit = limit ? parseInt(limit) : 50;
  const hasUserFilter = !!user_id;

  logger.info('CHAT_HISTORY', `Retrieved with limit: ${msgLimit}, user_filter: ${hasUserFilter}`);

  // 6. Business logic / generate mock data
  const messages = [
    {
      message_id: `msg-${Date.now()}`,
      user_id: user_id || 'user-12345',
      message: 'Hello, how can I help with this task?',
      status: 'delivered',
      sent_at: new Date().toISOString()
    },
    {
      message_id: `msg-${Date.now() - 60000}`,
      user_id: user_id || 'user-67890',
      message: 'I need assistance with task 5',
      status: 'delivered',
      sent_at: new Date(Date.now() - 60000).toISOString()
    }
  ];

  // 7. Success response and error handling
  res.status(200).json({
    success: true,
    data: {
      messages: messages.slice(0, msgLimit),
      total_messages: messages.length,
      limit_applied: msgLimit,
      user_filter_applied: hasUserFilter
    },
    timestamp: new Date().toISOString()
  });
}
