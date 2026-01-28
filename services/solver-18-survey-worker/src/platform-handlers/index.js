/**
 * Platform Handlers Index
 * Routes to platform-specific handlers for survey automation
 * 
 * CRITICAL: One worker per platform (ban prevention)
 * Each platform has unique login, survey detection, and completion logic
 */

const swagbucks = require('./swagbucks');
const prolific = require('./prolific');
const mturk = require('./mturk');
const clickworker = require('./clickworker');
const appen = require('./appen');
const toluna = require('./toluna');
const lifepoints = require('./lifepoints');
const yougov = require('./yougov');

const handlers = {
  swagbucks,
  prolific,
  mturk,
  clickworker,
  appen,
  toluna,
  lifepoints,
  yougov
};

/**
 * Get handler for a specific platform
 * @param {string} platformId - Platform identifier
 * @returns {object|null} Platform handler or null if not found
 */
function getHandler(platformId) {
  return handlers[platformId] || null;
}

/**
 * Get list of all supported platforms
 * @returns {string[]} Array of platform IDs
 */
function getSupportedPlatforms() {
  return Object.keys(handlers);
}

/**
 * Check if a platform is supported
 * @param {string} platformId - Platform identifier
 * @returns {boolean}
 */
function isPlatformSupported(platformId) {
  return platformId in handlers;
}

/**
 * Get platform metadata (name, type, rewards, etc.)
 * @param {string} platformId - Platform identifier
 * @returns {object|null} Platform metadata
 */
function getPlatformInfo(platformId) {
  const handler = handlers[platformId];
  if (!handler) return null;
  
  return {
    id: platformId,
    name: handler.PLATFORM_INFO?.name || platformId,
    url: handler.PLATFORM_INFO?.url || null,
    type: handler.PLATFORM_INFO?.type || 'survey',
    rewardType: handler.PLATFORM_INFO?.rewardType || 'points',
    minPayout: handler.PLATFORM_INFO?.minPayout || null,
    loginRequired: handler.PLATFORM_INFO?.loginRequired !== false,
    captchaExpected: handler.PLATFORM_INFO?.captchaExpected || false
  };
}

/**
 * Get all platforms info
 * @returns {object[]} Array of platform info objects
 */
function getAllPlatformsInfo() {
  return Object.keys(handlers).map(id => getPlatformInfo(id));
}

module.exports = { 
  getHandler, 
  handlers,
  getSupportedPlatforms,
  isPlatformSupported,
  getPlatformInfo,
  getAllPlatformsInfo
};
