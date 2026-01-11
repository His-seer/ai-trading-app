import { logger } from './logger.js';

/**
 * Token Bucket Rate Limiter
 * Controls API request rate to stay within limits
 */
class RateLimiter {
    /**
     * @param {string} name - Identifier for this rate limiter
     * @param {Object} options - Configuration options
     * @param {number} options.maxTokens - Maximum tokens (API credits) per window
     * @param {number} options.windowMs - Time window in milliseconds
     */
    constructor(name, options = {}) {
        this.name = name;
        this.maxTokens = options.maxTokens || 8;
        this.windowMs = options.windowMs || 60000; // 1 minute

        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
        this.queue = [];
        this.processing = false;

        // Stats
        this.totalRequests = 0;
        this.queuedRequests = 0;
    }

    /**
     * Refill tokens based on time elapsed
     */
    refillTokens() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;

        if (elapsed >= this.windowMs) {
            // Full refill after window passes
            this.tokens = this.maxTokens;
            this.lastRefill = now;
        } else {
            // Partial refill based on time elapsed (smooth token replenishment)
            const tokensToAdd = (elapsed / this.windowMs) * this.maxTokens;
            this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
            this.lastRefill = now;
        }
    }

    /**
     * Acquire a token (wait if necessary)
     * @returns {Promise<void>} Resolves when a token is acquired
     */
    async acquire() {
        this.totalRequests++;

        return new Promise((resolve) => {
            const tryAcquire = () => {
                this.refillTokens();

                if (this.tokens >= 1) {
                    this.tokens -= 1;
                    resolve();
                    return true;
                }
                return false;
            };

            // Try immediately
            if (tryAcquire()) {
                return;
            }

            // Queue the request
            this.queuedRequests++;
            logger.debug(`Rate limiter [${this.name}]: Request queued`, {
                queueLength: this.queue.length + 1,
                tokensAvailable: this.tokens.toFixed(2),
            });

            this.queue.push({ resolve, tryAcquire });
            this.processQueue();
        });
    }

    /**
     * Process queued requests
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            this.refillTokens();

            if (this.tokens >= 1) {
                const { resolve } = this.queue.shift();
                this.tokens -= 1;
                resolve();
            } else {
                // Calculate wait time for next token
                const waitTime = Math.ceil((1 / this.maxTokens) * this.windowMs);
                await this.sleep(waitTime);
            }
        }

        this.processing = false;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current status
     */
    getStatus() {
        this.refillTokens();
        return {
            name: this.name,
            tokensAvailable: Math.floor(this.tokens),
            maxTokens: this.maxTokens,
            queueLength: this.queue.length,
            windowMs: this.windowMs,
            stats: {
                totalRequests: this.totalRequests,
                queuedRequests: this.queuedRequests,
            },
        };
    }

    /**
     * Reset the rate limiter
     */
    reset() {
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
        this.queue = [];
        this.totalRequests = 0;
        this.queuedRequests = 0;
        logger.info(`Rate limiter [${this.name}] reset`);
    }
}

/**
 * Rate Limiter Registry
 * Manages multiple rate limiters for different services
 */
class RateLimiterRegistry {
    constructor() {
        this.limiters = new Map();
    }

    /**
     * Get or create a rate limiter
     */
    getLimiter(name, options) {
        if (!this.limiters.has(name)) {
            this.limiters.set(name, new RateLimiter(name, options));
            logger.info(`Created rate limiter [${name}]`, {
                maxTokens: options?.maxTokens || 8,
                windowMs: options?.windowMs || 60000,
            });
        }
        return this.limiters.get(name);
    }

    /**
     * Get all limiters status
     */
    getAllStatus() {
        return Array.from(this.limiters.values()).map(l => l.getStatus());
    }
}

export const rateLimiterRegistry = new RateLimiterRegistry();

export default RateLimiter;
