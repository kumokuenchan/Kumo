import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectionRoutes from './routes/connections.js';
import schemaRoutes from './routes/schema.js';
import queryRoutes from './routes/query.js';
import queryBuilderRoutes from './routes/queryBuilder.js';
import dataViewerRoutes from './routes/dataViewer.js';
import dataEditingRoutes from './routes/dataEditing.js';
import importExportRoutes from './routes/importExport.js';
import smartJoinRoutes from './routes/smartJoin.js';
import aiRoutes from './routes/ai.js';
import performanceRoutes from './routes/performance.js';
import apiTesterRoutes from './routes/apiTester.js';
import mongodbRoutes from './routes/mongodb.js';
import notesRoutes from './routes/notes.js';
import terminalRoutes, { terminalService } from './routes/terminal.js';
import gitRoutes from './routes/git.js';
import logsRoutes, { cleanupWatchers } from './routes/logs.js';
import awsRoutes from './routes/aws.js';
import { connectionStorage } from './services/ConnectionStorage.js';
import { connectionPoolManager } from './services/ConnectionPoolManager.js';
import { queryHistoryStorage } from './services/QueryHistoryStorage.js';
import { savedQueriesStorage } from './services/SavedQueriesStorage.js';
import { mongoDBService } from './services/MongoDBService.js';
import { mongodbConnectionStorage } from './services/MongoDBConnectionStorage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5174",
    methods: ["GET", "POST"]
  }
});

// Set up Socket.IO for terminal service
terminalService.setSocketIO(io);

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join terminal room
  socket.on('terminal:join', (sessionId: string) => {
    socket.join(`terminal:${sessionId}`);
    console.log(`Socket ${socket.id} joined terminal:${sessionId}`);
  });

  // Leave terminal room
  socket.on('terminal:leave', (sessionId: string) => {
    socket.leave(`terminal:${sessionId}`);
    console.log(`Socket ${socket.id} left terminal:${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io instance for use in routes
export { io };

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large SQL backups
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/connections', connectionRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/query-builder', queryBuilderRoutes);
app.use('/api/data-viewer', dataViewerRoutes);
app.use('/api/data-editing', dataEditingRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/smart-join', smartJoinRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/api-tester', apiTesterRoutes);
app.use('/api/mongodb', mongodbRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/aws', awsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Kumo DB API Server' });
});

// Initialize storage on startup
async function initializeServer() {
  try {
    await connectionStorage.initialize();
    await queryHistoryStorage.initialize();
    await savedQueriesStorage.initialize();
    await mongodbConnectionStorage.initialize();

    // Start idle pool cleanup (every 10 minutes)
    setInterval(() => {
      connectionPoolManager.cleanupIdlePools().catch((err) => {
        console.error('Error cleaning up idle pools:', err);
      });
    }, 10 * 60 * 1000);

    // Start MongoDB idle connection cleanup (every 10 minutes)
    setInterval(() => {
      mongoDBService.cleanupIdleConnections().catch((err) => {
        console.error('Error cleaning up idle MongoDB connections:', err);
      });
    }, 10 * 60 * 1000);

    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cleanupWatchers();
  await connectionPoolManager.closeAllPools();
  await mongoDBService.closeAllConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await cleanupWatchers();
  await connectionPoolManager.closeAllPools();
  await mongoDBService.closeAllConnections();
  process.exit(0);
});

// Start server
initializeServer().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
