const express = require('express');
const Joi = require('joi');

/**
 * Secret Management Routes
 * GET, POST, DELETE secrets in Vault
 */
function createSecretRoutes(vaultClient, vercelSync, n8nSync, logger) {
  const router = express.Router();

  /**
   * GET /api/secrets - List all secret paths
   */
  router.get('/', async (req, res) => {
    try {
      const basePath = req.query.path || 'secret/';
      const secrets = await vaultClient.listSecrets(basePath);
      
      res.json({
        path: basePath,
        keys: secrets.data.keys || [],
        count: (secrets.data.keys || []).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to list secrets', {
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to list secrets',
        message: error.message
      });
    }
  });

  /**
   * GET /api/secrets/:path - Get specific secret
   * Query params:
   *   - validate: comma-separated list of required keys to validate
   */
  router.get('/:path(*)', async (req, res) => {
    try {
      const { path } = req.params;
      const { validate } = req.query;

      if (!path) {
        return res.status(400).json({
          error: 'Path is required'
        });
      }

      // Validate secret structure if requested
      let validation = null;
      if (validate) {
        const requiredKeys = validate.split(',');
        validation = await vaultClient.validateSecret(path, requiredKeys);
      }

      const secret = await vaultClient.getSecret(path);
      
      res.json({
        path,
        data: secret.data.data || {},
        validation,
        metadata: {
          renewalDuration: secret.lease_duration,
          lease: secret.lease_id,
          renewable: secret.renewable
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          error: 'Secret not found',
          path: req.params.path
        });
      }

      logger.error('Failed to get secret', {
        path: req.params.path,
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to get secret',
        message: error.message
      });
    }
  });

  /**
   * POST /api/secrets/:path - Create or update secret
   * Body:
   *   {
   *     "data": { "key1": "value1", "key2": "value2" },
   *     "sync": {
   *       "vercel": true,
   *       "vercelEnvs": ["production", "preview"],
   *       "n8n": true,
   *       "n8nCredType": "postgres"
   *     }
   *   }
   */
  router.post('/:path(*)', async (req, res) => {
    try {
      const { path } = req.params;
      const { data, sync } = req.body;

      // Validate input
      if (!path) {
        return res.status(400).json({
          error: 'Path is required'
        });
      }

      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return res.status(400).json({
          error: 'Data object with at least one key-value pair is required'
        });
      }

      // Create/update secret in Vault
      const vaultResult = await vaultClient.setSecret(path, data);

      const syncResults = {};
      const syncConfig = sync || {};

      // Sync to Vercel if requested
      if (syncConfig.vercel && data.VERCEL_TOKEN) {
        try {
          const vercelEnvs = syncConfig.vercelEnvs || ['production', 'preview', 'development'];
          syncResults.vercel = await vercelSync.syncSecret('DATABASE_URL', data.DATABASE_URL || '', vercelEnvs);
          logger.info('Synced secret to Vercel', { path });
        } catch (vercelError) {
          logger.error('Failed to sync to Vercel', { error: vercelError.message });
          syncResults.vercel = { error: vercelError.message };
        }
      }

      // Sync to n8n if requested
      if (syncConfig.n8n && data.DATABASE_URL) {
        try {
          const credType = syncConfig.n8nCredType || 'postgres';
          const credName = `${path.split('/').pop()}-${Date.now()}`;
          syncResults.n8n = await n8nSync.syncCredential(credType, credName, data);
          logger.info('Synced secret to n8n', { path });
        } catch (n8nError) {
          logger.error('Failed to sync to n8n', { error: n8nError.message });
          syncResults.n8n = { error: n8nError.message };
        }
      }

      res.status(201).json({
        path,
        created: true,
        vault: {
          updated: true,
          keys: Object.keys(data)
        },
        sync: syncResults,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to create secret', {
        path: req.params.path,
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to create secret',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/secrets/:path - Update specific secret values
   * Body:
   *   {
   *     "updates": { "key1": "newValue1" },
   *     "sync": { "vercel": true, "n8n": true }
   *   }
   */
  router.put('/:path(*)', async (req, res) => {
    try {
      const { path } = req.params;
      const { updates, sync } = req.body;

      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }

      if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Updates object with at least one key-value pair is required'
        });
      }

      // Get current secret
      const current = await vaultClient.getSecret(path);
      const currentData = current.data.data || {};

      // Merge updates
      const mergedData = { ...currentData, ...updates };

      // Update secret
      await vaultClient.setSecret(path, mergedData);

      const syncResults = {};
      const syncConfig = sync || {};

      // Sync to Vercel if requested
      if (syncConfig.vercel) {
        try {
          const vercelEnvs = syncConfig.vercelEnvs || ['production', 'preview'];
          for (const [key, value] of Object.entries(updates)) {
            syncResults.vercel = await vercelSync.syncSecret(key, value, vercelEnvs);
          }
          logger.info('Updated and synced to Vercel', { path });
        } catch (vercelError) {
          logger.error('Failed to sync to Vercel', { error: vercelError.message });
          syncResults.vercel = { error: vercelError.message };
        }
      }

      res.json({
        path,
        updated: true,
        keys: Object.keys(updates),
        sync: syncResults,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update secret', {
        path: req.params.path,
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to update secret',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/secrets/:path - Delete secret
   */
  router.delete('/:path(*)', async (req, res) => {
    try {
      const { path } = req.params;

      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }

      // Require confirmation header for destructive operation
      if (req.headers['x-confirm-deletion'] !== 'true') {
        return res.status(400).json({
          error: 'Deletion requires X-Confirm-Deletion: true header'
        });
      }

      await vaultClient.deleteSecret(path);

      logger.info('Deleted secret', { path });

      res.json({
        path,
        deleted: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          error: 'Secret not found',
          path: req.params.path
        });
      }

      logger.error('Failed to delete secret', {
        path: req.params.path,
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to delete secret',
        message: error.message
      });
    }
  });

  /**
   * POST /api/secrets/:path/rotate - Rotate secret (create new version)
   * Body:
   *   { "newData": { "key": "newValue" } }
   */
  router.post('/:path(*)/rotate', async (req, res) => {
    try {
      const { path } = req.params;
      const { newData } = req.body;

      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }

      if (!newData || typeof newData !== 'object') {
        return res.status(400).json({ error: 'New data object is required' });
      }

      const result = await vaultClient.rotateSecret(path, newData);

      logger.info('Rotated secret', { path });

      res.json({
        path,
        ...result,
        rotated: true
      });
    } catch (error) {
      logger.error('Failed to rotate secret', {
        path: req.params.path,
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to rotate secret',
        message: error.message
      });
    }
  });

  /**
   * GET /api/secrets/:path/validate - Validate secret structure
   * Query params:
   *   - keys: comma-separated required keys (e.g., ?keys=username,password)
   */
  router.get('/:path(*)/validate', async (req, res) => {
    try {
      const { path } = req.params;
      const { keys } = req.query;

      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }

      const requiredKeys = keys ? keys.split(',') : [];
      const validation = await vaultClient.validateSecret(path, requiredKeys);

      res.json({
        path,
        ...validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to validate secret', {
        path: req.params.path,
        error: error.message
      });
      res.status(500).json({
        error: 'Failed to validate secret',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createSecretRoutes;
