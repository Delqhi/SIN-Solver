/**
 * Error Handler Utility
 * Provides standardized error response formats for all API endpoints
 * 
 * Usage:
 *   return res.status(400).json(errorHandler.badRequest('Invalid input'));
 *   return res.status(404).json(errorHandler.notFound('User not found'));
 *   return res.status(401).json(errorHandler.unauthorized('Invalid token'));
 *   return res.status(405).json(errorHandler.methodNotAllowed('POST not allowed'));
 *   return res.status(500).json(errorHandler.internal('Database error'));
 */

export const errorHandler = {
  /**
   * Bad Request (400)
   * Used for validation errors, malformed requests, missing required fields
   */
  badRequest: (message) => ({
    error: message,
    code: 'BAD_REQUEST',
    timestamp: new Date().toISOString()
  }),

  /**
   * Not Found (404)
   * Used when resource doesn't exist
   */
  notFound: (message) => ({
    error: message,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  }),

  /**
   * Unauthorized (401)
   * Used for authentication failures
   */
  unauthorized: (message) => ({
    error: message,
    code: 'UNAUTHORIZED',
    timestamp: new Date().toISOString()
  }),

  /**
   * Internal Server Error (500)
   * Used for unexpected server errors, exceptions, crashes
   */
  internal: (message) => ({
    error: message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  }),

  /**
   * Method Not Allowed (405)
   * Used when HTTP method (GET/POST/PUT/DELETE) is not supported
   */
  methodNotAllowed: (message) => ({
    error: message,
    code: 'METHOD_NOT_ALLOWED',
    timestamp: new Date().toISOString()
  })
};
