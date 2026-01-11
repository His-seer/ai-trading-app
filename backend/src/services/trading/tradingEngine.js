import { userDb, positionDb, tradeDb, botDb } from '../../db/database.js';
import riskManager from '../risk/riskManager.js';

/**
 * Paper Trading Engine
 * Manages simulated trading with virtual balance
 */
class TradingEngine {
    /**
     * Open a new paper trade position
     */
    openPosition(symbol, marketType, side, entryPrice, aiReasoning) {
        // Get current user balance
        const user = userDb.get();

        // Calculate stop levels
        const { stopLoss, takeProfit, riskRewardRatio } = riskManager.calculateStopLevels(
            entryPrice, side, marketType
        );

        // Calculate position size
        const { quantity, riskAmount, positionValue } = riskManager.calculatePositionSize(
            user.balance, entryPrice, stopLoss, marketType
        );

        if (quantity <= 0) {
            return {
                success: false,
                error: 'Position size too small or insufficient balance',
            };
        }

        // Create position in database
        const result = positionDb.create({
            userId: user.id,
            symbol,
            marketType,
            side,
            entryPrice,
            quantity,
            stopLoss,
            takeProfit,
        });

        // Update bot status
        botDb.incrementTrades();

        return {
            success: true,
            position: {
                id: result.lastInsertRowid,
                symbol,
                marketType,
                side,
                entryPrice,
                quantity,
                stopLoss,
                takeProfit,
                positionValue,
                riskAmount,
                riskRewardRatio,
            },
            message: `Opened ${side.toUpperCase()} position for ${symbol} at $${entryPrice.toFixed(4)}`,
            reasoning: aiReasoning,
        };
    }

    /**
     * Close an existing position
     */
    closePosition(positionId, exitPrice, reason) {
        const user = userDb.get();
        const position = positionDb.getAll().find(p => p.id === positionId);

        if (!position) {
            return { success: false, error: 'Position not found' };
        }

        // Calculate P&L
        const { profitLoss, profitLossPercent } = riskManager.calculateProfitLoss(
            position.entry_price,
            exitPrice,
            position.quantity,
            position.side
        );

        // Update user balance
        const newBalance = user.balance + profitLoss;
        userDb.updateBalance(user.id, newBalance);

        // Record trade in history
        tradeDb.create({
            userId: user.id,
            symbol: position.symbol,
            marketType: position.market_type,
            side: position.side,
            entryPrice: position.entry_price,
            exitPrice,
            quantity: position.quantity,
            profitLoss,
            profitLossPercent,
            entryReason: position.entry_reason || 'AI recommendation',
            exitReason: reason,
            openedAt: position.opened_at,
        });

        // Remove position
        positionDb.delete(positionId);

        return {
            success: true,
            trade: {
                symbol: position.symbol,
                side: position.side,
                entryPrice: position.entry_price,
                exitPrice,
                quantity: position.quantity,
                profitLoss,
                profitLossPercent,
                reason,
            },
            newBalance,
            message: `Closed ${position.symbol} position with ${profitLoss >= 0 ? 'profit' : 'loss'} of $${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(2)}%)`,
        };
    }

    /**
     * Check all open positions for stop-loss/take-profit hits
     */
    checkPositions(marketPrices) {
        const positions = positionDb.getAll();
        const results = [];

        for (const position of positions) {
            const currentPrice = marketPrices[position.symbol];
            if (!currentPrice) continue;

            const { shouldClose, reason, exitPrice } = riskManager.shouldClosePosition(position, currentPrice);

            if (shouldClose) {
                const closeResult = this.closePosition(position.id, exitPrice || currentPrice, reason);
                results.push(closeResult);
            }
        }

        return results;
    }

    /**
     * Get current portfolio status
     */
    getPortfolio(userId = 1) {
        const user = userDb.get(userId);
        const positions = positionDb.getAll(userId);
        const stats = tradeDb.getStats(userId);
        const tradeHistory = tradeDb.getAll(userId, 20);

        // Calculate unrealized P&L (would need current prices in real scenario)
        const openPositionsValue = positions.reduce((sum, p) => {
            return sum + (p.entry_price * p.quantity);
        }, 0);

        return {
            balance: user.balance,
            initialBalance: 10000, // From config
            totalProfitLoss: user.balance - 10000,
            totalProfitLossPercent: ((user.balance - 10000) / 10000) * 100,
            openPositions: positions,
            openPositionsCount: positions.length,
            openPositionsValue,
            stats: {
                totalTrades: stats.totalTrades || 0,
                winningTrades: stats.winningTrades || 0,
                winRate: stats.totalTrades > 0
                    ? ((stats.winningTrades / stats.totalTrades) * 100).toFixed(1)
                    : 0,
                averageProfitLoss: stats.avgProfitLossPercent?.toFixed(2) || 0,
            },
            recentTrades: tradeHistory,
        };
    }

    /**
     * Get position by symbol
     */
    getPositionBySymbol(symbol) {
        return positionDb.getBySymbol(symbol);
    }

    /**
     * Reset account to initial balance (for testing)
     */
    resetAccount(userId = 1) {
        userDb.updateBalance(userId, 10000);
        return { success: true, message: 'Account reset to $10,000' };
    }
}

export default new TradingEngine();
