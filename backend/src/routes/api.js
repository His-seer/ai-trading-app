import express from 'express';
import tradingEngine from '../services/trading/tradingEngine.js';
import marketDataService from '../services/marketData/marketDataService.js';
import indicatorService from '../services/indicators/indicatorService.js';
import riskManager from '../services/risk/riskManager.js';
import autonomyLoop from '../scheduler/autonomyLoop.js';
import { decisionDb, userDb } from '../db/database.js';
import dailyStatsService from '../services/analytics/dailyStatsService.js';

const router = express.Router();

// ============================================
// Portfolio & Account Routes
// ============================================

/**
 * GET /api/portfolio
 * Get current portfolio status
 */
router.get('/portfolio', (req, res) => {
    try {
        const portfolio = tradingEngine.getPortfolio();
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/account/reset
 * Reset account to initial balance
 */
router.post('/account/reset', (req, res) => {
    try {
        const result = tradingEngine.resetAccount();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Market Data Routes
// ============================================

/**
 * GET /api/market/:type/:symbol
 * Get market data for a symbol
 */
router.get('/market/:type/:symbol', async (req, res) => {
    try {
        const { type, symbol } = req.params;
        const data = await marketDataService.getMarketData(symbol, type);

        // Calculate indicators
        const indicators = indicatorService.calculateAllIndicators(data.candles);

        res.json({
            success: true,
            data: {
                quote: data.quote,
                indicators,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/market/stocks
 * Get all monitored stocks data
 */
router.get('/market/stocks', async (req, res) => {
    try {
        const config = (await import('../config/config.js')).default;
        const stocksData = [];

        for (const symbol of config.stocks) {
            try {
                const quote = await marketDataService.getStockQuote(symbol);
                stocksData.push(quote);
            } catch (e) {
                stocksData.push({ symbol, error: e.message });
            }
        }

        res.json({ success: true, data: stocksData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/market/forex
 * Get all monitored forex pairs data
 */
router.get('/market/forex', async (req, res) => {
    try {
        const config = (await import('../config/config.js')).default;
        const forexData = [];

        for (const pair of config.forex) {
            try {
                const quote = await marketDataService.getForexQuote(pair);
                forexData.push(quote);
            } catch (e) {
                forexData.push({ pair, error: e.message });
            }
        }

        res.json({ success: true, data: forexData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AI Decisions Routes
// ============================================

/**
 * GET /api/decisions
 * Get AI decision history
 */
router.get('/decisions', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const decisions = decisionDb.getAll(limit);
        res.json({ success: true, data: decisions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/decisions
 * Clear all AI decision logs
 */
router.delete('/decisions', (req, res) => {
    try {
        const result = decisionDb.clearAll();
        res.json({ success: true, message: 'Decision logs cleared' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Bot Control Routes
// ============================================

/**
 * GET /api/bot/status
 * Get bot status
 */
router.get('/bot/status', (req, res) => {
    try {
        const status = autonomyLoop.getStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/bot/start
 * Start the trading bot
 */
router.post('/bot/start', (req, res) => {
    try {
        const { market = 'stock' } = req.body;
        const result = autonomyLoop.start(market);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/bot/stop
 * Stop the trading bot
 */
router.post('/bot/stop', (req, res) => {
    try {
        const result = autonomyLoop.stop();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/bot/market
 * Change market type
 */
router.post('/bot/market', (req, res) => {
    try {
        const { market } = req.body;
        const result = autonomyLoop.setMarket(market);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/bot/trigger
 * Manually trigger analysis cycle
 */
router.post('/bot/trigger', async (req, res) => {
    try {
        const result = await autonomyLoop.triggerCycle();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Risk Management Routes
// ============================================

/**
 * GET /api/risk/summary
 * Get risk management summary
 */
router.get('/risk/summary', (req, res) => {
    try {
        const summary = riskManager.getRiskSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Configuration Routes
// ============================================

/**
 * GET /api/config
 * Get public configuration
 */
router.get('/config', async (req, res) => {
    try {
        const config = (await import('../config/config.js')).default;
        res.json({
            success: true,
            data: {
                stocks: config.stocks,
                forex: config.forex,
                indicators: config.indicators,
                risk: riskManager.getRiskSummary(),
                autonomyIntervalMinutes: config.autonomyIntervalMinutes,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Analytics & Statistics Routes
// ============================================

/**
 * GET /api/stats/daily
 * Get today's daily statistics
 */
router.get('/stats/daily', (req, res) => {
    try {
        const stats = dailyStatsService.getDailyStats();
        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/stats/range
 * Get statistics for a date range
 * Query params: startDate, endDate (YYYY-MM-DD format)
 */
router.get('/stats/range', (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const stats = dailyStatsService.getStatsRange(1, startDate, endDate);
        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/stats/summary
 * Get statistics summary
 * Query params: days (default: 30)
 */
router.get('/stats/summary', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const summary = dailyStatsService.getSummary(1, days);
        res.json({
            success: true,
            data: summary,
            period: `Last ${days} days`,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/stats/metrics
 * Get comprehensive trading metrics
 * Query params: days (default: 30)
 */
router.get('/stats/metrics', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const metrics = dailyStatsService.getMetrics(1, days);
        res.json({
            success: true,
            data: metrics,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/stats/record
 * Record daily statistics (typically called at end of day)
 */
router.post('/stats/record', (req, res) => {
    try {
        const stats = dailyStatsService.recordDailyStats();
        res.json({
            success: true,
            message: 'Daily statistics recorded',
            data: stats,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/stats/winrate
 * Get win rate percentage
 * Query params: days (default: 30)
 */
router.get('/stats/winrate', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const winRate = dailyStatsService.getWinRate(1, days);
        res.json({
            success: true,
            data: {
                winRate: winRate.toFixed(2),
                period: `Last ${days} days`,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
