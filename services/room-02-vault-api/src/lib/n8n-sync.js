const axios = require('axios');

/**
 * N8n Sync - Synchronizes secrets from Vault to n8n credentials and environment variables
 */
class N8nSync {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://agent-01-n8n-orchestrator:5678';
    this.apiKey = options.apiKey;
    this.logger = options.logger;

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!this.apiKey) {
      this.logger?.warn('n8n sync disabled - missing N8N_API_KEY');
      this.enabled = false;
    } else {
      this.enabled = true;
    }
  }

  /**
   * Get n8n API status
   */
  async getStatus() {
    try {
      if (!this.enabled) {
        return { status: 'disabled', reason: 'Missing API key' };
      }

      const response = await this.client.get('/api/v1/me');
      return {
        status: 'connected',
        user: response.data.user.email,
        url: this.apiUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('n8n status check failed', {
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
   * Create or update n8n credential
   * @param {string} type - Credential type (e.g., 'postgres', 'http', 'smtp')
   * @param {string} name - Credential name
   * @param {object} data - Credential data (connection details)
   */
  async syncCredential(type, name, data) {
    try {
      if (!this.enabled) {
        throw new Error('n8n sync is not enabled');
      }

      if (!type || !name || !data) {
        throw new Error('Type, name, and data are required');
      }

      // First try to find existing credential
      let credentialId = await this._findCredentialByName(name);

      if (credentialId) {
        // Update existing credential
        const response = await this.client.patch(
          `/api/v1/credentials/${credentialId}`,
          {
            name: name,
            type: type,
            data: data,
            nodesAccess: [
              {
                nodeType: '*',
                user: 'owner'
              }
            ]
          }
        );

        this.logger?.info(`Updated n8n credential: ${name}`, {
          credentialId,
          type,
          name
        });

        return {
          credentialId: response.data.id,
          name: response.data.name,
          type: response.data.type,
          action: 'updated'
        };
      } else {
        // Create new credential
        const response = await this.client.post(
          '/api/v1/credentials',
          {
            name: name,
            type: type,
            data: data,
            nodesAccess: [
              {
                nodeType: '*',
                user: 'owner'
              }
            ]
          }
        );

        this.logger?.info(`Created n8n credential: ${name}`, {
          credentialId: response.data.id,
          type,
          name
        });

        return {
          credentialId: response.data.id,
          name: response.data.name,
          type: response.data.type,
          action: 'created'
        };
      }
    } catch (error) {
      this.logger?.error('Failed to sync credential to n8n', {
        error: error.message,
        name,
        type
      });
      throw error;
    }
  }

  /**
   * Sync multiple credentials at once
   * @param {array} credentials - Array of {type, name, data} objects
   */
  async syncCredentials(credentials) {
    try {
      if (!this.enabled) {
        throw new Error('n8n sync is not enabled');
      }

      if (!Array.isArray(credentials)) {
        throw new Error('Credentials must be an array');
      }

      const results = [];

      for (const credential of credentials) {
        try {
          const result = await this.syncCredential(
            credential.type,
            credential.name,
            credential.data
          );
          results.push({
            name: credential.name,
            success: true,
            details: result
          });
        } catch (error) {
          this.logger?.error(`Failed to sync credential ${credential.name}`, {
            error: error.message
          });
          results.push({
            name: credential.name,
            success: false,
            error: error.message
          });
        }
      }

      return {
        total: credentials.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to sync credentials to n8n', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all credentials from n8n
   */
  async getCredentials() {
    try {
      if (!this.enabled) {
        throw new Error('n8n sync is not enabled');
      }

      const response = await this.client.get('/api/v1/credentials');
      const credentials = response.data || [];

      this.logger?.debug(`Retrieved ${credentials.length} credentials from n8n`);

      return {
        total: credentials.length,
        credentials: credentials.map(cred => ({
          id: cred.id,
          name: cred.name,
          type: cred.type,
          createdAt: cred.createdAt,
          updatedAt: cred.updatedAt
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to get credentials from n8n', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete credential from n8n
   * @param {string} credentialId - ID of the credential to delete
   */
  async deleteCredential(credentialId) {
    try {
      if (!this.enabled) {
        throw new Error('n8n sync is not enabled');
      }

      if (!credentialId || typeof credentialId !== 'string') {
        throw new Error('Valid credential ID is required');
      }

      await this.client.delete(`/api/v1/credentials/${credentialId}`);

      this.logger?.info(`Deleted n8n credential: ${credentialId}`, {
        credentialId
      });

      return {
        deleted: true,
        credentialId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to delete credential from n8n', {
        error: error.message,
        credentialId
      });
      throw error;
    }
  }

  /**
   * Execute workflow with secret parameters
   * @param {string} workflowId - n8n workflow ID
   * @param {object} parameters - Input parameters
   */
  async executeWorkflow(workflowId, parameters = {}) {
    try {
      if (!this.enabled) {
        throw new Error('n8n sync is not enabled');
      }

      const response = await this.client.post(
        `/api/v1/workflows/${workflowId}/execute`,
        {
          data: parameters
        }
      );

      this.logger?.info(`Executed n8n workflow: ${workflowId}`, {
        workflowId
      });

      return {
        workflowId,
        executionId: response.data.executionId,
        status: response.data.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to execute workflow', {
        error: error.message,
        workflowId
      });
      throw error;
    }
  }

  /**
   * Find credential by name
   * @private
   */
  async _findCredentialByName(name) {
    try {
      const response = await this.client.get('/api/v1/credentials');
      const credentials = response.data || [];
      const found = credentials.find(cred => cred.name === name);
      return found ? found.id : null;
    } catch (error) {
      this.logger?.warn(`Failed to find credential by name: ${name}`, {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Test credential connectivity
   * @param {string} credentialId - Credential ID to test
   */
  async testCredential(credentialId) {
    try {
      if (!this.enabled) {
        throw new Error('n8n sync is not enabled');
      }

      const response = await this.client.post(
        `/api/v1/credentials/${credentialId}/test`
      );

      return {
        credentialId,
        connected: response.data.success === true,
        message: response.data.message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger?.error('Failed to test credential', {
        error: error.message,
        credentialId
      });
      return {
        credentialId,
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = { N8nSync };
