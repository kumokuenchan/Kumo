import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { connectionStorage } from '../services/ConnectionStorage.js';
import { connectionPoolManager } from '../services/ConnectionPoolManager.js';
import { ConnectionConfig } from '../types/connection.js';
import { EncryptionService } from '../services/EncryptionService.js';

const router = Router();

// GET all connections
router.get('/', async (_req, res) => {
  try {
    const connections = await connectionStorage.getAll();
    // Passwords are returned encrypted (safe to transmit)
    // They can only be decrypted by the same machine using OS keychain
    res.json({ connections });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve connections', message: error.message });
  }
});

// GET connection by ID
router.get('/:id', async (req, res) => {
  try {
    const connection = await connectionStorage.getById(req.params.id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    // Password is returned encrypted (safe to transmit)
    res.json({ connection });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve connection', message: error.message });
  }
});

// POST new connection
router.post('/', async (req, res) => {
  try {
    const { name, host, port, database, username, password, sshTunnel, group } = req.body;

    // Validation
    if (!name || !host || !port || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Encrypt password before saving (if provided and not already encrypted)
    let encryptedPassword = password;
    if (password && !EncryptionService.isEncrypted(password) && !EncryptionService.isElectronEncrypted(password)) {
      encryptedPassword = EncryptionService.encryptFallback(password);
    }

    // Encrypt SSH tunnel password if provided
    let processedSshTunnel = sshTunnel;
    if (sshTunnel?.password && !EncryptionService.isEncrypted(sshTunnel.password) && !EncryptionService.isElectronEncrypted(sshTunnel.password)) {
      processedSshTunnel = {
        ...sshTunnel,
        password: EncryptionService.encryptFallback(sshTunnel.password),
      };
    }

    const connection: ConnectionConfig = {
      id: uuidv4(),
      name,
      group,
      host,
      port: parseInt(port),
      database: database || '',
      username,
      password: encryptedPassword,
      sshTunnel: processedSshTunnel,
      createdAt: new Date().toISOString(),
    };

    await connectionStorage.save(connection);

    // Create pool immediately
    try {
      await connectionPoolManager.createPool(connection);
    } catch (error) {
      console.error(`Failed to create pool for connection ${connection.id}:`, error);
      // Continue anyway - pool will be created on first use
    }

    // Password is returned encrypted (safe to transmit)
    res.status(201).json({ connection });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create connection', message: error.message });
  }
});

// PUT update connection
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Encrypt password if provided and not already encrypted
    if (updates.password && !EncryptionService.isEncrypted(updates.password) && !EncryptionService.isElectronEncrypted(updates.password)) {
      updates.password = EncryptionService.encryptFallback(updates.password);
    }

    // Encrypt SSH tunnel password if provided
    if (updates.sshTunnel?.password && !EncryptionService.isEncrypted(updates.sshTunnel.password) && !EncryptionService.isElectronEncrypted(updates.sshTunnel.password)) {
      updates.sshTunnel = {
        ...updates.sshTunnel,
        password: EncryptionService.encryptFallback(updates.sshTunnel.password),
      };
    }

    const updated = await connectionStorage.update(id, updates);

    // Close existing pool if connection details changed
    await connectionPoolManager.closePool(id);

    // Password is returned encrypted (safe to transmit)
    res.json({ connection: updated });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    res.status(500).json({ error: 'Failed to update connection', message: error.message });
  }
});

// DELETE connection
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Close pool if exists
    await connectionPoolManager.closePool(id);

    // Delete from storage
    await connectionStorage.delete(id);

    res.json({ message: 'Connection deleted successfully' });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    res.status(500).json({ error: 'Failed to delete connection', message: error.message });
  }
});

// POST test connection
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    // Get connection config
    let config: ConnectionConfig | null = null;

    if (id === 'new') {
      // Testing a new connection (not saved yet)
      config = req.body as ConnectionConfig;
      config.id = 'temp-test';
    } else {
      // Testing existing connection
      config = await connectionStorage.getById(id);
      if (!config) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Merge password from request if provided
      if (req.body.password) {
        config.password = req.body.password;
      }
    }

    if (!config) {
      return res.status(400).json({ error: 'Invalid connection configuration' });
    }

    // Test connection
    const result = await connectionPoolManager.testConnection(config);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message,
    });
  }
});

// POST connect to database
router.post('/:id/connect', async (req, res) => {
  try {
    const { id } = req.params;

    const stored = await connectionStorage.getById(id);
    if (!stored) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Create a runtime copy so we don't mutate stored object
    const config = { ...stored } as ConnectionConfig;

    // Get password from request body (from secure storage)
    if (req.body && typeof req.body.password === 'string' && req.body.password.length > 0) {
      config.password = req.body.password;
    }

    // If no password available, reject to avoid creating a bad pool
    if (!config.password) {
      return res.status(400).json({ error: 'Password required to connect' });
    }

    // Decrypt password if it's encrypted
    if (EncryptionService.isEncrypted(config.password)) {
      config.password = EncryptionService.decryptFallback(config.password);
    }

    // Create or get pool
    await connectionPoolManager.createPool(config);

    // Update last used
    await connectionStorage.updateLastUsed(id);

    res.json({ message: 'Connected successfully', connectionId: id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to connect', message: error.message });
  }
});

// POST keep-alive ping
router.post('/:id/ping', async (req, res) => {
  try {
    const { id } = req.params;

    const stored = await connectionStorage.getById(id);
    if (!stored) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Use a runtime copy to avoid mutating stored object
    const config = { ...stored } as ConnectionConfig;

    // Accept optional password from client (e.g., when Electron-only encryption is used)
    if (req.body && typeof req.body.password === 'string' && req.body.password.length > 0) {
      config.password = req.body.password;
    }

    // If no password and no existing pool, we cannot create a connection
    const existingPool = connectionPoolManager.getPool(id);
    if (!existingPool) {
      if (!config.password) {
        return res.status(400).json({ error: 'Password required to initialize connection for ping' });
      }

      // Decrypt if stored with fallback encryption
      if (EncryptionService.isEncrypted(config.password)) {
        config.password = EncryptionService.decryptFallback(config.password);
      }

      // Create pool for this connection
      await connectionPoolManager.createPool(config);
    }

    // Execute lightweight ping to keep the pool alive
    try {
      // Use a short query; executeQuery also ensures a pool exists
      await connectionPoolManager.executeQuery(id, 'SELECT 1');
    } catch (err) {
      // If ping failed due to missing/invalid pool, surface error
      throw err;
    }

    // Update last used timestamp
    await connectionStorage.updateLastUsed(id);

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to ping connection', message: error.message });
  }
});

// POST disconnect from database
router.post('/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params;

    await connectionPoolManager.closePool(id);

    res.json({ message: 'Disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to disconnect', message: error.message });
  }
});

// GET pool statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if connection exists first
    const connection = await connectionStorage.getById(id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const stats = connectionPoolManager.getPoolStats(id);
    if (!stats) {
      // Connection exists but no active pool - return disconnected status
      return res.json({ stats: null });
    }

    res.json({ stats });
  } catch (error: any) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({ error: 'Failed to get statistics', message: error.message });
  }
});

export default router;
