import express from 'express';
import cors from 'cors';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import config from './config/config.js';
import { initializeDatabase } from './db/database.js';
import apiRoutes from './routes/api.js';
import { logger, createLoggerMiddleware, createErrorHandlerMiddleware } from './utils/logger.js';
import { validateAndExit } from './utils/envValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate environment variables on startup
validateAndExit();

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

// Initialize database
try {
    initializeDatabase();
    logger.info('Database initialized successfully');
} catch (error) {
    logger.error('Failed to initialize database', error);
    process.exit(1);
}

// Create Express app
const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL, // Railway frontend URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list or matches Railway pattern
        if (allowedOrigins.includes(origin) || origin.endsWith('.railway.app')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());

// Add structured logging middleware
app.use(createLoggerMiddleware(logger));

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// Welcome route
app.get('/', (req, res) => {
    res.json({
        name: 'AI Trading Platform API',
        version: '1.0.0',
        description: 'AI-Assisted Stock & Forex Paper Trading Platform',
        endpoints: {
            health: 'GET /health',
            portfolio: 'GET /api/portfolio',
            decisions: 'GET /api/decisions',
            botStatus: 'GET /api/bot/status',
            botStart: 'POST /api/bot/start',
            botStop: 'POST /api/bot/stop',
            marketStocks: 'GET /api/market/stocks',
            marketForex: 'GET /api/market/forex',
            config: 'GET /api/config',
        },
    });
});

// Add error handling middleware
app.use(createErrorHandlerMiddleware(logger));

// 404 handler
app.use((req, res) => {
    logger.warn('Not Found', { method: req.method, path: req.path });
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Graceful shutdown
let isShuttingDown = false;

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, starting graceful shutdown');
    isShuttingDown = true;
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, starting graceful shutdown');
    isShuttingDown = true;
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`, {
        environment: config.nodeEnv,
        geminiApiConfigured: !!config.geminiApiKey,
        finnhubApiConfigured: !!config.finnhubApiKey,
    });

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║          AI Trading Platform - Backend Server             ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                  ║
║  Environment: ${config.nodeEnv.padEnd(42)}║
║  Gemini API: ${config.geminiApiKey ? '✅ Configured'.padEnd(43) : '❌ Not configured'.padEnd(43)}║
║  Finnhub API: ${config.finnhubApiKey ? '✅ Configured'.padEnd(42) : '❌ Not configured'.padEnd(42)}║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle server shutdown
server.on('close', () => {
    logger.info('Server closed');
});

export default app;
