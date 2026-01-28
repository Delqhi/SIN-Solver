const express = require('express');

/**
 * Sync Routes
 * Trigger synchronization of secrets to external systems
 */
function createSyncRoutes(vaultClient, vercelSync, n8nSync, logger) {
  const router = express.Router();

  /**
   * POST /api/sync/vercel - Sync secrets to Vercel
   * Body:
   *   {
   *     "secrets": {
   *       "DATABASE_URL": "postgres://...",
   *       "API_KEY": "sk_live_..."
   *     },
   *     "environments": ["production", "preview", "development"]
   *   }
   */
  router.post('/vercel', async (req, res) => {
    try {
      const { secrets, environments } = req.body;

      if (!secrets || typeof secrets !== 'object' || Object.keys(secrets).length === 0) {
        return res.status(400).json({
          error: 'Secrets object with at least one secret is required'
        });
      }

      const targetEnvs = environments || ['production', 'preview', 'development'];

      const result = await vercelSync.syncSecrets(secrets, targetEnvs);

      logger.info('Synced secrets to Vercel', {
        secretCount: Object.keys(secrets).length,
        environments: targetEnvs
      });

      res.json({
        ...result,
        action: 'sync_vercel'
      });
    } catch (error) {
      logger.error('Failed to sync to Vercel', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to sync to Vercel',
        message: error.message
      });
    }
  });

  /**
   * POST /api/sync/n8n - Sync credentials to n8n
   * Body:
   *   {
   *     "credentials": [
   *       {
   *         "type": "postgres",
   *         "name": "main_database",
   *         "data": { "host": "...", "user": "...", "password": "..." }
   *       }
   *     ]
   *   }
   */
  router.post('/n8n', async (req, res) => {
    try {
      const { credentials } = req.body;

      if (!Array.isArray(credentials) || credentials.length === 0) {
        return res.status(400).json({
          error: 'Credentials array with at least one credential is required'
        });
      }

      const result = await n8nSync.syncCredentials(credentials);

      logger.info('Synced credentials to n8n', {
        credentialCount: credentials.length
      });

      res.json({
        ...result,
        action: 'sync_n8n'
      });
    } catch (error) {
      logger.error('Failed to sync to n8n', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to sync to n8n',
        message: error.message
      });
    }
  });

  /**
   * POST /api/sync/all - Sync secrets to all systems
   * Body:
   *   {
   *     "vaultPath": "secret/postgres",
   *     "vercel": { "enabled": true, "environments": ["production"] },
   *     "n8n": { "enabled": true, "credType": "postgres", "credName": "main_db" }
   *   }
   */
  router.post('/all', async (req, res) => {
    try {
      const { vaultPath, vercel, n8n } = req.body;

      if (!vaultPath || typeof vaultPath !== 'string') {
        return res.status(400).json({
          error: 'Vault path is required'
        });
      }

      // Fetch secret from Vault
      const vaultSecret = await vaultClient.getSecret(vaultPath);
      const secretData = vaultSecret.data.data || {};

      const results = {
        vault: { success: true, path: vaultPath },
        vercel: null,
        n8n: null
      };

      // Sync to Vercel
      if (vercel?.enabled) {
        try {
          const envs = vercel.environments || ['production', 'preview'];
          results.vercel = await vercelSync.syncSecrets(secretData, envs);
          logger.info('Synced to Vercel via all-sync', { vaultPath });
        } catch (vercelError) {
          logger.error('Failed to sync to Vercel in all-sync', {
            error: vercelError.message
          });
          results.vercel = { error: vercelError.message, success: false };
        }
      }

      // Sync to n8n
      if (n8n?.enabled) {
        try {
          const credType = n8n.credType || 'http';
          const credName = n8n.credName || `${vaultPath.split('/').pop()}-${Date.now()}`;
          results.n8n = await n8nSync.syncCredential(credType, credName, secretData);
          logger.info('Synced to n8n via all-sync', { vaultPath });
        } catch (n8nError) {
          logger.error('Failed to sync to n8n in all-sync', {
            error: n8nError.message
          });
          results.n8n = { error: n8nError.message, success: false };
        }
      }

      res.json({
        ...results,
        action: 'sync_all',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to sync to all systems', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to sync to all systems',
        message: error.message
      });
    }
  });

  /**
   * GET /api/sync/status - Get sync status for all integrations
   */
  router.get('/status', async (req, res) => {
    try {
      const statuses = await Promise.all([
        vercelSync.getStatus(),
        n8nSync.getStatus()
      ]);

      res.json({
        timestamp: new Date().toISOString(),
        integrations: {
          vercel: statuses[0],
          n8n: statuses[1]
        }
      });
    } catch (error) {
      logger.error('Failed to get sync status', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  /**
   * POST /api/sync/vercel-env/:envVar - Sync single env var to Vercel
   * Body:
   *   { "value": "...", "environments": ["production"] }
   */
  router.post('/vercel-env/:envVar', async (req, res) => {
    try {
      const { envVar } = req.params;
      const { value, environments } = req.body;

      if (!envVar) {
        return res.status(400).json({ error: 'Environment variable name is required' });
      }

      if (!value) {
        return res.status(400).json({ error: 'Value is required' });
      }

      const targetEnvs = environments || ['production', 'preview', 'development'];
      const result = await vercelSync.syncSecret(envVar, value, targetEnvs);

      logger.info('Synced single env var to Vercel', {
        envVar,
        environments: targetEnvs
      });

      res.json({
        ...result,
        action: 'sync_single_vercel_env'
      });
    } catch (error) {
      logger.error('Failed to sync env var to Vercel', {
        error: error.message,
        envVar: req.params.envVar
      });
      res.status(500).json({
        error: 'Failed to sync env var to Vercel',
        message: error.message
      });
    }
  });

  /**
   * POST /api/sync/n8n-credential - Create n8n credential from Vault secret
   * Body:
   *   {
   *     "vaultPath": "secret/postgres",
   *     "credentialType": "postgres",
   *     "credentialName": "main_database"
   *   }
   */
  router.post('/n8n-credential', async (req, res) => {
    try {
      const { vaultPath, credentialType, credentialName } = req.body;

      if (!vaultPath) {
        return res.status(400).json({ error: 'Vault path is required' });
      }

      if (!credentialType) {
        return res.status(400).json({ error: 'Credential type is required' });
      }

      const name = credentialName || `${vaultPath.split('/').pop()}-${Date.now()}`;

      // Get secret from Vault
      const secret = await vaultClient.getSecret(vaultPath);
      const secretData = secret.data.data || {};

      // Create credential in n8n
      const result = await n8nSync.syncCredential(credentialType, name, secretData);

      logger.info('Created n8n credential from Vault secret', {
        vaultPath,
        credentialType,
        credentialName: name
      });

      res.json({
        ...result,
        action: 'sync_n8n_credential_from_vault'
      });
    } catch (error) {
      logger.error('Failed to create n8n credential from Vault', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to create n8n credential from Vault',
        message: error.message
      });
    }
  });

  /**
   * POST /api/sync/n8n-test-credential - Test n8n credential connectivity
   * Body:
   *   { "credentialId": "..." }
   */
  router.post('/n8n-test-credential', async (req, res) => {
    try {
      const { credentialId } = req.body;

      if (!credentialId) {
        return res.status(400).json({ error: 'Credential ID is required' });
      }

      const result = await n8nSync.testCredential(credentialId);

      logger.info('Tested n8n credential', {
        credentialId,
        connected: result.connected
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to test n8n credential', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to test n8n credential',
        message: error.message
      });
    }
  });

  /**
   * GET /api/sync/n8n-credentials - List all n8n credentials
   */
  router.get('/n8n-credentials', async (req, res) => {
    try {
      const result = await n8nSync.getCredentials();

      res.json(result);
    } catch (error) {
      logger.error('Failed to get n8n credentials', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to get n8n credentials',
        message: error.message
      });
    }
  });

  /**
   * GET /api/sync/vercel-env-vars - List all Vercel environment variables
   */
  router.get('/vercel-env-vars', async (req, res) => {
    try {
      const result = await vercelSync.getEnvironmentVariables();

      res.json(result);
    } catch (error) {
      logger.error('Failed to get Vercel environment variables', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to get Vercel environment variables',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createSyncRoutes;
