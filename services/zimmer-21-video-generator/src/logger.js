/**
 * Zimmer-21: Logger
 * Winston-based structured logging
 */

const winston = require('winston');
const config = require('./config');

const logger = winston.createLogger({
  level: config.server.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'zimmer-21-video-generator' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1 
            ? JSON.stringify(meta, null, 2) 
            : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      )
    })
  ]
});

// Add file transport in production
if (config.server.env === 'production') {
  logger.add(new winston.transports.File({ 
    filename: '/app/logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: '/app/logs/combined.log' 
  }));
}

module.exports = logger;
