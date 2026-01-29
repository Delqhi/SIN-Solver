/**
 * Logger Utility
 * Provides consistent timestamped logging across all API endpoints
 */

const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace('T', ' ').slice(0, 19);
};

export const logger = {
  error: (component, message) => {
    console.error(`[${getTimestamp()}] [ERROR] [${component}] ${message}`);
  },

  warn: (component, message) => {
    console.warn(`[${getTimestamp()}] [WARN] [${component}] ${message}`);
  },

  info: (component, message) => {
    console.log(`[${getTimestamp()}] [INFO] [${component}] ${message}`);
  },

  debug: (component, message) => {
    console.log(`[${getTimestamp()}] [DEBUG] [${component}] ${message}`);
  }
};
