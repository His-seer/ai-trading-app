import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config/config.js';

/**
 * Gemini AI Service
 * Provides AI-assisted trading decisions with transparency
 */
class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.geminiModel });
    }

    /**
     * Build structured prompt for AI analysis
     */
    buildPrompt(symbol, marketType, indicators, currentPosition) {
        const positionStatus = currentPosition
            ? `Currently HOLDING a ${currentPosition.side} position at $${currentPosition.entry_price}`
            : 'No open position';

        return `You are a conservative trading assistant for an educational paper trading platform.
Your role is to analyze market data and provide clear, explainable trading recommendations.

## Current Market Analysis for ${symbol} (${marketType.toUpperCase()})

### Price Data
- Current Price: $${indicators.currentPrice.toFixed(4)}

### Technical Indicators
- EMA 20 (Short-term): $${indicators.emaShort.toFixed(4)}
- EMA 50 (Long-term): $${indicators.emaLong.toFixed(4)}
- EMA Trend: ${indicators.emaShort > indicators.emaLong ? 'BULLISH (EMA20 > EMA50)' : 'BEARISH (EMA20 < EMA50)'}
- RSI (14): ${indicators.rsi.toFixed(1)}
${indicators.macd ? `- MACD Line: ${indicators.macd.macdLine.toFixed(4)}
- MACD Signal: ${indicators.macd.signalLine.toFixed(4)}
- MACD Histogram: ${indicators.macd.histogram.toFixed(4)}` : ''}

### Indicator Analysis
${indicators.analysis.summary}

### Position Status
${positionStatus}

## Trading Rules (MUST Follow)
BUY Conditions (ALL must be true):
1. EMA 20 > EMA 50 (uptrend confirmed)
2. RSI > 55 (bullish momentum)
3. No existing position

SELL/EXIT Conditions (ANY can trigger):
1. EMA 20 < EMA 50 (trend reversal)
2. RSI < 45 (momentum weakening)

HOLD: When conditions are unclear or mixed

## Your Task
Analyze the data above and provide:
1. A recommendation: BUY, SELL, or HOLD
2. Confidence level: high, medium, or low
3. Clear reasoning explaining your decision (2-3 sentences)

Format your response EXACTLY like this:
RECOMMENDATION: [BUY/SELL/HOLD]
CONFIDENCE: [high/medium/low]
REASONING: [Your clear explanation here]

Be conservative. If in doubt, recommend HOLD. Never recommend against the trading rules.`;
    }

    /**
     * Get trading recommendation from Gemini
     */
    async getRecommendation(symbol, marketType, indicators, currentPosition = null) {
        try {
            const prompt = this.buildPrompt(symbol, marketType, indicators, currentPosition);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseResponse(text);
        } catch (error) {
            console.error('Gemini API error:', error.message);
            return {
                recommendation: 'HOLD',
                confidence: 'low',
                reasoning: `AI analysis unavailable: ${error.message}. Defaulting to HOLD.`,
                error: true,
            };
        }
    }

    /**
     * Parse Gemini's response into structured data
     */
    parseResponse(text) {
        const lines = text.trim().split('\n');
        let recommendation = 'HOLD';
        let confidence = 'medium';
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
            const result = await this.model.generateContent(prompt);
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
            const result = await this.model.generateContent('Say "OK"');
            return result.response.text().includes('OK');
        } catch (error) {
            return false;
        }
    }
}

export default new GeminiService();
