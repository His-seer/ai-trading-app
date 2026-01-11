import config from '../../config/config.js';

/**
 * Technical Indicators Service
 * Calculates EMA, RSI, MACD with clear explanations
 */
class IndicatorService {
    /**
     * Calculate Exponential Moving Average
     * @param {number[]} prices - Array of closing prices
     * @param {number} period - EMA period (e.g., 20, 50)
     * @returns {number[]} Array of EMA values
     */
    calculateEMA(prices, period) {
        if (prices.length < period) {
            throw new Error(`Need at least ${period} prices to calculate EMA${period}`);
        }

        const ema = [];
        const multiplier = 2 / (period + 1);

        // First EMA is SMA of first 'period' prices
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        ema.push(sum / period);

        // Calculate subsequent EMAs
        for (let i = period; i < prices.length; i++) {
            const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
            ema.push(currentEMA);
        }

        return ema;
    }

    /**
     * Calculate Relative Strength Index (RSI)
     * @param {number[]} prices - Array of closing prices
     * @param {number} period - RSI period (default 14)
     * @returns {number[]} Array of RSI values
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) {
            throw new Error(`Need at least ${period + 1} prices to calculate RSI`);
        }

        const rsi = [];
        const gains = [];
        const losses = [];

        // Calculate price changes
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // First average gain/loss (SMA)
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

        // First RSI
        if (avgLoss === 0) {
            rsi.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }

        // Subsequent RSIs with smoothed averages
        for (let i = period; i < gains.length; i++) {
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }

        return rsi;
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     * @param {number[]} prices - Array of closing prices
     * @param {number} fastPeriod - Fast EMA period (default 12)
     * @param {number} slowPeriod - Slow EMA period (default 26)
     * @param {number} signalPeriod - Signal line period (default 9)
     * @returns {Object} MACD line, signal line, and histogram
     */
    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod + signalPeriod) {
            throw new Error(`Need at least ${slowPeriod + signalPeriod} prices for MACD`);
        }

        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);

        // MACD line = Fast EMA - Slow EMA
        // Align arrays (slow EMA starts later)
        const offset = slowPeriod - fastPeriod;
        const macdLine = [];
        for (let i = 0; i < slowEMA.length; i++) {
            macdLine.push(fastEMA[i + offset] - slowEMA[i]);
        }

        // Signal line = 9-period EMA of MACD line
        const signalLine = this.calculateEMA(macdLine, signalPeriod);

        // Histogram = MACD - Signal
        const signalOffset = signalPeriod - 1;
        const histogram = [];
        for (let i = 0; i < signalLine.length; i++) {
            histogram.push(macdLine[i + signalOffset] - signalLine[i]);
        }

        return {
            macdLine: macdLine.slice(-1)[0],
            signalLine: signalLine.slice(-1)[0],
            histogram: histogram.slice(-1)[0],
        };
    }

    /**
     * Get all indicators for a symbol with explanations
     * @param {Object[]} candles - Historical candle data
     * @returns {Object} All calculated indicators with explanations
     */
    calculateAllIndicators(candles) {
        const prices = candles.map(c => c.close);
        const { emaShort, emaLong, rsiPeriod } = config.indicators;

        // Calculate indicators
        const emaShortValues = this.calculateEMA(prices, emaShort);
        const emaLongValues = this.calculateEMA(prices, emaLong);
        const rsiValues = this.calculateRSI(prices, rsiPeriod);

        // Get latest values
        const currentEmaShort = emaShortValues[emaShortValues.length - 1];
        const currentEmaLong = emaLongValues[emaLongValues.length - 1];
        const currentRsi = rsiValues[rsiValues.length - 1];
        const currentPrice = prices[prices.length - 1];

        // Generate explanations
        const trendDirection = currentEmaShort > currentEmaLong ? 'UPTREND' : 'DOWNTREND';
        const emaCrossover = this.detectEMACrossover(emaShortValues, emaLongValues);
        const rsiCondition = this.interpretRSI(currentRsi);

        let macd = null;
        try {
            macd = this.calculateMACD(prices);
        } catch (e) {
            // Not enough data for MACD
        }

        return {
            currentPrice,
            emaShort: currentEmaShort,
            emaLong: currentEmaLong,
            rsi: currentRsi,
            macd,
            analysis: {
                trendDirection,
                emaCrossover,
                rsiCondition,
                summary: this.generateSummary(trendDirection, emaCrossover, rsiCondition, currentRsi),
            },
        };
    }

    /**
     * Detect EMA crossover
     */
    detectEMACrossover(shortEMA, longEMA) {
        const alignOffset = longEMA.length < shortEMA.length ? shortEMA.length - longEMA.length : 0;

        const current = shortEMA[shortEMA.length - 1] - longEMA[longEMA.length - 1];
        const previous = shortEMA[shortEMA.length - 2] - longEMA[longEMA.length - 2];

        if (previous < 0 && current > 0) {
            return 'BULLISH_CROSSOVER';
        } else if (previous > 0 && current < 0) {
            return 'BEARISH_CROSSOVER';
        }
        return 'NO_CROSSOVER';
    }

    /**
     * Interpret RSI value
     */
    interpretRSI(rsi) {
        if (rsi >= 70) return 'OVERBOUGHT';
        if (rsi <= 30) return 'OVERSOLD';
        if (rsi >= 55) return 'BULLISH_MOMENTUM';
        if (rsi <= 45) return 'BEARISH_MOMENTUM';
        return 'NEUTRAL';
    }

    /**
     * Generate human-readable summary
     */
    generateSummary(trend, crossover, rsiCondition, rsiValue) {
        let summary = `The market is in a ${trend.toLowerCase().replace('_', ' ')}. `;

        if (crossover === 'BULLISH_CROSSOVER') {
            summary += 'A bullish EMA crossover just occurred, indicating potential upward momentum. ';
        } else if (crossover === 'BEARISH_CROSSOVER') {
            summary += 'A bearish EMA crossover just occurred, indicating potential downward momentum. ';
        }

        summary += `RSI is at ${rsiValue.toFixed(1)}, which is ${rsiCondition.toLowerCase().replace('_', ' ')}.`;

        return summary;
    }
}

export default new IndicatorService();
