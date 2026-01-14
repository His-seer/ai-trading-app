import { decisionDb } from './src/db/database.js';

console.log('🧪 Testing Database Write...');

try {
    decisionDb.create({
        symbol: 'TEST-DB',
        marketType: 'stock',
        currentPrice: 100,
        emaShort: 105,
        emaLong: 100,
        rsi: 50,
        recommendation: 'HOLD',
        confidence: 'low',
        reasoning: 'Verifying DB schema fix',
        aiModel: 'gemini'
    });
    console.log('✅ Successfully inserted decision record with ai_model column.');
} catch (error) {
    console.error('❌ Database insertion failed:', error);
}
