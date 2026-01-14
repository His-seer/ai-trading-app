import { userDb } from './src/db/database.js';
import tradingEngine from './src/services/trading/tradingEngine.js';
import config from './src/config/config.js';

// Mock DB if needed or use actual DB file (since it uses better-sqlite3 and file path, it should work if run from backend dir)
// We will run this from backend dir.

async function runTest() {
    console.log('--- Verifying Trading Flow ---');

    // 1. Reset Account
    console.log('1. Resetting Account...');
    tradingEngine.resetAccount();
    const initial = userDb.get();
    console.log(`Initial Balance: $${initial.balance}`);

    // 2. Open Position (Buy)
    console.log('\n2. Opening Position (Buy)...');
    // Mock risk manager or ensure config allows it. 
    // We'll trust the engine uses the DB.

    // Config normally comes from .env, but we might rely on defaults if loaded.
    // TradingEngine calls userDb.get().

    // Open a LONG position on 'TEST' at $100
    const openResult = tradingEngine.openPosition('TEST', 'stock', 'long', 100.00, 'Test Reasoning');

    if (!openResult.success) {
        console.error('❌ Failed to open position:', openResult.error);
        return;
    }

    console.log(`✅ Position Opened: ID ${openResult.position.id}, Qty ${openResult.position.quantity}`);

    // 3. Check Balance AFTER Open
    const afterOpen = userDb.get();
    console.log(`Balance after Open: $${afterOpen.balance}`);

    if (afterOpen.balance === initial.balance) {
        console.warn('⚠️  NOTICE: Balance did NOT decrease on open. (Simplified Paper Trading Model)');
    } else {
        console.log('✅ Balance decreased correctly.');
    }

    // 4. Close Position (Sell) with Profit
    // Price moves to $110 (10% gain)
    console.log('\n4. Closing Position (Sell) at $110...');
    const closeResult = tradingEngine.closePosition(openResult.position.id, 110.00, 'Take Profit');

    if (!closeResult.success) {
        console.error('❌ Failed to close position:', closeResult.error);
        return;
    }

    console.log(`✅ Position Closed. P&L: $${closeResult.trade.profitLoss}`);

    // 5. Check Final Balance
    const final = userDb.get();
    console.log(`Final Balance: $${final.balance}`);

    const expected = initial.balance + closeResult.trade.profitLoss;

    if (Math.abs(final.balance - expected) < 0.01) {
        console.log('✅ Final Balance is mathematically correct (Initial + Profit).');
    } else {
        console.error(`❌ Final Balance incorrect. Expected $${expected}, got $${final.balance}`);
    }
}

runTest();
