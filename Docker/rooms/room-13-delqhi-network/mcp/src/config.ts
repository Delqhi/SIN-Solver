import dotenv from 'dotenv';
dotenv.config();

export const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://room-13-delqhi-api:3000',
  apiToken: process.env.API_TOKEN || '',
};
