import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from './config/database.js';

// Import route modules
import employeesModule from './routes/employees.js';
import meetingsModule from './routes/meetings.js';
import trackingModule from './routes/tracking.js';
import analyticsModule from './routes/analytics.js';
import dataSyncModule from './routes/data-sync.js';
import debugModule from './routes/debug.js';
import demoModule from './routes/demo.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced error handling middleware
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${req.method} ${req.path} - ${timestamp}`);
  next();
});

// Security and parsing middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint (before database dependency)
app.get('/health', (req, res) => {
  const db = Database.getInstance();
  const dbStatus = db.isConnectionActive() ? 'connected' : 'disconnected';
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const db = Database.getInstance();
    const isActive = db.isConnectionActive();
    
    if (isActive) {
      // Try a simple operation to verify connectivity
      const connection = db.getConnection();
      await connection.db.admin().ping();
      
      res.json({
        status: 'connected',
        readyState: connection.readyState,
        host: connection.host,
        name: connection.name
      });
    } else {
      res.status(503).json({
        status: 'disconnected',
        message: 'Database connection not available'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
});

// Create express routers for all modules
const employeesRouter = express.Router();
employeesRouter.get('/', employeesModule.getEmployees);
employeesRouter.get('/:id', employeesModule.getEmployee);
employeesRouter.put('/:id/location', employeesModule.updateEmployeeLocation);
employeesRouter.post('/sync', employeesModule.syncEmployees);
employeesRouter.get('/:id/location-history', employeesModule.getEmployeeLocationHistory);

const meetingsRouter = express.Router();
meetingsRouter.get('/', meetingsModule.getMeetings);
meetingsRouter.post('/', meetingsModule.createMeeting);
meetingsRouter.get('/:id', meetingsModule.getMeetingById);
meetingsRouter.put('/:id', meetingsModule.updateMeeting);
meetingsRouter.delete('/:id', meetingsModule.deleteMeeting);

const trackingRouter = express.Router();
trackingRouter.get('/tracking-sessions', trackingModule.getTrackingSessions);
trackingRouter.post('/tracking-sessions', trackingModule.createTrackingSession);
trackingRouter.put('/tracking-sessions/:sessionId/location', trackingModule.updateTrackingSessionLocation);
trackingRouter.put('/tracking-sessions/:sessionId/end', trackingModule.endTrackingSession);
trackingRouter.get('/meeting-history', trackingModule.getMeetingHistory);
trackingRouter.post('/meeting-history', trackingModule.addMeetingHistory);

const analyticsRouter = express.Router();
analyticsRouter.get('/employees', analyticsModule.getEmployeeAnalytics); // Add missing route
analyticsRouter.get('/employee-analytics', analyticsModule.getEmployeeAnalytics);
analyticsRouter.get('/employee-details/:employeeId', analyticsModule.getEmployeeDetails);
analyticsRouter.get('/lead-history/:leadId', analyticsModule.getLeadHistory);
analyticsRouter.post('/attendance', analyticsModule.saveAttendance);
analyticsRouter.get('/meeting-trends', analyticsModule.getMeetingTrends);

const dataSyncRouter = express.Router();
dataSyncRouter.post('/data-sync', dataSyncModule.syncAllData);
dataSyncRouter.get('/data-status', dataSyncModule.getDataStatus);

const debugRouter = express.Router();
debugRouter.get('/employee/:employeeId', debugModule.debugEmployeeData);

const demoRouter = express.Router();
demoRouter.get('/demo', demoModule.handleDemo);

// API routes with database dependency checking
app.use('/api/employees', (req, res, next) => {
  const db = Database.getInstance();
  if (!db.isConnectionActive() && req.method !== 'GET') {
    console.warn('⚠️ Non-GET request attempted without database connection');
  }
  next();
}, employeesRouter);

app.use('/api/meetings', (req, res, next) => {
  const db = Database.getInstance();
  if (!db.isConnectionActive() && req.method !== 'GET') {
    console.warn('⚠️ Non-GET request attempted without database connection');
  }
  next();
}, meetingsRouter);

app.use('/api', trackingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api', dataSyncRouter);
app.use('/api/debug', debugRouter);
app.use('/api/demo', demoRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../dist');
  app.use(express.static(staticPath));
  
  // Serve index.html for all routes (SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', error);

  // Handle specific error types
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      status: 'error'
    });
  }

  // Handle MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return res.status(503).json({
      error: 'Database service temporarily unavailable',
      status: 'error'
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid request data',
      details: error.message,
      status: 'error'
    });
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      status: 'error'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    status: 'error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `API endpoint ${req.path} not found`,
    status: 'error'
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  
  const db = Database.getInstance();
  
  try {
    console.log('📦 Closing database connection...');
    await db.disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Error during database disconnect:', error);
  }
  
  console.log('👋 Server shutdown complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🚀 Starting Employee Tracking Server...');
    
    // Initialize database connection
    const db = Database.getInstance();
    
    try {
      await db.connect();
      console.log('✅ Database connection established');
    } catch (error) {
      console.warn('⚠️ Database connection failed, starting in degraded mode:', error);
      // Continue startup even if database connection fails
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Database status: http://localhost:${PORT}/api/db-status`);
      console.log('✅ Server startup complete');
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });

    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Export for vite.config.ts
export function createServer() {
  // Initialize database connection in background, but don't block
  const db = Database.getInstance();
  db.connect().catch((error) => {
    console.warn('⚠️ Database connection failed, running in degraded mode:', error);
  });

  return app;
}

// Only start the server if this file is run directly (not imported by Vite)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error('❌ Startup error:', error);
    process.exit(1);
  });
}

export { app, AppError };
