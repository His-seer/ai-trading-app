import cron from 'node-cron';
import config from '../config/config.js';
import marketDataService from '../services/marketData/marketDataService.js';
import indicatorService from '../services/indicators/indicatorService.js';
import geminiService from '../services/gemini/geminiService.js';
import riskManager from '../services/risk/riskManager.js';
import tradingEngine from '../services/trading/tradingEngine.js';
import { botDb, decisionDb, userDb } from '../db/database.js';

/**
 * Autonomy Loop Scheduler
 * Runs the trading analysis and execution cycle
 */
class AutonomyLoop {
    constructor() {
        this.cronJob = null;
        this.isRunning = false;
        this.currentMarket = 'stock'; // 'stock' or 'forex'
    }

    /**
     * Start the autonomy loop
     */
    start(market = 'stock') {
        if (this.isRunning) {
            return { success: false, message: 'Bot is already running' };
        }

        this.currentMarket = market;
        const interval = config.autonomyIntervalMinutes;

        // Schedule: every X minutes
        this.cronJob = cron.schedule(`*/${interval} * * * *`, async () => {
            await this.runCycle();
        });

        this.isRunning = true;
        botDb.setRunning(true);

        console.log(`🤖 Autonomy loop started - checking every ${interval} minutes`);
        console.log(`📊 Market: ${market.toUpperCase()}`);

        // Run first cycle immediately
        this.runCycle();

        return {
            success: true,
            message: `Bot started - analyzing ${market} market every ${interval} minutes`
        };
    }

    /**
     * Stop the autonomy loop
     */
    stop() {
        if (!this.isRunning) {
            return { success: false, message: 'Bot is not running' };
        }

        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }

        this.isRunning = false;
        botDb.setRunning(false);

        console.log('🛑 Autonomy loop stopped');
        return { success: true, message: 'Bot stopped' };
    }

    /**
     * Run a single analysis cycle
     */
    async runCycle() {
        console.log('\n=== Starting Analysis Cycle ===');
        console.log(`Time: ${new Date().toISOString()}`);

        botDb.updateLastCheck();

        const symbols = this.currentMarket === 'stock' ? config.stocks : config.forex;
        const user = userDb.get();

        for (const symbol of symbols) {
            try {
                console.log(`\n📈 Analyzing ${symbol}...`);

                // Step 1: Fetch market data
                const { quote, candles } = await marketDataService.getMarketData(symbol, this.currentMarket);
                console.log(`  Current price: $${quote.currentPrice.toFixed(4)}`);

                // Step 2: Calculate indicators
                const indicators = indicatorService.calculateAllIndicators(candles);
                console.log(`  EMA20: $${indicators.emaShort.toFixed(4)}, EMA50: $${indicators.emaLong.toFixed(4)}`);
                console.log(`  RSI: ${indicators.rsi.toFixed(1)}`);
                console.log(`  Trend: ${indicators.analysis.trendDirection}`);

                // Step 3: Check for existing position
                const existingPosition = tradingEngine.getPositionBySymbol(symbol);

                // Step 4: Get AI recommendation
                const aiDecision = await geminiService.getRecommendation(
                    symbol,
                    this.currentMarket,
                    indicators,
                    existingPosition
                );
                console.log(`  AI Recommendation: ${aiDecision.recommendation} (${aiDecision.confidence})`);
                console.log(`  Reasoning: ${aiDecision.reasoning}`);

                // Step 5: Apply risk rules and execute
                const actionResult = await this.executeDecision(
                    symbol,
                    this.currentMarket,
                    aiDecision,
                    indicators,
                    existingPosition,
                    user.balance
                );

                // Step 6: Log decision
                decisionDb.create({
                    symbol,
                    marketType: this.currentMarket,
                    currentPrice: indicators.currentPrice,
                    emaShort: indicators.emaShort,
                    emaLong: indicators.emaLong,
                    rsi: indicators.rsi,
                    recommendation: aiDecision.recommendation,
                    confidence: aiDecision.confidence,
                    reasoning: aiDecision.reasoning,
                    actionTaken: actionResult.action,
                });

                console.log(`  Action: ${actionResult.action}`);
                if (actionResult.message) {
                    console.log(`  Result: ${actionResult.message}`);
                }

                // Small delay between symbols to respect rate limits
                await this.delay(1000);

            } catch (error) {
                console.error(`  ❌ Error analyzing ${symbol}:`, error.message);
            }
        }

        console.log('\n=== Cycle Complete ===\n');
    }

    /**
     * Execute trading decision based on AI recommendation and rules
     */
    async executeDecision(symbol, marketType, aiDecision, indicators, existingPosition, balance) {
        const { recommendation, confidence, reasoning } = aiDecision;

        // BUY logic
        if (recommendation === 'BUY' && !existingPosition) {
            // Check risk rules
            const riskCheck = riskManager.canOpenTrade(symbol, marketType, balance);

            if (!riskCheck.allowed) {
                return {
                    action: 'BLOCKED',
                    message: riskCheck.checks.filter(c => !c.passed).map(c => c.message).join('; ')
                };
            }

            // Verify technical conditions (double-check AI)
            if (indicators.emaShort > indicators.emaLong && indicators.rsi > config.indicators.rsiBuyThreshold) {
                const result = tradingEngine.openPosition(
                    symbol,
                    marketType,
                    'long',
                    indicators.currentPrice,
                    reasoning
                );

                if (result.success) {
                    return { action: 'OPENED_LONG', message: result.message };
                }
                return { action: 'FAILED', message: result.error };
            }

            return { action: 'HOLD', message: 'Technical conditions not confirmed' };
        }

        // SELL logic (for existing position)
        if (recommendation === 'SELL' && existingPosition) {
            const result = tradingEngine.closePosition(
                existingPosition.id,
                indicators.currentPrice,
                'AI_SELL_SIGNAL'
            );

            if (result.success) {
                return { action: 'CLOSED_POSITION', message: result.message };
            }
            return { action: 'FAILED', message: result.error };
        }

        // Check stop-loss/take-profit for existing position
        if (existingPosition) {
            const { shouldClose, reason } = riskManager.shouldClosePosition(
                existingPosition,
                indicators.currentPrice
            );

            if (shouldClose) {
                const result = tradingEngine.closePosition(
                    existingPosition.id,
                    indicators.currentPrice,
                    reason
                );

                if (result.success) {
                    return { action: reason, message: result.message };
                }
            }
        }

        return { action: 'HOLD', message: 'No action taken' };
    }

    /**
     * Get current status
     */
    getStatus() {
        const dbStatus = botDb.getStatus();
        return {
            isRunning: this.isRunning,
            currentMarket: this.currentMarket,
            tradesToday: dbStatus?.trades_today || 0,
            maxTradesPerDay: config.maxTradesPerDay,
            lastCheckAt: dbStatus?.last_check_at,
            intervalMinutes: config.autonomyIntervalMinutes,
        };
    }

    /**
     * Set market type
     */
    setMarket(market) {
        if (!['stock', 'forex'].includes(market)) {
            return { success: false, message: 'Invalid market type. Use "stock" or "forex"' };
        }
        this.currentMarket = market;
        return { success: true, message: `Market set to ${market}` };
    }

    /**
     * Manually trigger a cycle
     */
    async triggerCycle() {
        if (!this.isRunning) {
            return { success: false, message: 'Bot is not running' };
        }
        await this.runCycle();
        return { success: true, message: 'Cycle triggered' };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default new AutonomyLoop();
