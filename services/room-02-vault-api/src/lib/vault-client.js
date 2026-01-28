const Vault = require('node-vault');

/**
 * Vault Client - Handles all HashiCorp Vault operations
 * Provides methods to read, write, update, and delete secrets
 */
class VaultClient {
  constructor(options = {}) {
    this.addr = options.addr || 'http://room-02-tresor-vault:8200';
    this.token = options.token;
    this.logger = options.logger;
    this.timeout = options.timeout || 30000;

    if (!this.token) {
      throw new Error('VAULT_TOKEN is required');
    }

    // Initialize Vault client
    this.client = new Vault({
      endpoint: this.addr,
      token: this.token,
      timeout: this.timeout
    });
  }

  /**
   * Health check - Verify Vault is accessible
   */
  async healthCheck() {
    try {
      const result = await this.client.status();
      this.logger?.info('Vault health check passed', {
        sealed: result.sealed,
        version: result.version
      });
      return {
        status: 'healthy',
        sealed: result.sealed,
        version: result.version,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Vault health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get secret by path
   * @param {string} path - Secret path in Vault (e.g., 'secret/postgres/main')
   */
  async getSecret(path) {
    try {
      if (!path) {
        throw new Error('Path is required');
      }

      const secret = await this.client.read(path);
      this.logger?.debug(`Retrieved secret from ${path}`);
      return secret;
    } catch (error) {
      this.logger?.error(`Failed to get secret from ${path}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get secrets by path (list operation)
   * @param {string} path - Base path to list secrets
   */
  async getSecretsByPath(path) {
    try {
      if (!path) {
        throw new Error('Path is required');
      }

      const secret = await this.client.read(path);
      this.logger?.debug(`Retrieved secrets from ${path}`);
      return secret;
    } catch (error) {
      this.logger?.error(`Failed to get secrets from ${path}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create or update secret
   * @param {string} path - Secret path
   * @param {object} data - Secret data (key-value pairs)
   */
  async setSecret(path, data) {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Valid path is required');
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Data object is required');
      }

      const result = await this.client.write(path, {
        data: data
      });

      this.logger?.info(`Secret created/updated at ${path}`, {
        path,
        keys: Object.keys(data)
      });
      return result;
    } catch (error) {
      this.logger?.error(`Failed to set secret at ${path}`, {
        error: error.message,
        path
      });
      throw error;
    }
  }

  /**
   * Delete secret
   * @param {string} path - Secret path to delete
   */
  async deleteSecret(path) {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Valid path is required');
      }

      const result = await this.client.delete(path);
      this.logger?.info(`Secret deleted from ${path}`, { path });
      return result;
    } catch (error) {
      this.logger?.error(`Failed to delete secret at ${path}`, {
        error: error.message,
        path
      });
      throw error;
    }
  }

  /**
   * List secrets at path
   * @param {string} path - Path to list
   */
  async listSecrets(path) {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Valid path is required');
      }

      const result = await this.client.list(path);
      this.logger?.debug(`Listed secrets at ${path}`, {
        count: result.data.keys?.length || 0
      });
      return result;
    } catch (error) {
      this.logger?.error(`Failed to list secrets at ${path}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all secrets recursively from a base path
   * @param {string} basePath - Base path to start from
   */
  async getAllSecrets(basePath = 'secret/') {
    try {
      const secrets = {};
      await this._listSecretsRecursive(basePath, secrets);
      return secrets;
    } catch (error) {
      this.logger?.error('Failed to get all secrets', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Recursive helper to list all secrets
   * @private
   */
  async _listSecretsRecursive(path, result) {
    try {
      const list = await this.listSecrets(path);
      
      if (list.data.keys) {
        for (const key of list.data.keys) {
          const fullPath = path + key;
          
          if (key.endsWith('/')) {
            // It's a directory, recurse
            result[key] = {};
            await this._listSecretsRecursive(fullPath, result[key]);
          } else {
            // It's a secret, read it
            const secret = await this.getSecret(fullPath);
            result[key] = secret.data.data || {};
          }
        }
      }
    } catch (error) {
      this.logger?.warn(`Could not list path ${path}`, {
        error: error.message
      });
    }
  }

  /**
   * Generate dynamic secret (e.g., database credentials)
   * @param {string} path - Dynamic secret path
   * @param {string} roleName - Role name for generation
   */
  async generateDynamicSecret(path, roleName) {
    try {
      const result = await this.client.read(`${path}/creds/${roleName}`);
      this.logger?.info('Generated dynamic secret', {
        path,
        roleName
      });
      return result;
    } catch (error) {
      this.logger?.error('Failed to generate dynamic secret', {
        error: error.message,
        path,
        roleName
      });
      throw error;
    }
  }

  /**
   * Check if secret exists
   * @param {string} path - Secret path
   */
  async secretExists(path) {
    try {
      await this.getSecret(path);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Validate secret structure for specific use case
   * @param {string} path - Secret path
   * @param {array} requiredKeys - Required keys in secret
   */
  async validateSecret(path, requiredKeys = []) {
    try {
      const secret = await this.getSecret(path);
      const data = secret.data.data || {};

      if (requiredKeys.length > 0) {
        const missing = requiredKeys.filter(key => !(key in data));
        if (missing.length > 0) {
          throw new Error(`Missing required keys: ${missing.join(', ')}`);
        }
      }

      return {
        valid: true,
        keys: Object.keys(data),
        requiredKeys,
        allPresent: requiredKeys.every(key => key in data)
      };
    } catch (error) {
      this.logger?.error('Secret validation failed', {
        error: error.message,
        path
      });
      throw error;
    }
  }

  /**
   * Rotate secret (create new version)
   * @param {string} path - Secret path
   * @param {object} newData - New secret data
   */
  async rotateSecret(path, newData) {
    try {
      const oldSecret = await this.getSecret(path);
      await this.setSecret(path, newData);
      
      this.logger?.info('Secret rotated', {
        path,
        timestamp: new Date().toISOString()
      });

      return {
        rotated: true,
        path,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to rotate secret', {
        error: error.message,
        path
      });
      throw error;
    }
  }
}

module.exports = { VaultClient };
