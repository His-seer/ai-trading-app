import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', '..', 'data', 'trading.db');

// Create database connection
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize database with schema
export function initializeDatabase() {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('✅ Database initialized successfully');
    return db;
}

// User operations
export const userDb = {
    get: (userId = 1) => {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    },

    updateBalance: (userId, newBalance) => {
        return db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newBalance, userId);
    },
};

// Position operations
export const positionDb = {
    getAll: (userId = 1) => {
        return db.prepare('SELECT * FROM positions WHERE user_id = ? ORDER BY opened_at DESC').all(userId);
    },

    getBySymbol: (symbol, userId = 1) => {
        return db.prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ?').get(userId, symbol);
    },

    create: (position) => {
        const stmt = db.prepare(`
      INSERT INTO positions (user_id, symbol, market_type, side, entry_price, quantity, stop_loss, take_profit)
      VALUES (@userId, @symbol, @marketType, @side, @entryPrice, @quantity, @stopLoss, @takeProfit)
    `);
        return stmt.run({
            userId: position.userId || 1,
            symbol: position.symbol,
            marketType: position.marketType,
            side: position.side,
            entryPrice: position.entryPrice,
            quantity: position.quantity,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
        });
    },

    delete: (id) => {
        return db.prepare('DELETE FROM positions WHERE id = ?').run(id);
    },

    count: (userId = 1) => {
        return db.prepare('SELECT COUNT(*) as count FROM positions WHERE user_id = ?').get(userId).count;
    },

    removeAll: () => {
        return db.prepare('DELETE FROM positions').run();
    },
};

// Trade operations
export const tradeDb = {
    getAll: (userId = 1, limit = 50) => {
        return db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY closed_at DESC LIMIT ?').all(userId, limit);
    },

    create: (trade) => {
        const stmt = db.prepare(`
      INSERT INTO trades (user_id, symbol, market_type, side, entry_price, exit_price, quantity, profit_loss, profit_loss_percent, entry_reason, exit_reason, opened_at)
      VALUES (@userId, @symbol, @marketType, @side, @entryPrice, @exitPrice, @quantity, @profitLoss, @profitLossPercent, @entryReason, @exitReason, @openedAt)
    `);
        return stmt.run({
            userId: trade.userId || 1,
            symbol: trade.symbol,
            marketType: trade.marketType,
            side: trade.side,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            quantity: trade.quantity,
            profitLoss: trade.profitLoss,
            profitLossPercent: trade.profitLossPercent,
            entryReason: trade.entryReason,
            exitReason: trade.exitReason,
            openedAt: trade.openedAt,
        });
    },

    removeAll: () => {
        return db.prepare('DELETE FROM trades').run();
    },

    getStats: (userId = 1) => {
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalTrades,
        SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winningTrades,
        SUM(profit_loss) as totalProfitLoss,
        AVG(profit_loss_percent) as avgProfitLossPercent
      FROM trades WHERE user_id = ?
    `).get(userId);
        return stats;
    },
};

// Decision log operations
export const decisionDb = {
    getAll: (limit = 50) => {
        return db.prepare('SELECT * FROM decisions ORDER BY created_at DESC LIMIT ?').all(limit);
    },

    create: (decision) => {
        const stmt = db.prepare(`
      INSERT INTO decisions (user_id, symbol, market_type, current_price, ema_short, ema_long, rsi, recommendation, confidence, reasoning, action_taken, ai_model)
      VALUES (@userId, @symbol, @marketType, @currentPrice, @emaShort, @emaLong, @rsi, @recommendation, @confidence, @reasoning, @actionTaken, @aiModel)
    `);
        stmt.run({
            userId: decision.userId || 1,
            symbol: decision.symbol,
            marketType: decision.marketType,
            currentPrice: decision.currentPrice,
            emaShort: decision.emaShort,
            emaLong: decision.emaLong,
            rsi: decision.rsi,
            recommendation: decision.recommendation,
            confidence: decision.confidence,
            reasoning: decision.reasoning,
            actionTaken: decision.actionTaken,
            aiModel: decision.aiModel || 'gemini',
        });
    },

    clearAll: () => {
        return db.prepare('DELETE FROM decisions').run();
    },
};

// Bot status operations
export const botDb = {
    getStatus: () => {
        return db.prepare('SELECT * FROM bot_status WHERE id = 1').get();
    },

    setRunning: (isRunning) => {
        return db.prepare('UPDATE bot_status SET is_running = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
            .run(isRunning ? 1 : 0);
    },

    incrementTrades: () => {
        return db.prepare('UPDATE bot_status SET trades_today = trades_today + 1, last_trade_at = CURRENT_TIMESTAMP WHERE id = 1').run();
    },

    updateLastCheck: () => {
        return db.prepare('UPDATE bot_status SET last_check_at = CURRENT_TIMESTAMP WHERE id = 1').run();
    },

    resetDailyTrades: () => {
        return db.prepare('UPDATE bot_status SET trades_today = 0 WHERE id = 1').run();
    },
};

export default db;
