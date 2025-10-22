import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectionRoutes from './routes/connections.js';
import schemaRoutes from './routes/schema.js';
import queryRoutes from './routes/query.js';
import queryBuilderRoutes from './routes/queryBuilder.js';
import dataViewerRoutes from './routes/dataViewer.js';
import dataEditingRoutes from './routes/dataEditing.js';
import { connectionStorage } from './services/ConnectionStorage.js';
import { connectionPoolManager } from './services/ConnectionPoolManager.js';
import { queryHistoryStorage } from './services/QueryHistoryStorage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/connections', connectionRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/query-builder', queryBuilderRoutes);
app.use('/api/data-viewer', dataViewerRoutes);
app.use('/api/data-editing', dataEditingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Kumo DB API Server' });
});

// Initialize storage on startup
async function initializeServer() {
  try {
    await connectionStorage.initialize();
    console.log('✓ Connection storage initialized');

    await queryHistoryStorage.initialize();
    console.log('✓ Query history storage initialized');

    // Start idle pool cleanup (every 10 minutes)
    setInterval(() => {
      connectionPoolManager.cleanupIdlePools().catch((err) => {
        console.error('Error cleaning up idle pools:', err);
      });
    }, 10 * 60 * 1000);

    console.log('✓ Idle pool cleanup scheduled');
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await connectionPoolManager.closeAllPools();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  await connectionPoolManager.closeAllPools();
  process.exit(0);
});

// Start server
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
