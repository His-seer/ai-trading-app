import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config/config.js';
import { rateLimiterRegistry } from '../../utils/rateLimiter.js';

/**
 * Gemini AI Service with OpenAI Fallback
 * Provides AI-assisted trading decisions with transparency
 */
class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.geminiModel });
        this.fallbackModel = this.genAI.getGenerativeModel({ model: config.fallbackGeminiModel });

        // Rate limiter for Gemini API
        const rateLimitConfig = config.rateLimit?.gemini || { maxRequests: 10, windowMs: 60000 };
        this.rateLimiter = rateLimiterRegistry.getLimiter('gemini', {
            maxTokens: rateLimitConfig.maxRequests,
            windowMs: rateLimitConfig.windowMs,
        });

        // Circuit Breaker for Quota Limits
        this.isGeminiQuotaExceeded = false;
        this.quotaExceededTime = 0;
        this.QUOTA_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown
    }

    /**
     * Build structured prompt for AI analysis
     */
    buildPrompt(symbol, marketType, indicators, currentPosition) {
        const positionStatus = currentPosition
            ? `Currently HOLDING a ${currentPosition.side} position at $${currentPosition.entry_price}`
            : 'No open position';

        return `You are a Senior Technical Analyst for a professional trading desk.
Your goal is to identify High Probability Setups while protecting capital.

## Market Context for ${symbol} (${marketType.toUpperCase()})

### Price Action
- Price: $${indicators.currentPrice.toFixed(4)}
- Trend: ${indicators.analysis.trendDirection}
- BB Position: ${((indicators.bollingerBands.percentB) * 100).toFixed(1)}% (0=Lower, 50=Middle, 100=Upper)

### Momentum & Strength
- RSI (14): ${indicators.rsi.toFixed(1)} (${indicators.analysis.rsiCondition})
- MACD: ${indicators.macd ? `Hist: ${indicators.macd.histogram.toFixed(4)} (${indicators.macd.histogram > 0 ? 'Positive' : 'Negative'})` : 'N/A'}

### Volume Analysis
- Volume Ratio: ${indicators.volume.ratio.toFixed(2)}x vs 20-day Avg
- Status: ${indicators.volume.isHigh ? 'High Volume (Conviction)' : (indicators.volume.isLow ? 'Low Volume (Weakness)' : 'Normal Volume (Neutral)')}

### Position Status
${positionStatus}

## Trading Rules & Strategy
We look for CONFLUENCE of factors. 
1. **Trend is King**: Prefer trades in direction of EMATrend.
2. **Momentum**: RSI > 50 supports Buy, RSI < 50 supports Sell.
3. **Volume Validation**: Breakouts need High Volume (> 1.2x avg).
4. **Bollinger Bands**: 
   - Squeeze (Narrow Bands) = Potential explosive move coming.
   - Price > Upper Band = Potentially Overextended (watch for reversal).
   - Price < Lower Band = Potentially Oversold.

## Your Task
Analyze all factors and provide a Trade Quality Score (0-10).
- Score < 4: NO TRADE / WEAK
- Score 5-7: MODERATE / SPECULATIVE BUY (If risk is low)
- Score 8-10: HIGH PROBABILITY / ACTIONABLE

Format your response EXACTLY like this:
RECOMMENDATION: [BUY/SELL/HOLD]
CONFIDENCE: [high/medium/low]
SCORE: [0-10]
REASONING: [Clear, professional analysis citing specific indicators (e.g. "RSI is 60 and Volume is 1.5x, confirming the breakout...")]

Be precise. If volume is low, downgrade the score. If trend is unclear, recommend HOLD.`;
    }

    /**
     * Get trading recommendation from Gemini (Primary) with Gemini (Fallback)
     */
    async getRecommendation(symbol, marketType, indicators, currentPosition = null) {
        // Check circuit breaker
        const now = Date.now();
        if (this.isGeminiQuotaExceeded) {
            if (now - this.quotaExceededTime < this.QUOTA_COOLDOWN_MS) {
                return {
                    recommendation: 'HOLD',
                    confidence: 'low',
                    reasoning: 'AI analysis paused due to API quota limits. Using technical indicators only.',
                    aiModel: 'none (circuit breaker)',
                    error: true
                };
            } else {
                console.log('🔄 AI Quota cooldown expired. Attempting to resume services...');
                this.isGeminiQuotaExceeded = false;
            }
        }

        const prompt = this.buildPrompt(symbol, marketType, indicators, currentPosition);

        // helper to execute generation
        const generate = async (modelInstance, modelName) => {
            await this.rateLimiter.acquire();
            const result = await this.retryWithBackoff(async () => {
                return await modelInstance.generateContent(prompt);
            });
            const response = await result.response;
            const text = response.text();
            const parsed = this.parseResponse(text);
            // Append model version to reasoning for transparency, but keep 'gemini' 
            // as the aiModel key to satisfy strict DB CHECK constraints.
            parsed.reasoning = `[Model: ${modelName}] ${parsed.reasoning}`;
            return { ...parsed, aiModel: 'gemini' };
        };

        // 1. Try Primary Model
        try {
            return await generate(this.model, 'gemini-primary');
        } catch (primaryError) {
            this.handleGeminiError(primaryError, 'Primary');
            // Proceed to fallback
        }

        // 2. Try Fallback Model
        console.log(`⚠️ Switching to Fallback Model: ${config.fallbackGeminiModel}`);
        try {
            return await generate(this.fallbackModel, 'gemini-fallback');
        } catch (fallbackError) {
            this.handleGeminiError(fallbackError, 'Fallback');
        }

        // 3. Both failed
        return {
            recommendation: 'HOLD',
            confidence: 'low',
            reasoning: 'AI analysis unavailable (Both models failed). Defaulting to safe HOLD.',
            error: true,
            aiModel: 'gemini',
        };
    }

    handleGeminiError(error, source) {
        const isQuota = error.message.includes('429') ||
            error.message.toLowerCase().includes('quota') ||
            error.message.toLowerCase().includes('limit');

        if (isQuota) {
            console.warn(`⚠️ Gemini ${source} Quota Exceeded. Circuit breaker tripped.`);
            this.isGeminiQuotaExceeded = true;
            this.quotaExceededTime = Date.now();
        } else if (error.message.includes('503')) {
            console.warn(`⚠️ Gemini ${source} Service Overloaded.`);
        } else {
            console.error(`Gemini ${source} Error:`, error.message);
        }
    }

    /**
     * Parse Gemini's response into structured data
     */
    parseResponse(text) {
        const lines = text.trim().split('\n');
        let recommendation = 'HOLD';
        let confidence = 'medium';
        let score = 0;
        let reasoning = '';

        for (const line of lines) {
            if (line.startsWith('RECOMMENDATION:')) {
                const rec = line.replace('RECOMMENDATION:', '').trim().toUpperCase();
                if (['BUY', 'SELL', 'HOLD'].includes(rec)) {
                    recommendation = rec;
                }
            } else if (line.startsWith('CONFIDENCE:')) {
                const conf = line.replace('CONFIDENCE:', '').trim().toLowerCase();
                if (['high', 'medium', 'low'].includes(conf)) {
                    confidence = conf;
                }
            } else if (line.startsWith('SCORE:')) {
                const scoreStr = line.replace('SCORE:', '').trim();
                score = parseInt(scoreStr) || 0;
            } else if (line.startsWith('REASONING:')) {
                reasoning = line.replace('REASONING:', '').trim();
            }
        }

        // If reasoning spans multiple lines, capture them
        if (!reasoning) {
            const reasoningIndex = text.indexOf('REASONING:');
            if (reasoningIndex !== -1) {
                reasoning = text.substring(reasoningIndex + 10).trim();
            }
        }

        // Default reasoning if none provided
        if (!reasoning) {
            reasoning = 'Analysis completed based on technical indicators.';
        }

        return {
            recommendation,
            confidence,
            score,
            reasoning,
            rawResponse: text,
        };
    }

    /**
     * Get educational explanation for an indicator
     */
    async explainIndicator(indicatorName, value) {
        const prompts = {
            EMA: `Explain what an EMA (Exponential Moving Average) of ${value} means for a stock in simple terms. Keep it to 2 sentences.`,
            RSI: `Explain what an RSI (Relative Strength Index) of ${value} means for a stock. Is it overbought, oversold, or neutral? Keep it to 2 sentences.`,
            MACD: `Explain what the MACD indicator reading of ${value} means for trading. Keep it to 2 sentences.`,
        };

        const prompt = prompts[indicatorName] || `Explain the ${indicatorName} indicator value of ${value} in simple terms.`;

        try {
            // Wait for rate limit token before calling Gemini API
            await this.rateLimiter.acquire();

            const result = await this.retryWithBackoff(async () => {
                return await this.model.generateContent(prompt);
            });
            return result.response.text();
        } catch (error) {
            return `${indicatorName} is currently at ${value}.`;
        }
    }

    /**
     * Check if API is available
     */
    async healthCheck() {
        try {
            // Wait for rate limit token before calling Gemini API
            await this.rateLimiter.acquire();

            const result = await this.model.generateContent('Say "OK"');
            return result.response.text().includes('OK');
        } catch (error) {
            return false;
        }
    }

    /**
     * Helper: Retry operation with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
        let retries = 0;
        while (true) {
            try {
                return await operation();
            } catch (error) {
                // Only retry on 503 (Service Unavailable / Overloaded)
                const isOverloaded = error.message.includes('503') || error.message.includes('overloaded');

                if (isOverloaded && retries < maxRetries) {
                    retries++;
                    const delay = initialDelay * Math.pow(2, retries - 1); // 1s, 2s, 4s...
                    console.log(`⚠️ Gemini Overloaded. Retrying in ${delay}ms (Attempt ${retries}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }
    }
}

export default new GeminiService();
