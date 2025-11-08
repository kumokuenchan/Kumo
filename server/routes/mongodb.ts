import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mongoDBService } from '../services/MongoDBService.js';
import { MongoDBConnectionConfig } from '../types/mongodb';

// In-memory storage for MongoDB connections (in production, this should be in a database)
const mongodbConnections = new Map<string, MongoDBConnectionConfig>();

const router = Router();

// Test MongoDB connection
router.post('/test', async (req, res) => {
  try {
    const { uri, options } = req.body;
    
    if (!uri) {
      return res.status(400).json({
        success: false,
        message: 'URI is required',
      });
    }

    const result = await mongoDBService.testConnection(uri, options);
    
    res.json(result);
  } catch (error: any) {
    console.error('MongoDB connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message,
    });
  }
});

// Connect to existing saved connection
router.post('/:connectionId/connect', async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    // Get the saved connection
    const connection = mongodbConnections.get(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found',
      });
    }
    
    // Create the actual MongoDB connection
    const client = await mongoDBService.createConnection({
      id: connection.id,
      name: connection.name,
      uri: connection.uri,
      options: connection.options,
      createdAt: connection.createdAt,
    });
    
    res.json({
      success: true,
      message: 'Connected successfully',
      connectionId: connectionId,
    });
  } catch (error: any) {
    console.error('MongoDB connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect',
      error: error.message,
    });
  }
});

// Create connection (temporary)
router.post('/connect', async (req, res) => {
  try {
    const { id, name, uri, options } = req.body;
    
    if (!id || !name || !uri) {
      return res.status(400).json({
        success: false,
        message: 'ID, name, and URI are required',
      });
    }

    const config = {
      id,
      name,
      uri,
      options,
      createdAt: new Date().toISOString(),
    };

    const client = await mongoDBService.createConnection(config);
    
    res.json({
      success: true,
      message: 'Connected successfully',
      connectionId: id,
    });
  } catch (error: any) {
    console.error('MongoDB connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect',
      error: error.message,
    });
  }
});

// Disconnect
router.post('/:connectionId/disconnect', async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    await mongoDBService.closeConnection(connectionId);
    
    res.json({
      success: true,
      message: 'Disconnected successfully',
    });
  } catch (error: any) {
    console.error('MongoDB disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect',
      error: error.message,
    });
  }
});

// Get databases
router.get('/:connectionId/databases', async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    const databases = await mongoDBService.getDatabases(connectionId);
    
    res.json({
      success: true,
      databases,
    });
  } catch (error: any) {
    console.error('Get databases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get databases',
      error: error.message,
    });
  }
});

// Get collections
router.get('/:connectionId/databases/:database/collections', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    
    const collections = await mongoDBService.getCollections(connectionId, database);
    
    res.json({
      success: true,
      collections,
    });
  } catch (error: any) {
    console.error('Get collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get collections',
      error: error.message,
    });
  }
});

// Find documents
router.get('/:connectionId/databases/:database/collections/:collection/documents', async (req, res) => {
  try {
    const { connectionId, database, collection } = req.params;
    const { query, limit, skip, sort, projection } = req.query;
    
    // Parse query parameters
    const filter = query ? JSON.parse(query as string) : {};
    const options = {
      limit: limit ? parseInt(limit as string) : 50,
      skip: skip ? parseInt(skip as string) : 0,
      sort: sort ? JSON.parse(sort as string) : undefined,
      projection: projection ? JSON.parse(projection as string) : undefined,
    };
    
    const result = await mongoDBService.findDocuments(
      connectionId, 
      database, 
      collection, 
      filter, 
      options
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Find documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find documents',
      error: error.message,
    });
  }
});

// Insert document
router.post('/:connectionId/databases/:database/collections/:collection/documents', async (req, res) => {
  try {
    const { connectionId, database, collection } = req.params;
    const { document } = req.body;
    
    if (!document) {
      return res.status(400).json({
        success: false,
        message: 'Document is required',
      });
    }
    
    const result = await mongoDBService.insertDocument(
      connectionId,
      database,
      collection,
      document
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Insert document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to insert document',
      error: error.message,
    });
  }
});

// Update documents
router.put('/:connectionId/databases/:database/collections/:collection/documents', async (req, res) => {
  try {
    const { connectionId, database, collection } = req.params;
    const { filter, update, options } = req.body;
    
    if (!filter || !update) {
      return res.status(400).json({
        success: false,
        message: 'Filter and update are required',
      });
    }
    
    const result = await mongoDBService.updateDocuments(
      connectionId,
      database,
      collection,
      filter,
      update,
      options
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Update documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update documents',
      error: error.message,
    });
  }
});

// Delete documents
router.delete('/:connectionId/databases/:database/collections/:collection/documents', async (req, res) => {
  try {
    const { connectionId, database, collection } = req.params;
    const { filter } = req.body;
    
    if (!filter) {
      return res.status(400).json({
        success: false,
        message: 'Filter is required',
      });
    }
    
    const result = await mongoDBService.deleteDocuments(
      connectionId,
      database,
      collection,
      filter
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Delete documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete documents',
      error: error.message,
    });
  }
});

// Aggregate documents
router.post('/:connectionId/databases/:database/collections/:collection/aggregate', async (req, res) => {
  try {
    const { connectionId, database, collection } = req.params;
    const { pipeline } = req.body;
    
    if (!pipeline || !Array.isArray(pipeline)) {
      return res.status(400).json({
        success: false,
        message: 'Pipeline array is required',
      });
    }
    
    const result = await mongoDBService.aggregateDocuments(
      connectionId,
      database,
      collection,
      pipeline
    );
    
    res.json({
      success: true,
      documents: result,
    });
  } catch (error: any) {
    console.error('Aggregate documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate documents',
      error: error.message,
    });
  }
});

// Get connection statistics
router.get('/:connectionId/stats', (req, res) => {
  try {
    const { connectionId } = req.params;
    
    const stats = mongoDBService.getConnectionStats(connectionId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found',
      });
    }
    
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Get connection stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection stats',
      error: error.message,
    });
  }
});

// Get all connections
router.get('/connections', (req, res) => {
  try {
    const connections = Array.from(mongodbConnections.values());
    res.json({
      success: true,
      connections,
    });
  } catch (error: any) {
    console.error('Get all connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connections',
      error: error.message,
    });
  }
});

// Get single connection
router.get('/connections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const connection = mongodbConnections.get(id);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found',
      });
    }
    
    res.json({
      success: true,
      connection,
    });
  } catch (error: any) {
    console.error('Get connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection',
      error: error.message,
    });
  }
});

// Create new connection
router.post('/connections', (req, res) => {
  try {
    const { name, group, environment, uri, options } = req.body;
    
    if (!name || !uri) {
      return res.status(400).json({
        success: false,
        message: 'Name and URI are required',
      });
    }
    
    // Generate unique ID
    const id = uuidv4();
    
    if (mongodbConnections.has(id)) {
      return res.status(400).json({
        success: false,
        message: 'Connection generation failed, please try again',
      });
    }
    
    const connection: MongoDBConnectionConfig = {
      id,
      name,
      group,
      environment,
      uri,
      options,
      createdAt: new Date().toISOString(),
    };
    
    mongodbConnections.set(id, connection);
    
    res.json({
      success: true,
      connection,
    });
  } catch (error: any) {
    console.error('Create connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create connection',
      error: error.message,
    });
  }
});

// Update connection
router.put('/connections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!mongodbConnections.has(id)) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found',
      });
    }
    
    const existingConnection = mongodbConnections.get(id)!;
    const updatedConnection = {
      ...existingConnection,
      ...updates,
    };
    
    mongodbConnections.set(id, updatedConnection);
    
    res.json({
      success: true,
      connection: updatedConnection,
    });
  } catch (error: any) {
    console.error('Update connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update connection',
      error: error.message,
    });
  }
});

// Delete connection
router.delete('/connections/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongodbConnections.has(id)) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found',
      });
    }
    
    mongodbConnections.delete(id);
    
    res.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete connection',
      error: error.message,
    });
  }
});

export default router;