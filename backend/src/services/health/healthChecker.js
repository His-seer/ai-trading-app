import { logger } from '../../utils/logger.js';
import db from '../../db/database.js';

/**
 * Health Check Service
 * Monitors system health and external service availability
 */
class HealthChecker {
    constructor() {
        this.lastChecks = new Map();
        this.checkIntervalMs = 30000; // 30 seconds
        this.timeout = 5000; // 5 second timeout
    }

    /**
     * Check database connectivity
     */
    async checkDatabase() {
        const startTime = Date.now();
        try {
            const result = db.prepare('SELECT 1').get();
            return {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                message: 'Database connected',
            };
        } catch (error) {
            logger.error('Database health check failed', error);
            return {
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    /**
     * Check system resources
     */
    async checkResources() {
        try {
            const memUsage = process.memoryUsage();
            const uptime = process.uptime();

            return {
                status: 'healthy',
                uptime: Math.round(uptime),
                memory: {
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                    external: Math.round(memUsage.external / 1024 / 1024),
                    unit: 'MB',
                },
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            logger.error('Resource check failed', error);
            return {
                status: 'unhealthy',
                error: error.message,
            };
        }
    }

    /**
     * Check if bot is running
     */
    checkBotStatus() {
        try {
            const status = db.prepare('SELECT is_running, last_check_at FROM bot_status WHERE id = 1').get();
            return {
                status: status.is_running ? 'running' : 'stopped',
                isRunning: !!status.is_running,
                lastCheck: status.last_check_at,
            };
        } catch (error) {
            logger.error('Bot status check failed', error);
            return {
                status: 'unknown',
                error: error.message,
            };
        }
    }

    /**
     * Check database connection pool
     */
    checkDatabasePool() {
        try {
            // For SQLite, there's no traditional pool
            return {
                status: 'healthy',
                type: 'SQLite',
                connections: 1,
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
            };
        }
    }

    /**
     * Run all health checks
     */
    async runFullCheck() {
        const startTime = Date.now();
        const checks = {
            database: await this.checkDatabase(),
            resources: await this.checkResources(),
            bot: this.checkBotStatus(),
            databasePool: this.checkDatabasePool(),
        };

        const allHealthy = Object.values(checks)
            .filter(check => check.status)
            .every(check => check.status === 'healthy' || check.status === 'running' || check.status === 'stopped');

        const result = {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            checks,
            version: '1.0.0',
        };

        this.lastChecks.set('full', result);
        return result;
    }

    /**
     * Get cached health check
     */
    getCached(checkType = 'full') {
        return this.lastChecks.get(checkType);
    }

    /**
     * Middleware for health check endpoint
     */
    healthMiddleware() {
        return async (req, res) => {
            const healthCheck = await this.runFullCheck();
            const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(healthCheck);
        };
    }

    /**
     * Liveness probe (is app running?)
     */
    livenessProbe() {
        return async (req, res) => {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
            });
        };
    }

    /**
     * Readiness probe (is app ready for requests?)
     */
    readinessProbe() {
        return async (req, res) => {
            try {
                const dbCheck = await this.checkDatabase();
                if (dbCheck.status !== 'healthy') {
                    return res.status(503).json({
                        status: 'not_ready',
                        reason: 'Database not available',
                    });
                }

                res.status(200).json({
                    status: 'ready',
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                res.status(503).json({
                    status: 'not_ready',
                    error: error.message,
                });
            }
        };
    }

    /**
     * Create health check routes
     */
    createRoutes(router) {
        router.get('/health', this.healthMiddleware());
        router.get('/health/live', this.livenessProbe());
        router.get('/health/ready', this.readinessProbe());

        // Quick checks
        router.get('/health/db', async (req, res) => {
            const result = await this.checkDatabase();
            res.status(result.status === 'healthy' ? 200 : 503).json(result);
        });

        router.get('/health/resources', async (req, res) => {
            const result = await this.checkResources();
            res.status(200).json(result);
        });

        router.get('/health/bot', (req, res) => {
            const result = this.checkBotStatus();
            res.status(200).json(result);
        });

        return router;
    }
}

export const healthChecker = new HealthChecker();

export default healthChecker;
