import { logger } from '../../utils/logger.js';

/**
 * Cost Tracking Service
 * Tracks API call costs for cost optimization
 */
class CostTracker {
    constructor() {
        this.costRegistry = new Map();
        this.costConfig = {
            'gemini': { perCall: 0.001, name: 'Gemini API' },
            'finnhub': { perCall: 0.0, name: 'Finnhub API' }, // Free tier
            'twelvedata': { perCall: 0.0, name: 'TwelveData API' }, // Free tier
            'marketDataCall': { perCall: 0.0001, name: 'Market Data Call' },
        };
        this.totalCost = 0;
        this.callCounts = new Map();
    }

    /**
     * Record an API call
     */
    recordCall(serviceName, metadata = {}) {
        const config = this.costConfig[serviceName];

        if (!config) {
            logger.warn('Unknown service in cost tracking', { serviceName });
            return;
        }

        const cost = config.perCall;
        this.totalCost += cost;

        // Update call count
        const currentCount = this.callCounts.get(serviceName) || 0;
        this.callCounts.set(serviceName, currentCount + 1);

        // Store entry
        const entry = {
            serviceName,
            cost,
            timestamp: new Date().toISOString(),
            ...metadata,
        };

        if (!this.costRegistry.has(serviceName)) {
            this.costRegistry.set(serviceName, []);
        }

        this.costRegistry.get(serviceName).push(entry);

        // Keep only last 1000 entries per service
        const entries = this.costRegistry.get(serviceName);
        if (entries.length > 1000) {
            this.costRegistry.set(serviceName, entries.slice(-1000));
        }

        logger.trace('API call recorded', { serviceName, cost });
    }

    /**
     * Get cost breakdown by service
     */
    getCostBreakdown() {
        const breakdown = {};

        for (const [service, entries] of this.costRegistry.entries()) {
            const totalCost = entries.reduce((sum, entry) => sum + entry.cost, 0);
            const count = entries.length;

            breakdown[service] = {
                serviceName: this.costConfig[service]?.name || service,
                callCount: count,
                totalCost: totalCost.toFixed(6),
                averageCostPerCall: (totalCost / count).toFixed(6),
            };
        }

        return breakdown;
    }

    /**
     * Get total estimated cost
     */
    getTotalCost() {
        return this.totalCost.toFixed(6);
    }

    /**
     * Get monthly projection
     */
    getMonthlyProjection() {
        const breakdown = this.getCostBreakdown();
        let projectedMonthly = 0;

        for (const service in breakdown) {
            const cost = parseFloat(breakdown[service].totalCost);
            projectedMonthly += cost;
        }

        // Project to 30 days if we have less data
        return (projectedMonthly * 30).toFixed(6);
    }

    /**
     * Get cost report
     */
    getReport() {
        return {
            currentCost: this.getTotalCost(),
            projectedMonthly: this.getMonthlyProjection(),
            breakdown: this.getCostBreakdown(),
            totalCalls: Array.from(this.callCounts.values()).reduce((a, b) => a + b, 0),
        };
    }

    /**
     * Reset cost tracking
     */
    reset() {
        this.costRegistry.clear();
        this.callCounts.clear();
        this.totalCost = 0;
        logger.info('Cost tracking reset');
    }

    /**
     * Get alerts for high costs
     */
    getAlerts(threshold = 1.0) {
        const alerts = [];
        const report = this.getReport();

        if (parseFloat(report.currentCost) > threshold) {
            alerts.push({
                level: 'WARNING',
                message: `Current cost (${report.currentCost}) exceeds threshold ($${threshold})`,
            });
        }

        if (parseFloat(report.projectedMonthly) > threshold * 30) {
            alerts.push({
                level: 'WARNING',
                message: `Projected monthly cost (${report.projectedMonthly}) exceeds threshold ($${threshold * 30})`,
            });
        }

        return alerts;
    }

    /**
     * Create middleware to track API calls
     */
    createTrackingMiddleware() {
        return (req, res, next) => {
            const originalJson = res.json;

            res.json = function (data) {
                // Record Gemini API calls
                if (req.path.includes('/gemini') || req.path.includes('/decisions')) {
                    this.costTracker.recordCall('gemini', {
                        endpoint: req.path,
                        method: req.method,
                    });
                }

                // Record market data calls
                if (req.path.includes('/market/')) {
                    this.costTracker.recordCall('marketDataCall', {
                        endpoint: req.path,
                        method: req.method,
                    });
                }

                return originalJson.call(this, data);
            }.bind({ costTracker: this });

            next();
        };
    }
}

export const costTracker = new CostTracker();

export default costTracker;
