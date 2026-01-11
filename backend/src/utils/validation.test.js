import { test } from 'node:test';
import assert from 'node:assert';
import {
    validateMarket,
    validateSymbol,
    validatePositiveNumber,
    validatePercentage,
    validateSide,
    validateRecommendation,
    validateBotStartRequest,
} from './validation.js';

/**
 * Validation Tests
 */

test('Validation - Market Type', async (t) => {
    await t.test('validateMarket accepts valid markets', () => {
        const result = validateMarket('stock');
        assert.ok(result.isValid);
    });

    await t.test('validateMarket accepts forex', () => {
        const result = validateMarket('forex');
        assert.ok(result.isValid);
    });

    await t.test('validateMarket accepts crypto', () => {
        const result = validateMarket('crypto');
        assert.ok(result.isValid);
    });

    await t.test('validateMarket case insensitive', () => {
        const result = validateMarket('STOCK');
        assert.ok(result.isValid);
    });

    await t.test('validateMarket rejects invalid markets', () => {
        const result = validateMarket('invalid');
        assert.ok(!result.isValid);
        assert.ok(result.error);
    });

    await t.test('validateMarket rejects empty market', () => {
        const result = validateMarket('');
        assert.ok(!result.isValid);
    });
});

test('Validation - Symbol', async (t) => {
    await t.test('validateSymbol accepts valid symbols', () => {
        const result = validateSymbol('AAPL');
        assert.ok(result.isValid);
    });

    await t.test('validateSymbol accepts forex pairs', () => {
        const result = validateSymbol('EUR/USD');
        assert.ok(result.isValid);
    });

    await t.test('validateSymbol rejects invalid characters', () => {
        const result = validateSymbol('AA@PL');
        assert.ok(!result.isValid);
    });

    await t.test('validateSymbol rejects too long symbols', () => {
        const result = validateSymbol('ABCDEFGHIJKLMNOPQRSTU');
        assert.ok(!result.isValid);
    });

    await t.test('validateSymbol rejects empty symbol', () => {
        const result = validateSymbol('');
        assert.ok(!result.isValid);
    });

    await t.test('validateSymbol rejects non-string', () => {
        const result = validateSymbol(123);
        assert.ok(!result.isValid);
    });
});

test('Validation - Positive Number', async (t) => {
    await t.test('validatePositiveNumber accepts valid numbers', () => {
        const result = validatePositiveNumber(100);
        assert.ok(result.isValid);
    });

    await t.test('validatePositiveNumber accepts decimals', () => {
        const result = validatePositiveNumber(99.99);
        assert.ok(result.isValid);
    });

    await t.test('validatePositiveNumber rejects zero', () => {
        const result = validatePositiveNumber(0);
        assert.ok(!result.isValid);
    });

    await t.test('validatePositiveNumber rejects negative', () => {
        const result = validatePositiveNumber(-100);
        assert.ok(!result.isValid);
    });

    await t.test('validatePositiveNumber rejects NaN', () => {
        const result = validatePositiveNumber('abc');
        assert.ok(!result.isValid);
    });

    await t.test('validatePositiveNumber respects minimum value', () => {
        const result = validatePositiveNumber(5, 'value', 10);
        assert.ok(!result.isValid);
    });
});

test('Validation - Percentage', async (t) => {
    await t.test('validatePercentage accepts valid percentages', () => {
        const result = validatePercentage(50);
        assert.ok(result.isValid);
    });

    await t.test('validatePercentage accepts 0', () => {
        const result = validatePercentage(0);
        assert.ok(result.isValid);
    });

    await t.test('validatePercentage accepts 100', () => {
        const result = validatePercentage(100);
        assert.ok(result.isValid);
    });

    await t.test('validatePercentage rejects over 100', () => {
        const result = validatePercentage(101);
        assert.ok(!result.isValid);
    });

    await t.test('validatePercentage rejects negative', () => {
        const result = validatePercentage(-1);
        assert.ok(!result.isValid);
    });
});

test('Validation - Side', async (t) => {
    await t.test('validateSide accepts long', () => {
        const result = validateSide('long');
        assert.ok(result.isValid);
    });

    await t.test('validateSide accepts short', () => {
        const result = validateSide('short');
        assert.ok(result.isValid);
    });

    await t.test('validateSide case insensitive', () => {
        const result = validateSide('LONG');
        assert.ok(result.isValid);
    });

    await t.test('validateSide rejects invalid sides', () => {
        const result = validateSide('invalid');
        assert.ok(!result.isValid);
    });
});

test('Validation - Recommendation', async (t) => {
    await t.test('validateRecommendation accepts BUY', () => {
        const result = validateRecommendation('BUY');
        assert.ok(result.isValid);
    });

    await t.test('validateRecommendation accepts SELL', () => {
        const result = validateRecommendation('SELL');
        assert.ok(result.isValid);
    });

    await t.test('validateRecommendation accepts HOLD', () => {
        const result = validateRecommendation('HOLD');
        assert.ok(result.isValid);
    });

    await t.test('validateRecommendation case insensitive', () => {
        const result = validateRecommendation('buy');
        assert.ok(result.isValid);
    });

    await t.test('validateRecommendation rejects invalid', () => {
        const result = validateRecommendation('INVALID');
        assert.ok(!result.isValid);
    });
});

test('Validation - Bot Request', async (t) => {
    await t.test('validateBotStartRequest accepts valid request', () => {
        const result = validateBotStartRequest({ market: 'stock' });
        assert.ok(result.isValid);
    });

    await t.test('validateBotStartRequest rejects invalid market', () => {
        const result = validateBotStartRequest({ market: 'invalid' });
        assert.ok(!result.isValid);
    });

    await t.test('validateBotStartRequest rejects non-object', () => {
        const result = validateBotStartRequest('not an object');
        assert.ok(!result.isValid);
    });
});
