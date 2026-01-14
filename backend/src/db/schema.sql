-- AI Trading Platform Database Schema
-- SQLite

-- Users table (for future multi-user support)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE DEFAULT 'default',
  balance REAL NOT NULL DEFAULT 10000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Open positions
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  symbol TEXT NOT NULL,
  market_type TEXT NOT NULL CHECK(market_type IN ('stock', 'forex')),
  side TEXT NOT NULL CHECK(side IN ('long', 'short')),
  entry_price REAL NOT NULL,
  quantity REAL NOT NULL,
  stop_loss REAL NOT NULL,
  take_profit REAL NOT NULL,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Trade history
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  symbol TEXT NOT NULL,
  market_type TEXT NOT NULL CHECK(market_type IN ('stock', 'forex')),
  side TEXT NOT NULL CHECK(side IN ('long', 'short')),
  entry_price REAL NOT NULL,
  exit_price REAL NOT NULL,
  quantity REAL NOT NULL,
  profit_loss REAL NOT NULL,
  profit_loss_percent REAL NOT NULL,
  entry_reason TEXT,
  exit_reason TEXT,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AI Decision log
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  symbol TEXT NOT NULL,
  market_type TEXT NOT NULL CHECK(market_type IN ('stock', 'forex')),
  current_price REAL,
  ema_short REAL,
  ema_long REAL,
  rsi REAL,
  recommendation TEXT NOT NULL CHECK(recommendation IN ('BUY', 'SELL', 'HOLD')),
  confidence TEXT CHECK(confidence IN ('high', 'medium', 'low')),
  reasoning TEXT NOT NULL,
  action_taken TEXT,
  ai_model TEXT DEFAULT 'gemini' CHECK(ai_model IN ('gemini', 'openai')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bot status
CREATE TABLE IF NOT EXISTS bot_status (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  is_running INTEGER DEFAULT 0,
  trades_today INTEGER DEFAULT 0,
  last_trade_at DATETIME,
  last_check_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily statistics
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  date DATE NOT NULL,
  starting_balance REAL NOT NULL,
  ending_balance REAL NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_profit_loss REAL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_closed ON trades(closed_at);
CREATE INDEX IF NOT EXISTS idx_decisions_symbol ON decisions(symbol);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);

-- Insert default user
INSERT OR IGNORE INTO users (id, username, balance) VALUES (1, 'default', 10000);

-- Insert default bot status
INSERT OR IGNORE INTO bot_status (id, is_running, trades_today) VALUES (1, 0, 0);
