/**
 * Zimmer-20 Website Worker - Source Modules
 * 
 * Exports all components for the website automation service
 */

const { WebsiteOrchestrator } = require('./orchestrator');
const { BrowserController } = require('./browser-controller');
const { CaptchaBridge } = require('./captcha-bridge');
const { NotificationHandler } = require('./notification-handler');
const { TaskQueue } = require('./task-queue');
const { 
  PLATFORMS, 
  getPlatformConfig, 
  getSupportedPlatforms,
  getPlatformsByType,
  getPlatformInfo,
  getAllPlatformsInfo
} = require('./platforms');

module.exports = {
  // Core orchestration
  WebsiteOrchestrator,
  
  // Browser automation
  BrowserController,
  
  // Captcha solving
  CaptchaBridge,
  
  // Notifications
  NotificationHandler,
  
  // Task management
  TaskQueue,
  
  // Platform configuration
  PLATFORMS,
  getPlatformConfig,
  getSupportedPlatforms,
  getPlatformsByType,
  getPlatformInfo,
  getAllPlatformsInfo
};
