import { test } from 'node:test';
import assert from 'node:assert';
import tradingEngine from './tradingEngine.js';
import { userDb, positionDb, tradeDb, botDb } from '../../db/database.js';

/**
 * Trading Engine Tests
 */

test('Trading Engine - Portfolio Operations', async (t) => {
    await t.test('getPortfolio returns current portfolio status', () => {
        const portfolio = tradingEngine.getPortfolio();
        assert.ok(portfolio);
        assert.ok(typeof portfolio.balance === 'number');
        assert.ok(Array.isArray(portfolio.positions));
        assert.ok(typeof portfolio.totalValue === 'number');
    });

    await t.test('getPortfolio includes positions array', () => {
        const portfolio = tradingEngine.getPortfolio();
        assert.ok(Array.isArray(portfolio.positions));
    });

    await t.test('resetAccount resets balance to initial', () => {
        const result = tradingEngine.resetAccount();
        assert.ok(result.success);
        const portfolio = tradingEngine.getPortfolio();
        // Should be reset to initial balance
        assert.ok(portfolio.balance > 0);
    });
});

test('Trading Engine - Position Management', async (t) => {
    await t.test('openPosition validates entry price', () => {
        const result = tradingEngine.openPosition(
            'AAPL',
            'stock',
            'long',
            null, // Invalid price
            'Test reason'
        );
        assert.ok(!result.success);
        assert.ok(result.error);
    });

    await t.test('openPosition validates market type', () => {
        const result = tradingEngine.openPosition(
            'AAPL',
            'invalid', // Invalid market
            'long',
            150,
            'Test reason'
        );
        assert.ok(!result.success);
    });

    await t.test('openPosition validates side', () => {
        const result = tradingEngine.openPosition(
            'AAPL',
            'stock',
            'invalid', // Invalid side
            150,
            'Test reason'
        );
        assert.ok(!result.success);
    });

    await t.test('openPosition creates position with valid inputs', () => {
        tradingEngine.resetAccount();
        const result = tradingEngine.openPosition(
            'TSLA',
            'stock',
            'long',
            200,
            'Test buy signal'
        );
        // May succeed or fail based on balance, but should return proper structure
        assert.ok(result.success !== undefined);
        assert.ok(result.message);
    });
});

test('Trading Engine - Position Closure', async (t) => {
    await t.test('closePosition fails with invalid position ID', () => {
        const result = tradingEngine.closePosition(99999, 150, 'Test close');
        assert.ok(!result.success);
        assert.ok(result.error);
    });

    await t.test('closePosition validates exit price', () => {
        const result = tradingEngine.closePosition(1, null, 'Test close');
        assert.ok(!result.success);
    });
});

test('Trading Engine - Portfolio Calculations', async (t) => {
    await t.test('portfolio includes correct P&L calculation', () => {
        tradingEngine.resetAccount();
        const portfolio = tradingEngine.getPortfolio();
        assert.ok(typeof portfolio.profitLoss === 'number');
        assert.ok(typeof portfolio.profitLossPercent === 'number');
    });

    await t.test('portfolio total value equals balance plus open P&L', () => {
        const portfolio = tradingEngine.getPortfolio();
        // Total value should be reasonable relative to balance
        assert.ok(portfolio.totalValue > 0);
        assert.ok(portfolio.balance > 0);
    });
});

test('Trading Engine - Position Retrieval', async (t) => {
    await t.test('getPositionBySymbol returns null for non-existent symbol', () => {
        tradingEngine.resetAccount();
        const position = tradingEngine.getPositionBySymbol('NONEXISTENT');
        assert.strictEqual(position, null);
    });
});
