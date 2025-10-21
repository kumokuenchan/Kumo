import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { connectionStorage } from '../services/ConnectionStorage.js';
import { connectionPoolManager } from '../services/ConnectionPoolManager.js';
import { ConnectionConfig } from '../types/connection.js';

const router = Router();

// GET all connections
router.get('/', async (_req, res) => {
  try {
    const connections = await connectionStorage.getAll();
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
    res.json({ connection });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve connection', message: error.message });
  }
});

// POST new connection
router.post('/', async (req, res) => {
  try {
    const { name, host, port, database, username, password, sshTunnel } = req.body;

    // Validation
    if (!name || !host || !port || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection: ConnectionConfig = {
      id: uuidv4(),
      name,
      host,
      port: parseInt(port),
      database: database || '',
      username,
      password, // Will be stored in secure storage separately
      sshTunnel,
      createdAt: new Date().toISOString(),
    };

    await connectionStorage.save(connection);

    // Create pool immediately
    try {
      await connectionPoolManager.createPool(connection);
      console.log(`Created pool for new connection: ${connection.id}`);
    } catch (error) {
      console.error(`Failed to create pool for connection ${connection.id}:`, error);
      // Continue anyway - pool will be created on first use
    }

    // Return connection without password
    const { password: _, ...connectionWithoutPassword } = connection;
    res.status(201).json({ connection: connectionWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create connection', message: error.message });
  }
});

// PUT update connection
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await connectionStorage.update(id, updates);

    // Close existing pool if connection details changed
    await connectionPoolManager.closePool(id);

    const { password: _, ...connectionWithoutPassword } = updated;
    res.json({ connection: connectionWithoutPassword });
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

    const config = await connectionStorage.getById(id);
    if (!config) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Get password from request body (from secure storage)
    if (req.body && typeof req.body.password === 'string' && req.body.password.length > 0) {
      config.password = req.body.password;
    }

    // If no password available, reject to avoid creating a bad pool
    if (!config.password) {
      return res.status(400).json({ error: 'Password required to connect' });
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

    const stats = connectionPoolManager.getPoolStats(id);
    if (!stats) {
      return res.status(404).json({ error: 'No active connection pool found' });
    }

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get statistics', message: error.message });
  }
});

export default router;
