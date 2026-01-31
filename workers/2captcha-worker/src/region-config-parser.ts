/**
 * Region Configuration Parser
 * 
 * Parses Browserless multi-region configuration from environment variables.
 * Provides a standardized interface for configuring region-aware connections.
 * 
 * Part of Task 157 - Multi-region Browserless support
 * 
 * Environment Variables:
 *   BROWSERLESS_ENABLE_REGIONS=true|false
 *   BROWSERLESS_REGIONS=name:url:weight,name:url:weight
 *   BROWSERLESS_LATENCY_CHECK_INTERVAL=30000
 *   BROWSERLESS_UNHEALTHY_THRESHOLD=5000
 *   BROWSERLESS_FAILURE_THRESHOLD=3
 */

import { Region, RegionManagerOptions } from './browserless-region-manager';
import { createCategoryLogger, LogCategory } from './logger';

const logger = createCategoryLogger(LogCategory.STARTUP);

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Complete region configuration including enabled state, regions, and options
 */
export interface RegionConfig {
  /** Whether multi-region support is enabled */
  enabled: boolean;
  /** Array of configured regions */
  regions: Region[];
  /** RegionManager configuration options */
  options: Partial<RegionManagerOptions>;
}

/**
 * Parsed region entry from environment string
 */
interface ParsedRegionEntry {
  name: string;
  endpoint: string;
  weight: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LATENCY_CHECK_INTERVAL = 30000; // 30 seconds
const DEFAULT_UNHEALTHY_THRESHOLD = 5000; // 5 seconds
const DEFAULT_FAILURE_THRESHOLD = 3; // 3 consecutive failures

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Parses a region string in the format "name:url:weight"
 * 
 * @param regionStr - Region string to parse (e.g., "us-east:ws://localhost:9223:100")
 * @returns Parsed region entry or null if invalid
 */
function parseRegionEntry(regionStr: string): ParsedRegionEntry | null {
  const trimmed = regionStr.trim();
  if (!trimmed) return null;

  // Format: name:url:weight (weight is optional, defaults to 100)
  const parts = trimmed.split(':');
  
  if (parts.length < 3) {
    logger.warn(`Invalid region format (expected name:protocol:host[:port][:weight]): "${regionStr}"`);
    return null;
  }

  // Handle URL reconstruction: name:protocol:host[:port][:weight]
  // Example: "local:ws://localhost:9223:100" -> ["local", "ws", "//localhost", "9223", "100"]
  const name = parts[0];
  const protocol = parts[1];
  
  // Reconstruct the URL
  let urlParts: string[] = [];
  let weightIndex = -1;
  
  // Find where the weight is (last numeric-only part)
  for (let i = parts.length - 1; i >= 2; i--) {
    const part = parts[i];
    if (/^\d+$/.test(part) && parseInt(part, 10) <= 1000) {
      // This could be a weight (0-1000) or a port (typically > 1000)
      // If it's <= 1000, treat it as weight if it's the last part
      if (i === parts.length - 1) {
        weightIndex = i;
        break;
      }
    }
  }

  // If weight found, URL is everything except name and weight
  if (weightIndex > 2) {
    urlParts = parts.slice(1, weightIndex);
  } else {
    urlParts = parts.slice(1);
  }

  const endpoint = urlParts.join(':');
  const weight = weightIndex > 0 ? parseInt(parts[weightIndex], 10) : 100;

  // Validate endpoint format
  if (!endpoint.startsWith('ws://') && !endpoint.startsWith('wss://') && 
      !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    logger.warn(`Invalid endpoint protocol for region "${name}": "${endpoint}"`);
    return null;
  }

  return { name, endpoint, weight };
}

/**
 * Parses the BROWSERLESS_REGIONS environment variable
 * 
 * Format: "name:url:weight,name:url:weight,..."
 * Example: "local:ws://localhost:9223:100,backup:ws://backup:9223:50"
 * 
 * @param envValue - Raw environment variable value
 * @returns Array of Region objects
 */
export function parseRegionsFromEnv(envValue: string): Region[] {
  if (!envValue || !envValue.trim()) {
    return [];
  }

  const regions: Region[] = [];
  const regionStrings = envValue.split(',');

  for (const regionStr of regionStrings) {
    const parsed = parseRegionEntry(regionStr);
    if (parsed) {
      // Generate ID from name (lowercase, hyphenated)
      const id = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      regions.push({
        id,
        name: parsed.name,
        endpoint: parsed.endpoint,
      });

      logger.debug(`Parsed region: ${parsed.name} (${id})`, {
        endpoint: parsed.endpoint,
        weight: parsed.weight,
      });
    }
  }

  if (regions.length > 0) {
    logger.info(`Parsed ${regions.length} regions from environment`);
  }

  return regions;
}

/**
 * Gets the complete region configuration from environment variables
 * 
 * @returns RegionConfig object with enabled state, regions, and options
 */
export function getRegionConfig(): RegionConfig {
  const enabled = process.env.BROWSERLESS_ENABLE_REGIONS === 'true';
  const regionsEnv = process.env.BROWSERLESS_REGIONS || '';
  
  const regions = enabled ? parseRegionsFromEnv(regionsEnv) : [];

  // Parse options with defaults
  const latencyCheckInterval = parseInt(
    process.env.BROWSERLESS_LATENCY_CHECK_INTERVAL || String(DEFAULT_LATENCY_CHECK_INTERVAL),
    10
  );
  const unhealthyThreshold = parseInt(
    process.env.BROWSERLESS_UNHEALTHY_THRESHOLD || String(DEFAULT_UNHEALTHY_THRESHOLD),
    10
  );
  const failureThreshold = parseInt(
    process.env.BROWSERLESS_FAILURE_THRESHOLD || String(DEFAULT_FAILURE_THRESHOLD),
    10
  );

  const config: RegionConfig = {
    enabled: enabled && regions.length > 0,
    regions,
    options: {
      healthCheckTimeout: unhealthyThreshold,
      maxConsecutiveFailures: failureThreshold,
      updateIntervalMs: latencyCheckInterval,
      useWebSocket: true, // Always use WebSocket for CDP endpoints
    },
  };

  logger.info('Region configuration loaded', {
    enabled: config.enabled,
    regionCount: regions.length,
    latencyCheckInterval,
    unhealthyThreshold,
    failureThreshold,
  });

  return config;
}

/**
 * Validates region configuration and logs any issues
 * 
 * @param config - Region configuration to validate
 * @returns true if valid, false otherwise
 */
export function validateRegionConfig(config: RegionConfig): boolean {
  if (!config.enabled) {
    logger.debug('Region manager is disabled');
    return true; // Disabled is a valid state
  }

  if (config.regions.length === 0) {
    logger.warn('Region manager enabled but no regions configured');
    return false;
  }

  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const region of config.regions) {
    if (ids.has(region.id)) {
      logger.error(`Duplicate region ID: ${region.id}`);
      return false;
    }
    ids.add(region.id);
  }

  // Validate endpoints
  for (const region of config.regions) {
    try {
      new URL(region.endpoint);
    } catch {
      logger.error(`Invalid endpoint URL for region ${region.id}: ${region.endpoint}`);
      return false;
    }
  }

  logger.info(`Region configuration valid: ${config.regions.length} regions`);
  return true;
}

/**
 * Creates a human-readable summary of the region configuration
 * 
 * @param config - Region configuration
 * @returns Summary string
 */
export function getRegionConfigSummary(config: RegionConfig): string {
  if (!config.enabled) {
    return 'Region Manager: DISABLED';
  }

  const regionList = config.regions
    .map(r => `  - ${r.name} (${r.id}): ${r.endpoint}`)
    .join('\n');

  return `Region Manager: ENABLED
Regions (${config.regions.length}):
${regionList}
Options:
  - Health Check Timeout: ${config.options.healthCheckTimeout}ms
  - Max Consecutive Failures: ${config.options.maxConsecutiveFailures}
  - Update Interval: ${config.options.updateIntervalMs}ms`;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  parseRegionsFromEnv,
  getRegionConfig,
  validateRegionConfig,
  getRegionConfigSummary,
};
