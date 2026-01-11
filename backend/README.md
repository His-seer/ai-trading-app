# AI Trading Platform - Backend

AI-Assisted Stock & Forex Paper Trading Platform Backend

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys

Copy the example environment file:
```bash
copy .env.example .env
```

Edit `.env` and add your API keys:

#### Gemini API Key (Required)
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key and paste it as `GEMINI_API_KEY`

#### Finnhub API Key (Required)
1. Go to https://finnhub.io/register
2. Create a free account
3. Go to Dashboard and copy your API Key
4. Paste it as `FINNHUB_API_KEY`

### 3. Initialize Database
```bash
npm run db:init
```

### 4. Start Server
```bash
npm run dev
```

Server starts at: http://localhost:3001

## API Endpoints

### Portfolio
- `GET /api/portfolio` - Get portfolio status

### Bot Control
- `GET /api/bot/status` - Get bot status
- `POST /api/bot/start` - Start bot (body: `{ "market": "stock" }`)
- `POST /api/bot/stop` - Stop bot
- `POST /api/bot/market` - Change market (body: `{ "market": "forex" }`)

### Market Data
- `GET /api/market/stocks` - Get all stocks data
- `GET /api/market/forex` - Get all forex data
- `GET /api/market/:type/:symbol` - Get specific symbol data

### AI Decisions
- `GET /api/decisions` - Get decision history

### Configuration
- `GET /api/config` - Get trading configuration
- `GET /api/risk/summary` - Get risk rules

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `FINNHUB_API_KEY` | Finnhub API key | - |
| `INITIAL_BALANCE` | Starting virtual balance | 10000 |
| `MAX_RISK_PER_TRADE` | Risk per trade (decimal) | 0.02 |
| `MAX_TRADES_PER_DAY` | Maximum daily trades | 3 |
| `AUTONOMY_INTERVAL_MINUTES` | Check interval | 15 |
