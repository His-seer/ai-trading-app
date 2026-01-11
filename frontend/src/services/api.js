import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Client-side cache & request deduplication
 * Prevents duplicate API calls and reduces unnecessary requests
 */
class CacheManager {
    constructor(defaultTTL = 30000) { // 30 second default TTL
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.defaultTTL = defaultTTL;
    }

    /**
     * Get cached data if valid, otherwise return null
     */
    get(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        // Clean up expired cache
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }

    /**
     * Set cache data with TTL
     */
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Return pending request promise if exists, preventing duplicate API calls
     */
    getPending(key) {
        return this.pendingRequests.get(key);
    }

    /**
     * Register a pending request
     */
    setPending(key, promise) {
        this.pendingRequests.set(key, promise);
        // Clean up after promise resolves
        promise.finally(() => {
            this.pendingRequests.delete(key);
        });
        return promise;
    }

    clear() {
        this.cache.clear();
        this.pendingRequests.clear();
    }
}

const cacheManager = new CacheManager(30000); // 30 second cache for GET requests

/**
 * Wrapped API call with caching and deduplication
 */
function cachedGet(url, config = {}) {
    const cacheKey = `GET:${url}`;

    // 1. Check if we have valid cached data
    const cached = cacheManager.get(cacheKey);
    if (cached) {
        return Promise.resolve(cached);
    }

    // 2. Check if there's already a pending request for this URL
    const pending = cacheManager.getPending(cacheKey);
    if (pending) {
        return pending;
    }

    // 3. Make new API call and cache the result
    const promise = api.get(url, config)
        .then(res => {
            cacheManager.set(cacheKey, res.data);
            return res.data;
        });

    return cacheManager.setPending(cacheKey, promise);
}

// Portfolio
export const getPortfolio = () => cachedGet('/api/portfolio');

// Bot Control
export const getBotStatus = () => cachedGet('/api/bot/status');
export const startBot = (market = 'stock') => api.post('/api/bot/start', { market }).then(res => res.data);
export const stopBot = () => api.post('/api/bot/stop').then(res => res.data);
export const setMarket = (market) => api.post('/api/bot/market', { market }).then(res => res.data);
export const triggerCycle = () => api.post('/api/bot/trigger').then(res => res.data);
export const triggerBot = () => api.post('/api/bot/trigger').then(res => res.data);

// Market Data
export const getStocksData = () => cachedGet('/api/market/stocks');
export const getForexData = () => cachedGet('/api/market/forex');
export const getSymbolData = (type, symbol) => cachedGet(`/api/market/${type}/${symbol}`);

// AI Decisions
export const getDecisions = (limit = 50) => cachedGet('/api/decisions', { params: { limit } });
export const clearDecisions = () => api.delete('/api/decisions').then(res => res.data);

// Configuration
export const getConfig = () => cachedGet('/api/config');
export const getRiskSummary = () => cachedGet('/api/risk/summary');

// Account
export const resetAccount = () => api.post('/api/account/reset').then(res => res.data);

// Utility for manual cache clearing (useful for testing)
export const clearCache = () => {
    cacheManager.clear();
};

export default api;
