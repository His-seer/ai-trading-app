import axios from 'axios';
import config from '../../config/config.js';
import { rateLimiterRegistry } from '../../utils/rateLimiter.js';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Market Data Service
 * Fetches real-time and historical data for stocks and forex from Finnhub
 */
class MarketDataService {
    constructor() {
        this.apiKey = config.finnhubApiKey;
        this.twelveDataApiKey = config.twelveDataApiKey;
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache for quotes
        this.candleCacheTimeout = 300000; // 5 minute cache for historical data

        // Rate limiter for TwelveData API (8 credits/minute on free tier, using 7 for safety)
        const rateLimitConfig = config.rateLimit?.twelveData || { maxCredits: 7, windowMs: 60000 };
        this.rateLimiter = rateLimiterRegistry.getLimiter('twelveData', {
            maxTokens: rateLimitConfig.maxCredits,
            windowMs: rateLimitConfig.windowMs,
        });

        // Pending requests map to deduplicate simultaneous requests
        this.pendingRequests = new Map();
    }

    /**
     * Get real-time stock quote via TwelveData
     */
    async getStockQuote(symbol) {
        const cacheKey = `stock_quote_${symbol}`;

        // 1. Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        // 2. If request is already pending, return that promise instead of making duplicate request
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // 3. Make new request and track it
        const requestPromise = this._fetchStockQuote(symbol, cacheKey);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    async _fetchStockQuote(symbol, cacheKey) {
        try {
            // Wait for rate limit token before making API call
            await this.rateLimiter.acquire();

            const response = await axios.get('https://api.twelvedata.com/quote', {
                params: {
                    symbol,
                    apikey: this.twelveDataApiKey
                }
            });

            if (response.data.status === 'error') {
                throw new Error(response.data.message);
            }

            const data = {
                symbol,
                currentPrice: parseFloat(response.data.close),
                openPrice: parseFloat(response.data.open),
                highPrice: parseFloat(response.data.high),
                lowPrice: parseFloat(response.data.low),
                previousClose: parseFloat(response.data.previous_close),
                change: parseFloat(response.data.change),
                changePercent: parseFloat(response.data.percent_change),
                timestamp: new Date(response.data.timestamp * 1000),
            };

            this.setCache(cacheKey, data, this.cacheTimeout);
            return data;
        } catch (error) {
            console.error(`Error fetching stock quote for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch stock quote for ${symbol}`);
        }
    }

    /**
     * Get historical stock candles via TwelveData
     */
    async getStockCandles(symbol, resolution = '1day', fromDays = 100) {
        const cacheKey = `stock_candles_${symbol}_${resolution}_${fromDays}`;

        // 1. Check cache first (use longer TTL for historical data)
        const cached = this.getFromCache(cacheKey, this.candleCacheTimeout);
        if (cached) return cached;

        // 2. If request is already pending, return that promise instead of making duplicate request
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // 3. Make new request and track it
        const requestPromise = this._fetchStockCandles(symbol, resolution, fromDays, cacheKey);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    async _fetchStockCandles(symbol, resolution, fromDays, cacheKey) {
        // Map resolution format (Finnhub uses 'D', TwelveData uses '1day')
        let interval = '1day';
        if (resolution === '15') interval = '15min';
        if (resolution === '60' || resolution === '1h') interval = '1h';
        if (resolution === '4h') interval = '4h';

        try {
            // Wait for rate limit token before making API call
            await this.rateLimiter.acquire();

            const response = await axios.get('https://api.twelvedata.com/time_series', {
                params: {
                    symbol,
                    interval: interval,
                    outputsize: fromDays * 2, // Get extra to account for filtering
                    apikey: this.twelveDataApiKey
                }
            });

            if (response.data.status === 'error') {
                throw new Error(response.data.message);
            }

            const values = response.data.values || [];
            const candles = values.reverse().map(candle => ({
                timestamp: new Date(candle.datetime),
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close),
                volume: parseInt(candle.volume || 0),
            }));

            this.setCache(cacheKey, candles, this.candleCacheTimeout);
            return candles;
        } catch (error) {
            console.error(`Error fetching candles for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch historical data for ${symbol}`);
        }
    }

    /**
     * Get forex exchange rate via Twelve Data
     */
    async getForexQuote(pair) {
        const cacheKey = `forex_quote_${pair}`;

        // 1. Check cache first
        const cached = this.getFromCache(cacheKey, this.cacheTimeout);
        if (cached) return cached;

        // 2. If request is already pending, return that promise instead of making duplicate request
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // 3. Make new request and track it
        const requestPromise = this._fetchForexQuote(pair, cacheKey);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    async _fetchForexQuote(pair, cacheKey) {
        try {
            // Wait for rate limit token before making API call
            await this.rateLimiter.acquire();

            // Use Twelve Data for Forex
            const response = await axios.get('https://api.twelvedata.com/quote', {
                params: {
                    symbol: pair,
                    apikey: this.twelveDataApiKey
                }
            });

            if (response.data.status === 'error') {
                throw new Error(response.data.message);
            }

            const data = {
                pair,
                currentPrice: parseFloat(response.data.close),
                openPrice: parseFloat(response.data.open),
                highPrice: parseFloat(response.data.high),
                lowPrice: parseFloat(response.data.low),
                previousClose: parseFloat(response.data.previous_close),
                change: parseFloat(response.data.change),
                changePercent: parseFloat(response.data.percent_change),
                timestamp: new Date(response.data.timestamp * 1000),
            };

            this.setCache(cacheKey, data, this.cacheTimeout);
            return data;
        } catch (error) {
            console.error(`Error fetching forex quote for ${pair}:`, error.message);
            // Fallback only if absolutely necessary, but Finnhub free doesn't work so we fail.
            throw new Error(`Failed to fetch forex quote for ${pair}: ${error.message}`);
        }
    }

    /**
     * Get forex historical candles via Twelve Data
     */
    async getForexCandles(pair, resolution = '60', fromDays = 30) {
        const cacheKey = `forex_candles_${pair}_${resolution}_${fromDays}`;

        // 1. Check cache first (use longer TTL for historical data)
        const cached = this.getFromCache(cacheKey, this.candleCacheTimeout);
        if (cached) return cached;

        // 2. If request is already pending, return that promise instead of making duplicate request
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // 3. Make new request and track it
        const requestPromise = this._fetchForexCandles(pair, resolution, fromDays, cacheKey);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    async _fetchForexCandles(pair, resolution, fromDays, cacheKey) {
        // Twelve Data intervals: 1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month
        // Map resolution: '60' -> '1h', 'D' -> '1day'
        let interval = '1h';
        if (resolution === 'D' || resolution === '1D') interval = '1day';
        if (resolution === '15') interval = '15min';
        if (resolution === '30') interval = '30min';

        try {
            // Wait for rate limit token before making API call
            await this.rateLimiter.acquire();

            const response = await axios.get('https://api.twelvedata.com/time_series', {
                params: {
                    symbol: pair,
                    interval: interval,
                    outputsize: fromDays * 24, // Estimate count
                    apikey: this.twelveDataApiKey
                }
            });

            if (response.data.status === 'error') {
                throw new Error(response.data.message);
            }

            const values = response.data.values || [];
            const candles = values.reverse().map(candle => ({
                timestamp: new Date(candle.datetime),
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close),
                volume: parseInt(candle.volume || 0),
            }));

            this.setCache(cacheKey, candles, this.candleCacheTimeout);
            return candles;
        } catch (error) {
            console.error(`Error fetching forex candles for ${pair}:`, error.message);
            throw new Error(`Failed to fetch forex historical data for ${pair}`);
        }
    }

    /**
     * Get market data for any symbol (auto-detect type)
     */
    async getMarketData(symbol, marketType) {
        if (marketType === 'stock') {
            const [quote, candles] = await Promise.all([
                this.getStockQuote(symbol),
                this.getStockCandles(symbol)
            ]);
            return { quote, candles };
        } else if (marketType === 'forex') {
            const [quote, candles] = await Promise.all([
                this.getForexQuote(symbol),
                this.getForexCandles(symbol)
            ]);
            return { quote, candles };
        }
        throw new Error(`Unknown market type: ${marketType}`);
    }

    // Cache helpers
    getFromCache(key, ttl) {
        const cached = this.cache.get(key);
        const timeout = ttl || this.cacheTimeout;
        if (cached && Date.now() - cached.timestamp < timeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data, ttl) {
        const timeout = ttl || this.cacheTimeout;
        this.cache.set(key, { data, timestamp: Date.now(), ttl: timeout });
    }

    clearCache() {
        this.cache.clear();
        this.pendingRequests.clear();
    }
}

export default new MarketDataService();
