import config from '../../config/config.js';
import { positionDb, botDb, tradeDb } from '../../db/database.js';

/**
 * Risk Manager Service
 * Enforces risk rules and protects capital
 */
class RiskManager {
    constructor() {
        this.maxRiskPerTrade = config.maxRiskPerTrade;
        this.maxTradesPerDay = config.maxTradesPerDay;
        this.riskConfig = config.risk;
    }

    /**
     * Check if a new trade is allowed based on risk rules
     */
    canOpenTrade(symbol, marketType, balance) {
        const checks = [];

        // Check 1: Maximum trades per day
        const botStatus = botDb.getStatus();
        if (botStatus.trades_today >= this.maxTradesPerDay) {
            checks.push({
                rule: 'MAX_TRADES_PER_DAY',
                passed: false,
                message: `Maximum ${this.maxTradesPerDay} trades per day reached`,
            });
        } else {
            checks.push({
                rule: 'MAX_TRADES_PER_DAY',
                passed: true,
                message: `${botStatus.trades_today}/${this.maxTradesPerDay} trades used today`,
            });
        }

        // Check 2: No existing position for this symbol
        const existingPosition = positionDb.getBySymbol(symbol);
        if (existingPosition) {
            checks.push({
                rule: 'NO_DUPLICATE_POSITION',
                passed: false,
                message: `Already have an open position for ${symbol}`,
            });
        } else {
            checks.push({
                rule: 'NO_DUPLICATE_POSITION',
                passed: true,
                message: `No existing position for ${symbol}`,
            });
        }

        // Check 3: Sufficient balance for minimum trade
        const minTradeValue = balance * this.maxRiskPerTrade;
        if (balance < 100) {
            checks.push({
                rule: 'MINIMUM_BALANCE',
                passed: false,
                message: `Balance ($${balance}) too low for trading`,
            });
        } else {
            checks.push({
                rule: 'MINIMUM_BALANCE',
                passed: true,
                message: `Balance ($${balance}) sufficient for trading`,
            });
        }

        // Check 4: Cooldown after loss (optional - 15 min after losing trade)
        if (botStatus.last_trade_at) {
            const lastTradeTime = new Date(botStatus.last_trade_at).getTime();
            const now = Date.now();
            const cooldownMs = 15 * 60 * 1000; // 15 minutes

            // Get last trade result
            const lastTrade = tradeDb.getAll(1, 1)[0];
            if (lastTrade && lastTrade.profit_loss < 0 && (now - lastTradeTime) < cooldownMs) {
                checks.push({
                    rule: 'LOSS_COOLDOWN',
                    passed: false,
                    message: 'Cooldown period after loss - waiting 15 minutes',
                });
            }
        }

        const allPassed = checks.every(c => c.passed);
        return {
            allowed: allPassed,
            checks,
            summary: allPassed ? 'All risk checks passed' : 'Risk checks failed',
        };
    }

    /**
     * Calculate position size based on risk
     */
    calculatePositionSize(balance, entryPrice, stopLossPrice, marketType) {
        const riskAmount = balance * this.maxRiskPerTrade;
        const riskPerUnit = Math.abs(entryPrice - stopLossPrice);

        if (riskPerUnit === 0) {
            return { quantity: 0, riskAmount: 0, error: 'Invalid stop loss' };
        }

        let quantity = riskAmount / riskPerUnit;

        // For stocks, round to whole shares
        if (marketType === 'stock') {
            quantity = Math.floor(quantity);
        } else {
            // For forex, round to 2 decimal places (micro lots)
            quantity = Math.round(quantity * 100) / 100;
        }

        // Ensure we can afford the position
        const positionValue = quantity * entryPrice;
        if (positionValue > balance * 0.95) {
            quantity = Math.floor((balance * 0.95) / entryPrice);
        }

        return {
            quantity,
            riskAmount,
            positionValue: quantity * entryPrice,
            riskPercent: (riskAmount / balance) * 100,
        };
    }

    /**
     * Calculate stop loss and take profit levels
     */
    calculateStopLevels(entryPrice, side, marketType) {
        const riskSettings = marketType === 'stock'
            ? this.riskConfig.stocks
            : this.riskConfig.forex;

        let stopLoss, takeProfit;

        if (marketType === 'stock') {
            if (side === 'long') {
                stopLoss = entryPrice * (1 - riskSettings.stopLossPercent);
                takeProfit = entryPrice * (1 + riskSettings.takeProfitPercent);
            } else {
                stopLoss = entryPrice * (1 + riskSettings.stopLossPercent);
                takeProfit = entryPrice * (1 - riskSettings.takeProfitPercent);
            }
        } else {
            // Forex uses pips
            const pipValue = riskSettings.pipValue;
            if (side === 'long') {
                stopLoss = entryPrice - (riskSettings.stopLossPips * pipValue);
                takeProfit = entryPrice + (riskSettings.takeProfitPips * pipValue);
            } else {
                stopLoss = entryPrice + (riskSettings.stopLossPips * pipValue);
                takeProfit = entryPrice - (riskSettings.takeProfitPips * pipValue);
            }
        }

        return {
            stopLoss: parseFloat(stopLoss.toFixed(5)),
            takeProfit: parseFloat(takeProfit.toFixed(5)),
            riskRewardRatio: marketType === 'stock'
                ? riskSettings.takeProfitPercent / riskSettings.stopLossPercent
                : riskSettings.takeProfitPips / riskSettings.stopLossPips,
        };
    }

    /**
     * Check if a position should be closed
     */
    shouldClosePosition(position, currentPrice) {
        const { side, stop_loss, take_profit, entry_price } = position;

        if (side === 'long') {
            if (currentPrice <= stop_loss) {
                return { shouldClose: true, reason: 'STOP_LOSS_HIT', exitPrice: stop_loss };
            }
            if (currentPrice >= take_profit) {
                return { shouldClose: true, reason: 'TAKE_PROFIT_HIT', exitPrice: take_profit };
            }
        } else {
            if (currentPrice >= stop_loss) {
                return { shouldClose: true, reason: 'STOP_LOSS_HIT', exitPrice: stop_loss };
            }
            if (currentPrice <= take_profit) {
                return { shouldClose: true, reason: 'TAKE_PROFIT_HIT', exitPrice: take_profit };
            }
        }

        return { shouldClose: false };
    }

    /**
     * Calculate P&L for a trade
     */
    calculateProfitLoss(entryPrice, exitPrice, quantity, side) {
        let profitLoss;
        if (side === 'long') {
            profitLoss = (exitPrice - entryPrice) * quantity;
        } else {
            profitLoss = (entryPrice - exitPrice) * quantity;
        }

        const profitLossPercent = ((exitPrice - entryPrice) / entryPrice) * 100 * (side === 'long' ? 1 : -1);

        return {
            profitLoss: parseFloat(profitLoss.toFixed(2)),
            profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
        };
    }

    /**
     * Get risk summary for display
     */
    getRiskSummary() {
        return {
            maxRiskPerTrade: `${this.maxRiskPerTrade * 100}%`,
            maxTradesPerDay: this.maxTradesPerDay,
            stocks: {
                stopLoss: `${this.riskConfig.stocks.stopLossPercent * 100}%`,
                takeProfit: `${this.riskConfig.stocks.takeProfitPercent * 100}%`,
            },
            forex: {
                stopLoss: `${this.riskConfig.forex.stopLossPips} pips`,
                takeProfit: `${this.riskConfig.forex.takeProfitPips} pips`,
            },
        };
    }
}

export default new RiskManager();
