import { logger } from '../utils/logger.js';

/**
 * Rate Limiting Middleware
 * Protects API from abuse
 */

const requestStore = new Map();

/**
 * Clean up old entries
 */
function cleanupExpired(timestamp) {
    for (const [key, value] of requestStore.entries()) {
        const requests = value.filter(req => req > timestamp - 60000); // Keep last minute
        if (requests.length === 0) {
            requestStore.delete(key);
        } else {
            requestStore.set(key, requests);
        }
    }
}

/**
 * Rate limiter middleware factory
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} keyGenerator - Function to generate rate limit key
 */
export function createRateLimiter(options = {}) {
    const {
        maxRequests = 100,
        windowMs = 60000, // 1 minute
        keyGenerator = (req) => req.ip,
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        // Clean up expired entries periodically
        if (Math.random() < 0.01) {
            cleanupExpired(now);
        }

        // Get or create request history
        if (!requestStore.has(key)) {
            requestStore.set(key, []);
        }

        const requests = requestStore.get(key);

        // Remove old requests outside the window
        const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
        requestStore.set(key, recentRequests);

        // Check if limit exceeded
        if (recentRequests.length >= maxRequests) {
            const retryAfter = Math.ceil((recentRequests[0] + windowMs - now) / 1000);

            logger.warn('Rate limit exceeded', {
                ip: key,
                requests: recentRequests.length,
                limit: maxRequests,
                retryAfter,
            });

            return res.status(429).json({
                success: false,
                error: 'Too many requests, please try again later',
                retryAfter,
            });
        }

        // Record this request
        const originalSend = res.send;
        res.send = function (data) {
            // Only count if not skipping based on status
            let shouldCount = true;

            if (skipSuccessfulRequests && res.statusCode < 400) {
                shouldCount = false;
            }

            if (skipFailedRequests && res.statusCode >= 400) {
                shouldCount = false;
            }

            if (shouldCount) {
                requestStore.get(key).push(now);
            }

            return originalSend.call(this, data);
        };

        next();
    };
}

/**
 * IP-based rate limiter
 */
export function ipRateLimiter(maxRequests = 100, windowMs = 60000) {
    return createRateLimiter({
        maxRequests,
        windowMs,
        keyGenerator: (req) => req.ip || 'unknown',
    });
}

/**
 * Endpoint-specific rate limiter
 */
export function endpointRateLimiter(maxRequests = 50, windowMs = 60000) {
    return createRateLimiter({
        maxRequests,
        windowMs,
        keyGenerator: (req) => `${req.ip}:${req.path}`,
    });
}

/**
 * Strict rate limiter for sensitive endpoints
 */
export function strictRateLimiter(maxRequests = 10, windowMs = 60000) {
    return createRateLimiter({
        maxRequests,
        windowMs,
        keyGenerator: (req) => `${req.ip}:${req.method}:${req.path}`,
    });
}

export default {
    createRateLimiter,
    ipRateLimiter,
    endpointRateLimiter,
    strictRateLimiter,
};
