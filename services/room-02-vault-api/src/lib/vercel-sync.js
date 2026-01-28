const axios = require('axios');

/**
 * Vercel Sync - Synchronizes secrets from Vault to Vercel environment variables
 */
class VercelSync {
  constructor(options = {}) {
    this.token = options.token;
    this.projectId = options.projectId;
    this.logger = options.logger;
    this.apiUrl = 'https://api.vercel.com';
    this.vercelClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!this.token || !this.projectId) {
      this.logger?.warn('Vercel sync disabled - missing VERCEL_TOKEN or VERCEL_PROJECT_ID');
      this.enabled = false;
    } else {
      this.enabled = true;
    }
  }

  /**
   * Get Vercel project status
   */
  async getStatus() {
    try {
      if (!this.enabled) {
        return { status: 'disabled', reason: 'Missing credentials' };
      }

      const response = await this.vercelClient.get(`/v8/projects/${this.projectId}`);
      return {
        status: 'connected',
        projectId: this.projectId,
        projectName: response.data.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Vercel status check failed', {
        error: error.message
      });
      return {
        status: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Sync secret to Vercel as environment variable
   * @param {string} name - Environment variable name
   * @param {string} value - Environment variable value
   * @param {array} environments - Target environments (production, preview, development)
   */
  async syncSecret(name, value, environments = ['production', 'preview', 'development']) {
    try {
      if (!this.enabled) {
        throw new Error('Vercel sync is not enabled');
      }

      if (!name || typeof name !== 'string') {
        throw new Error('Valid secret name is required');
      }
      if (!value || typeof value !== 'string') {
        throw new Error('Valid secret value is required');
      }

      const results = [];

      for (const env of environments) {
        try {
          const response = await this.vercelClient.post(
            `/v10/projects/${this.projectId}/env`,
            {
              key: name,
              value: value,
              target: [env],
              type: 'encrypted'
            }
          );

          results.push({
            environment: env,
            success: true,
            id: response.data.id
          });

          this.logger?.info(`Synced ${name} to Vercel/${env}`, {
            name,
            environment: env
          });
        } catch (envError) {
          this.logger?.warn(`Failed to sync ${name} to Vercel/${env}`, {
            error: envError.message
          });
          results.push({
            environment: env,
            success: false,
            error: envError.message
          });
        }
      }

      return {
        secret: name,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to sync secret to Vercel', {
        error: error.message,
        name
      });
      throw error;
    }
  }

  /**
   * Sync multiple secrets at once
   * @param {object} secrets - Object with secret key-value pairs
   * @param {array} environments - Target environments
   */
  async syncSecrets(secrets, environments = ['production', 'preview', 'development']) {
    try {
      if (!this.enabled) {
        throw new Error('Vercel sync is not enabled');
      }

      if (!secrets || typeof secrets !== 'object') {
        throw new Error('Secrets object is required');
      }

      const results = [];

      for (const [name, value] of Object.entries(secrets)) {
        try {
          const result = await this.syncSecret(name, value, environments);
          results.push({
            secret: name,
            success: true,
            details: result
          });
        } catch (error) {
          this.logger?.error(`Failed to sync secret ${name}`, {
            error: error.message
          });
          results.push({
            secret: name,
            success: false,
            error: error.message
          });
        }
      }

      return {
        total: Object.keys(secrets).length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to sync secrets to Vercel', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all environment variables from Vercel project
   */
  async getEnvironmentVariables() {
    try {
      if (!this.enabled) {
        throw new Error('Vercel sync is not enabled');
      }

      const response = await this.vercelClient.get(
        `/v10/projects/${this.projectId}/env`
      );

      const envVars = response.data.envs || [];
      this.logger?.debug(`Retrieved ${envVars.length} environment variables from Vercel`);

      return {
        total: envVars.length,
        variables: envVars.map(env => ({
          id: env.id,
          key: env.key,
          targets: env.target || []
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to get environment variables from Vercel', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete environment variable from Vercel
   * @param {string} envVarId - ID of the environment variable to delete
   */
  async deleteEnvironmentVariable(envVarId) {
    try {
      if (!this.enabled) {
        throw new Error('Vercel sync is not enabled');
      }

      if (!envVarId || typeof envVarId !== 'string') {
        throw new Error('Valid environment variable ID is required');
      }

      await this.vercelClient.delete(
        `/v10/projects/${this.projectId}/env/${envVarId}`
      );

      this.logger?.info(`Deleted environment variable ${envVarId}`, {
        envVarId
      });

      return {
        deleted: true,
        envVarId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to delete environment variable', {
        error: error.message,
        envVarId
      });
      throw error;
    }
  }

  /**
   * Update existing environment variable
   * @param {string} envVarId - ID of the environment variable
   * @param {string} value - New value
   * @param {array} environments - Target environments
   */
  async updateEnvironmentVariable(envVarId, value, environments = ['production', 'preview', 'development']) {
    try {
      if (!this.enabled) {
        throw new Error('Vercel sync is not enabled');
      }

      const response = await this.vercelClient.patch(
        `/v10/projects/${this.projectId}/env/${envVarId}`,
        {
          value: value,
          target: environments,
          type: 'encrypted'
        }
      );

      this.logger?.info(`Updated environment variable ${envVarId}`, {
        envVarId
      });

      return {
        updated: true,
        envVarId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to update environment variable', {
        error: error.message,
        envVarId
      });
      throw error;
    }
  }
}

module.exports = { VercelSync };
