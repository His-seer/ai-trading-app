import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logsDir = join(__dirname, '../../logs');

// Ensure logs directory exists
try {
    mkdirSync(logsDir, { recursive: true });
} catch (e) {
    // Directory may already exist
}

/**
 * Log Levels
 */
const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
    TRACE: 'TRACE',
};

const LOG_LEVEL_WEIGHT = {
    ERROR: 5,
    WARN: 4,
    INFO: 3,
    DEBUG: 2,
    TRACE: 1,
};

/**
 * Structured Logger
 * Provides JSON and console logging with levels
 */
class Logger {
    constructor(level = process.env.LOG_LEVEL || 'INFO') {
        this.level = level;
        this.isDev = process.env.NODE_ENV !== 'production';
    }

    /**
     * Format timestamp in ISO format
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Create log entry object
     */
    createLogEntry(level, message, context = {}) {
        return {
            timestamp: this.getTimestamp(),
            level,
            message,
            ...context,
        };
    }

    /**
     * Log to file
     */
    writeToFile(entry) {
        try {
            const logFile = join(logsDir, `${entry.level.toLowerCase()}.log`);
            const line = JSON.stringify(entry) + '\n';
            appendFileSync(logFile, line, 'utf-8');

            // Also write to combined log
            const combinedFile = join(logsDir, 'combined.log');
            appendFileSync(combinedFile, line, 'utf-8');
        } catch (error) {
            console.error('Failed to write log file:', error.message);
        }
    }

    /**
     * Format for console output in development
     */
    formatConsoleOutput(entry) {
        const { timestamp, level, message, ...context } = entry;
        let output = `[${timestamp}] ${level}: ${message}`;
        if (Object.keys(context).length > 0) {
            output += ` ${JSON.stringify(context)}`;
        }
        return output;
    }

    /**
     * Log message
     */
    log(level, message, context = {}) {
        // Check if this level should be logged
        const currentWeight = LOG_LEVEL_WEIGHT[this.level] || LOG_LEVEL_WEIGHT.INFO;
        const messageWeight = LOG_LEVEL_WEIGHT[level] || LOG_LEVEL_WEIGHT.INFO;

        if (messageWeight < currentWeight) {
            return; // Don't log
        }

        const entry = this.createLogEntry(level, message, context);

        // Console output
        if (this.isDev) {
            const output = this.formatConsoleOutput(entry);
            if (level === 'ERROR') {
                console.error(output);
            } else if (level === 'WARN') {
                console.warn(output);
            } else {
                console.log(output);
            }
        } else {
            // Production: minimal console output
            console.log(`[${entry.timestamp}] ${level}: ${message}`);
        }

        // File output
        this.writeToFile(entry);
    }

    /**
     * Error logging
     */
    error(message, error = null, context = {}) {
        const errorContext = {
            ...context,
            ...(error && {
                errorMessage: error.message,
                errorStack: error.stack,
            }),
        };
        this.log(LOG_LEVELS.ERROR, message, errorContext);
    }

    /**
     * Warning logging
     */
    warn(message, context = {}) {
        this.log(LOG_LEVELS.WARN, message, context);
    }

    /**
     * Info logging
     */
    info(message, context = {}) {
        this.log(LOG_LEVELS.INFO, message, context);
    }

    /**
     * Debug logging
     */
    debug(message, context = {}) {
        this.log(LOG_LEVELS.DEBUG, message, context);
    }

    /**
     * Trace logging
     */
    trace(message, context = {}) {
        this.log(LOG_LEVELS.TRACE, message, context);
    }

    /**
     * Request logging middleware
     */
    requestMiddleware() {
        const self = this;
        return (req, res, next) => {
            const startTime = Date.now();
            const originalJson = res.json.bind(res);

            res.json = function (data) {
                const duration = Date.now() - startTime;
                const logContext = {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    userAgent: req.get('user-agent'),
                };

                if (res.statusCode >= 400) {
                    self.warn(`API Request - ${req.method} ${req.path}`, logContext);
                } else {
                    self.info(`API Request - ${req.method} ${req.path}`, logContext);
                }

                return originalJson.call(this, data);
            };

            next();
        };
    }

    /**
     * Error handling middleware
     */
    errorMiddleware() {
        return (err, req, res, next) => {
            const logContext = {
                method: req.method,
                path: req.path,
                statusCode: err.statusCode || 500,
                errorMessage: err.message,
            };

            this.error(`Unhandled error - ${req.method} ${req.path}`, err, logContext);

            res.status(err.statusCode || 500).json({
                success: false,
                error: err.message || 'Internal server error',
                requestId: req.id, // Add request ID if available
            });
        };
    }

    /**
     * Create child logger with prefix
     */
    child(prefix) {
        const childLogger = new Logger(this.level);
        const originalLog = childLogger.log.bind(childLogger);

        childLogger.log = function (level, message, context = {}) {
            return originalLog(level, `[${prefix}] ${message}`, context);
        };

        return childLogger;
    }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Create logger middleware for Express
 */
export function createLoggerMiddleware(customLogger = logger) {
    return customLogger.requestMiddleware();
}

/**
 * Create error handler middleware
 */
export function createErrorHandlerMiddleware(customLogger = logger) {
    return customLogger.errorMiddleware();
}

export default logger;
