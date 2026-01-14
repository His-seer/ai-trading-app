
import dotenv from 'dotenv';
dotenv.config();

import geminiService from './src/services/gemini/geminiService.js';
import indicatorService from './src/services/indicators/indicatorService.js';

async function verifyPrompt() {
    console.log('--- Verifying AI Analyst Prompt ---');

    // 1. Mock Candle Data (Downtrend with low volume)
    const candles = Array.from({ length: 50 }, (_, i) => ({
        close: 100 - i * 0.5, // Price dropping
        volume: 1000 + (Math.random() * 500) // Random low volume
    })).reverse(); // Oldest is index 0

    // 2. Calculate Indicators
    const indicators = indicatorService.calculateAllIndicators(candles);
    console.log('Indicators Calculated:', {
        price: indicators.currentPrice,
        volumeRatio: indicators.volume.ratio,
        bbPercentB: indicators.bollingerBands.percentB
    });

    // 3. Build Prompt
    const prompt = geminiService.buildPrompt('TEST', 'stock', indicators, null);

    console.log('\n--- Generated Prompt ---');
    console.log(prompt);
    console.log('------------------------');

    if (prompt.includes('Volume Ratio')) {
        console.log('✅ verification PASSED: Prompt includes Volume Analysis');
    } else {
        console.error('❌ verification FAILED: Prompt missing Volume Analysis');
    }

    if (prompt.includes('BB Position')) {
        console.log('✅ verification PASSED: Prompt includes Bollinger Bands');
    } else {
        console.error('❌ verification FAILED: Prompt missing Bollinger Bands');
    }
}

verifyPrompt();
