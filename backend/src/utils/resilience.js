import { logger } from './logger.js';

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to failing services
 */
export class CircuitBreaker {
    constructor(name, options = {}) {
        this.name = name;
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1 minute default
        this.halfOpenRequests = options.halfOpenRequests || 1;

        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
    }

    /**
     * Check if request should be allowed
     */
    canAttempt() {
        if (this.state === 'CLOSED') {
            return true;
        }

        if (this.state === 'OPEN') {
            // Check if timeout has passed
            const now = Date.now();
            if (this.nextAttemptTime && now >= this.nextAttemptTime) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
                logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
                return true;
            }
            return false;
        }

        // HALF_OPEN state - allow limited requests
        return this.successCount < this.halfOpenRequests;
    }

    /**
     * Record successful call
     */
    recordSuccess() {
        this.failureCount = 0;

        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.halfOpenRequests) {
                this.state = 'CLOSED';
                logger.info(`Circuit breaker ${this.name} closed after successful recovery`);
            }
        }
    }

    /**
     * Record failed call
     */
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.resetTimeout;
            logger.warn(`Circuit breaker ${this.name} opened due to repeated failures`, {
                failureCount: this.failureCount,
                resetIn: `${this.resetTimeout}ms`,
            });
        }

        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.resetTimeout;
            logger.warn(`Circuit breaker ${this.name} reopened after failure in HALF_OPEN state`);
        }
    }

    /**
     * Get current state
     */
    getState() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
        };
    }
}

/**
 * Retry logic with exponential backoff
 */
export class RetryPolicy {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.initialDelay = options.initialDelay || 1000;
        this.maxDelay = options.maxDelay || 30000;
        this.backoffMultiplier = options.backoffMultiplier || 2;
        this.jitterFactor = options.jitterFactor || 0.1;
    }

    /**
     * Calculate delay for retry attempt
     */
    calculateDelay(attemptNumber) {
        let delay = this.initialDelay * Math.pow(this.backoffMultiplier, attemptNumber);
        delay = Math.min(delay, this.maxDelay);

        // Add jitter to prevent thundering herd
        const jitter = delay * this.jitterFactor * Math.random();
        return delay + jitter;
    }

    /**
     * Execute function with retries
     */
    async execute(fn, context = 'operation') {
        let lastError;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    logger.debug(`Retry ${context}`, {
                        attempt: attempt + 1,
                        maxRetries: this.maxRetries,
                        delayMs: Math.round(delay),
                        error: error.message,
                    });

                    await this.sleep(delay);
                } else {
                    logger.error(`Max retries exceeded for ${context}`, error);
                }
            }
        }

        throw lastError;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Circuit breaker registry
 */
class CircuitBreakerRegistry {
    constructor() {
        this.breakers = new Map();
    }

    /**
     * Get or create circuit breaker
     */
    getBreaker(name, options) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker(name, options));
        }
        return this.breakers.get(name);
    }

    /**
     * Get all breakers
     */
    getAllBreakers() {
        return Array.from(this.breakers.values()).map(b => b.getState());
    }

    /**
     * Reset a breaker
     */
    resetBreaker(name) {
        const breaker = this.breakers.get(name);
        if (breaker) {
            breaker.state = 'CLOSED';
            breaker.failureCount = 0;
            logger.info(`Circuit breaker ${name} manually reset`);
        }
    }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Wrapped API call with circuit breaker and retry
 */
export async function callWithResilience(serviceName, fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        circuitBreakerThreshold = 5,
        circuitBreakerTimeout = 60000,
    } = options;

    // Get circuit breaker
    const breaker = circuitBreakerRegistry.getBreaker(serviceName, {
        failureThreshold: circuitBreakerThreshold,
        resetTimeout: circuitBreakerTimeout,
    });

    // Check if request is allowed
    if (!breaker.canAttempt()) {
        const error = new Error(`Circuit breaker open for ${serviceName}`);
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
    }

    // Execute with retry
    const retryPolicy = new RetryPolicy({
        maxRetries,
        initialDelay,
    });

    try {
        const result = await retryPolicy.execute(fn, serviceName);
        breaker.recordSuccess();
        return result;
    } catch (error) {
        breaker.recordFailure();
        throw error;
    }
}

/**
 * Create resilient API client wrapper
 */
export function createResilientClient(client, options = {}) {
    const serviceName = options.serviceName || 'api-service';

    return {
        async request(fn) {
            return callWithResilience(serviceName, fn, options);
        },

        async get(url, config) {
            return this.request(() => client.get(url, config));
        },

        async post(url, data, config) {
            return this.request(() => client.post(url, data, config));
        },

        async put(url, data, config) {
            return this.request(() => client.put(url, data, config));
        },

        async delete(url, config) {
            return this.request(() => client.delete(url, config));
        },

        getCircuitBreakerStatus() {
            const breaker = circuitBreakerRegistry.getBreaker(serviceName);
            return breaker.getState();
        },
    };
}

export default {
    CircuitBreaker,
    RetryPolicy,
    circuitBreakerRegistry,
    callWithResilience,
    createResilientClient,
};
