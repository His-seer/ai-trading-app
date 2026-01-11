import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Simple API Key Authentication Middleware
 * Stores API keys in environment/config for now
 */

// For development, default API key
const DEFAULT_DEV_KEY = 'dev-key-change-in-production';

/**
 * Generate a secure API key
 */
export function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API key
 */
export function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key from request
 */
function extractApiKey(req) {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check X-API-Key header
    if (req.headers['x-api-key']) {
        return req.headers['x-api-key'];
    }

    // Check query parameter
    if (req.query.api_key) {
        return req.query.api_key;
    }

    return null;
}

/**
 * Check if API key is valid
 */
function isValidApiKey(key) {
    // In development, accept default key
    if (process.env.NODE_ENV === 'development') {
        return key === DEFAULT_DEV_KEY;
    }

    // In production, check against stored keys
    // For now, check environment variable
    const validKeys = (process.env.VALID_API_KEYS || '').split(',');
    return validKeys.includes(key);
}

/**
 * Authentication middleware factory
 * @param {boolean} required - Whether auth is required (default: true)
 * @param {Array<string>} whitelist - Paths that don't require auth
 */
export function createAuthMiddleware(options = {}) {
    const {
        required = false, // Make it optional by default for backwards compatibility
        whitelist = [
            '/health',
            '/api/config',
            '/api/docs',
            '/api/health',
        ],
    } = options;

    return (req, res, next) => {
        // Check whitelist
        if (whitelist.some(path => req.path.startsWith(path))) {
            return next();
        }

        const apiKey = extractApiKey(req);

        // If auth is required but no key provided
        if (required && !apiKey) {
            logger.warn('Missing API key', { path: req.path, ip: req.ip });
            return res.status(401).json({
                success: false,
                error: 'API key required',
                details: 'Provide API key via Authorization header (Bearer), X-API-Key header, or api_key query parameter',
            });
        }

        // If key provided, validate it
        if (apiKey && !isValidApiKey(apiKey)) {
            logger.warn('Invalid API key', { path: req.path, ip: req.ip });
            return res.status(403).json({
                success: false,
                error: 'Invalid API key',
            });
        }

        // Attach user info to request if needed
        if (apiKey) {
            req.user = {
                apiKey: apiKey.substring(0, 10) + '...',
                isAuthenticated: true,
            };
        }

        next();
    };
}

/**
 * Optional authentication middleware
 * Authenticates if key is provided, but doesn't require it
 */
export function optionalAuth() {
    return createAuthMiddleware({ required: false });
}

/**
 * Required authentication middleware
 */
export function requiredAuth() {
    return createAuthMiddleware({ required: true });
}

/**
 * Create middleware that allows specific methods without auth
 */
export function conditionalAuth(options = {}) {
    const {
        unprotectedMethods = ['GET'],
        whitelist = [],
    } = options;

    return (req, res, next) => {
        // Allow GET requests without auth
        if (unprotectedMethods.includes(req.method)) {
            return next();
        }

        // Check whitelist
        if (whitelist.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Require auth for other methods
        return requiredAuth()(req, res, next);
    };
}

/**
 * Middleware to add API key info to responses
 */
export function attachApiKeyInfo() {
    return (req, res, next) => {
        if (req.user && req.user.isAuthenticated) {
            res.set('X-API-Key-Used', req.user.apiKey);
        }
        next();
    };
}

export default {
    generateApiKey,
    hashApiKey,
    createAuthMiddleware,
    optionalAuth,
    requiredAuth,
    conditionalAuth,
    attachApiKeyInfo,
    DEFAULT_DEV_KEY,
};
