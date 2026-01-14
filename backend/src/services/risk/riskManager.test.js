import { test } from 'node:test';
import assert from 'node:assert';
import riskManager from './riskManager.js';

/**
 * Risk Manager Tests
 */

test('Risk Manager - Trade Validation', async (t) => {
    await t.test('canOpenTrade returns validation checks', () => {
        const result = riskManager.canOpenTrade('AAPL', 'stock', 10000);
        assert.ok(result);
        assert.ok(typeof result.allowed === 'boolean');
        assert.ok(Array.isArray(result.checks));
    });

    await t.test('canOpenTrade checks for existing position', () => {
        const result = riskManager.canOpenTrade('AAPL', 'stock', 10000);
        const duplicateCheck = result.checks.find(c => c.rule === 'NO_DUPLICATE_POSITION');
        assert.ok(duplicateCheck);
    });

    await t.test('canOpenTrade checks maximum trades per day', () => {
        const result = riskManager.canOpenTrade('AAPL', 'stock', 10000);
        const tradeCheck = result.checks.find(c => c.rule === 'MAX_TRADES_PER_DAY');
        assert.ok(tradeCheck);
        assert.ok(typeof tradeCheck.passed === 'boolean');
    });

    await t.test('canOpenTrade checks minimum balance', () => {
        const result = riskManager.canOpenTrade('AAPL', 'stock', 50);
        const balanceCheck = result.checks.find(c => c.rule === 'MINIMUM_BALANCE');
        assert.ok(balanceCheck);
        assert.ok(!balanceCheck.passed); // Should fail with $50
    });
});

test('Risk Manager - Stop Loss & Take Profit', async (t) => {
    await t.test('calculateStopLevels returns valid levels', () => {
        const levels = riskManager.calculateStopLevels(100, 'long', 'stock');
        assert.ok(levels);
        assert.ok(typeof levels.stopLoss === 'number');
        assert.ok(typeof levels.takeProfit === 'number');
    });

    await t.test('calculateStopLevels - long position has SL below entry', () => {
        const levels = riskManager.calculateStopLevels(100, 'long', 'stock');
        assert.ok(levels.stopLoss < 100);
    });

    await t.test('calculateStopLevels - long position has TP above entry', () => {
        const levels = riskManager.calculateStopLevels(100, 'long', 'stock');
        assert.ok(levels.takeProfit > 100);
    });

    await t.test('calculateStopLevels - short position has SL above entry', () => {
        const levels = riskManager.calculateStopLevels(100, 'short', 'stock');
        assert.ok(levels.stopLoss > 100);
    });

    await t.test('calculateStopLevels - short position has TP below entry', () => {
        const levels = riskManager.calculateStopLevels(100, 'short', 'stock');
        assert.ok(levels.takeProfit < 100);
    });
});

test('Risk Manager - Position Sizing', async (t) => {
    await t.test('calculatePositionSize returns valid size', () => {
        const size = riskManager.calculatePositionSize(10000, 100, 97.5, 'stock');
        assert.ok(size);
        assert.ok(typeof size.quantity === 'number');
        assert.ok(typeof size.riskAmount === 'number');
    });

    await t.test('calculatePositionSize risk amount is reasonable', () => {
        const balance = 10000;
        const size = riskManager.calculatePositionSize(balance, 100, 97.5, 'stock');
        // Risk amount should not exceed max risk per trade
        assert.ok(size.riskAmount <= balance * 0.02); // 2% max risk
    });

    await t.test('calculatePositionSize respects balance constraints', () => {
        const balance = 100; // Very small balance
        const size = riskManager.calculatePositionSize(balance, 100, 97.5, 'stock');
        assert.ok(size.quantity >= 0);
    });
});

test('Risk Manager - Profit/Loss Calculation', async (t) => {
    await t.test('calculateProfitLoss - long position profit', () => {
        const pl = riskManager.calculateProfitLoss(100, 110, 10, 'long');
        assert.ok(pl.profitLoss > 0);
        assert.ok(pl.profitLossPercent > 0);
    });

    await t.test('calculateProfitLoss - long position loss', () => {
        const pl = riskManager.calculateProfitLoss(100, 90, 10, 'long');
        assert.ok(pl.profitLoss < 0);
        assert.ok(pl.profitLossPercent < 0);
    });

    await t.test('calculateProfitLoss - short position profit', () => {
        const pl = riskManager.calculateProfitLoss(100, 90, 10, 'short');
        assert.ok(pl.profitLoss > 0);
        assert.ok(pl.profitLossPercent > 0);
    });

    await t.test('calculateProfitLoss - short position loss', () => {
        const pl = riskManager.calculateProfitLoss(100, 110, 10, 'short');
        assert.ok(pl.profitLoss < 0);
        assert.ok(pl.profitLossPercent < 0);
    });

    await t.test('calculateProfitLoss - percentage calculation is correct', () => {
        const pl = riskManager.calculateProfitLoss(100, 110, 10, 'long');
        // (110-100) * 10 = 100, percentage = (100/1000) * 100 = 10%
        assert.ok(pl.profitLossPercent > 9 && pl.profitLossPercent < 11);
    });
});

test('Risk Manager - Position Closure Logic', async (t) => {
    await t.test('shouldClosePosition returns result object', () => {
        const mockPosition = {
            id: 1,
            entry_price: 100,
            stop_loss: 97.5,
            take_profit: 110,
            side: 'long',
        };
        const result = riskManager.shouldClosePosition(mockPosition, 105);
        assert.ok(result);
        assert.ok(typeof result.shouldClose === 'boolean');
        // Reason is optional when shouldClose is false
        if (result.shouldClose) {
            assert.ok(typeof result.reason === 'string');
        }
    });

    await t.test('shouldClosePosition - stop loss triggers on long', () => {
        const mockPosition = {
            id: 1,
            entry_price: 100,
            stop_loss: 97.5,
            take_profit: 110,
            side: 'long',
        };
        const result = riskManager.shouldClosePosition(mockPosition, 97); // Below SL
        assert.ok(result.shouldClose);
        assert.ok(result.reason.includes('STOP_LOSS'));
    });

    await t.test('shouldClosePosition - take profit triggers on long', () => {
        const mockPosition = {
            id: 1,
            entry_price: 100,
            stop_loss: 97.5,
            take_profit: 110,
            side: 'long',
        };
        const result = riskManager.shouldClosePosition(mockPosition, 111); // Above TP
        assert.ok(result.shouldClose);
        assert.ok(result.reason.includes('TAKE_PROFIT'));
    });

    await t.test('shouldClosePosition - no close between SL and TP', () => {
        const mockPosition = {
            id: 1,
            entry_price: 100,
            stop_loss: 97.5,
            take_profit: 110,
            side: 'long',
        };
        const result = riskManager.shouldClosePosition(mockPosition, 105); // Between SL and TP
        assert.ok(!result.shouldClose);
    });
});
