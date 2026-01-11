# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI-Assisted Stock & Forex Paper Trading Platform** - an educational platform that uses Google's Gemini AI to generate transparent trading recommendations. The architecture consists of:

- **Backend**: Node.js Express server with SQLite database, market data APIs, and AI-driven trading engine
- **Frontend**: Next.js React dashboard for portfolio tracking and bot control

## Development Commands

### Backend

```bash
# Development (with file watching)
npm run dev

# Production
npm start

# Initialize database with schema
npm run db:init

# Run tests
npm run test

# Run single test file
npm run test -- src/services/trading/tradingEngine.test.js
```

### Frontend

```bash
# Development (runs on localhost:3000)
npm run dev

# Production build and start
npm run build
npm run start

# Linting
npm run lint
```

## System Architecture

### Data Flow: The Autonomy Loop

The core system is driven by an **autonomy loop** (cron-based scheduler) that runs at configurable intervals (default: every 15 minutes):

```
autonomyLoop.js (scheduler/autonomyLoop.js)
  ├─ Fetches market data for configured symbols
  │  └─ marketDataService (services/marketData/)
  │     ├─ Finnhub API for stocks
  │     └─ TwelveData API for forex
  │
  ├─ Calculates technical indicators
  │  └─ indicatorService (services/indicators/)
  │     ├─ EMA 20 (short-term trend)
  │     ├─ EMA 50 (long-term trend)
  │     ├─ RSI (momentum)
  │     └─ MACD (trend confirmation)
  │
  ├─ Gets AI recommendation from Gemini
  │  └─ geminiService (services/gemini/geminiService.js)
  │     ├─ Sends structured market analysis to Gemini 2.0 Flash
  │     ├─ Receives BUY/SELL/HOLD recommendation + confidence + reasoning
  │     └─ Stores decision in decisions table for transparency
  │
  ├─ Evaluates risk constraints
  │  └─ riskManager (services/risk/riskManager.js)
  │     ├─ Checks daily trade limits
  │     ├─ Calculates stop-loss & take-profit levels
  │     └─ Validates position sizing (max 2% risk per trade)
  │
  └─ Executes trades if all conditions met
     └─ tradingEngine (services/trading/tradingEngine.js)
        ├─ Opens positions (BUY/SELL)
        ├─ Closes positions (profit/loss/stop-loss triggers)
        └─ Updates portfolio balance in SQLite
```

### Database Schema

The SQLite database (`data/trading.db`) contains:

- **users**: Account balance and P&L tracking
- **positions**: Open positions with entry prices and risk levels
- **trades**: Closed trades with P&L history
- **decisions**: AI decision log (symbol, indicators, recommendation, reasoning, action taken)
- **bot_status**: Current bot state (running/stopped, trades today, last check time)

### API Structure

**Backend routes** (`src/routes/api.js`):

- **Portfolio**: `GET /api/portfolio` - Current holdings, cash, P&L
- **Bot Control**: `POST /api/bot/start`, `POST /api/bot/stop` - Autonomy loop control
- **Market Data**: `GET /api/market/:type/:symbol` - Quote and candle data
- **Decisions**: `GET /api/decisions` - AI decision history with reasoning
- **Risk**: `GET /api/risk/summary` - Configuration and limits
- **Account**: `POST /api/account/reset` - Reset to initial balance

**Frontend** (`src/app/page.js` + components):

- PortfolioCard: Summary stats
- PositionsTable: Open positions with live P&L
- TradeHistory: Closed trade history
- AIDecisions: Decision log with AI reasoning
- BotControls: Start/stop autonomy loop
- MarketOverview: Real-time symbols overview

## Configuration & API Keys

Both backends require environment variables in `.env`:

```env
PORT=3001
GEMINI_API_KEY=        # Required: Google AI Studio
FINNHUB_API_KEY=       # Required: finnhub.io (stocks)
TWELVEDATA_API_KEY=    # Required for forex (optional for stocks only)
```

Key configuration in `src/config/config.js`:

- **Symbols**: Stocks array (AAPL, MSFT, NVDA, SPY, TSLA) and Forex pairs (EUR/USD, GBP/USD, etc.)
- **Technical Indicators**: EMA periods (20, 50), RSI period (14), RSI thresholds (55 buy, 45 sell)
- **Risk Rules**: Max 2% risk per trade, max 3 trades/day, 2.5% stop-loss for stocks, 35 pips for forex
- **Bot Interval**: Check every 15 minutes (configurable via `AUTONOMY_INTERVAL_MINUTES`)

## Trading Decision Logic

The Gemini AI uses a **conservative, rule-based framework**:

**BUY Requirements (ALL must be true)**:
1. EMA 20 > EMA 50 (confirmed uptrend)
2. RSI > 55 (bullish momentum)
3. No existing position in that symbol

**SELL Requirements (ANY can trigger)**:
1. EMA 20 < EMA 50 (trend reversal)
2. RSI < 45 (bearish momentum)
3. Stop-loss triggered by price drop
4. Take-profit reached
5. Existing position held (position can be closed for exit)

The AI provides a confidence score (0-100) and detailed reasoning for every decision.

## Common Development Tasks

### Adding a New Trading Symbol

1. Add to config: `src/config/config.js` (stocks or forex array)
2. Ensure market data API supports it (Finnhub for stocks, TwelveData for forex)
3. Optionally adjust risk parameters for that symbol
4. Database and routes automatically adapt

### Modifying Risk Rules

1. Edit `src/config/config.js` (risk object: stopLossPercent, takeProfitPercent, pipValue)
2. Update riskManager logic in `src/services/risk/riskManager.js` if needed
3. No database migration required

### Adjusting Bot Interval

1. Change `AUTONOMY_INTERVAL_MINUTES` in `.env`
2. Restart backend - cron schedule updates automatically

### Analyzing Decision Quality

1. Check `/api/decisions` endpoint to see AI reasoning for each trade
2. Database query: `SELECT * FROM decisions WHERE recommendation = 'BUY'`
3. Compare AI reasoning with actual P&L in trades table

### Testing Market Data Integration

```bash
# Test Finnhub stock data
node backend/test_finnhub.js

# Test Gemini AI
node backend/test_models.js
```

## Debugging Tips

- **Bot not running?** Check `src/scheduler/autonomyLoop.js` - verify market data APIs are accessible
- **Database locked?** Check for stale `data/trading.db-shm` files from previous crashes
- **No market data?** Verify API keys in `.env` - check console output for warnings
- **Portfolio not updating?** Verify SQLite writes in `src/services/trading/tradingEngine.js`
- **Frontend shows outdated data?** Clear browser cache and hard refresh (Ctrl+Shift+R)

## Key Files Reference

- **autonomyLoop.js** (scheduler/): Main loop orchestrator - everything starts here
- **tradingEngine.js** (services/trading/): Position & portfolio management
- **geminiService.js** (services/gemini/): AI decision generation
- **marketDataService.js** (services/marketData/): Finnhub & TwelveData integration
- **riskManager.js** (services/risk/): Risk validation & position sizing
- **indicatorService.js** (services/indicators/): Technical analysis calculations
- **api.js** (routes/): All HTTP endpoints
- **database.js** (db/): SQLite operations & schema
