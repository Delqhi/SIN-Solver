import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'room-03-archiv-postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'sin_admin',
    password: process.env.DB_PASSWORD || 'sin-solver-2026',
    database: process.env.DB_NAME || 'sin_solver',
  },

  redis: {
    host: process.env.REDIS_HOST || 'room-04-memory-redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  meilisearch: {
    host: process.env.MEILISEARCH_HOST || 'http://room-13-delqhi-search:7700',
    apiKey: process.env.MEILISEARCH_MASTER_KEY || '',
  },
} as const;
