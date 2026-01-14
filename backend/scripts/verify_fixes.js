import geminiService from './src/services/gemini/geminiService.js';
import dotenv from 'dotenv';
dotenv.config();

async function verifyFixes() {
    console.log('🧪 Starting Verification of AI Quota Fixes...');

    // Test 1: Health Check (Simple API Call)
    console.log('\nScanning connectivity...');
    const isHealthy = await geminiService.healthCheck();
    if (isHealthy) {
        console.log('✅ Gemini API is ONLINE and accessible.');
    } else {
        console.error('❌ Gemini API Health Check FAILED.');
    }

    // Test 2: Recommendation Generation (Mock Data)
    console.log('\nTesting Recommendation Generation (Mock Data)...');
    const symbol = 'TEST/PAIR';
    const marketType = 'forex';
    const indicators = {
        currentPrice: 1.10,
        emaShort: 1.11,
        emaLong: 1.12,
        rsi: 40,
        analysis: { summary: 'Bearish trend detected.' }
    };

    try {
        const result = await geminiService.getRecommendation(symbol, marketType, indicators);
        console.log('\n📋 Result Received:');
        console.log(`- Recommendation: ${result.recommendation}`);
        console.log(`- Model Used: ${result.aiModel}`);
        console.log(`- Error: ${result.error || false}`);

        if (result.aiModel === 'gemini') {
            console.log('✅ Success: Gemini model successfully generated a response.');
        } else if (result.aiModel === 'openai') {
            console.log('⚠️ Notice: System fell back to OpenAI (check logs for why Gemini was skipped).');
        } else {
            console.log('⚠️ Notice: AI unavailable, returned safe HOLD recommendation.');
        }

    } catch (error) {
        console.error('❌ Unexpected Error during generation:', error);
    }
}

verifyFixes();
