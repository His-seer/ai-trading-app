# Production Deployment Guide

This guide covers all necessary steps to deploy the AI Trading App to production without running `npm run dev`.

## Prerequisites

- Node.js 18+ installed
- All API keys configured in environment variables (see Environment Setup)
- Backend and frontend dependencies installed (`npm install` in both directories)

## Environment Setup

### Backend (.env)

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# API Keys (get from respective platforms)
GEMINI_API_KEY=your_gemini_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
TWELVEDATA_API_KEY=your_twelvedata_api_key_here  # Required for forex trading

# Optional
FRONTEND_URL=https://your-frontend-domain.com  # For CORS configuration
AUTO_START_BOT=true                             # Auto-start trading bot on server boot
AUTONOMY_INTERVAL_MINUTES=15                    # How often to run trading cycle (in minutes)
```

### Frontend (.env.local for development or .env.production for production)

```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

**Important**: For production builds, `NEXT_PUBLIC_API_URL` is **required**. The build will fail if it's not set.

## Database Initialization

### First-Time Setup (Fresh Deployment)

1. **Ensure data directory exists**:
   ```bash
   mkdir -p backend/data
   ```

2. **Initialize database schema**:
   ```bash
   cd backend
   npm run db:init
   ```

   This creates the SQLite database with the following tables:
   - `users` - Account balance and P&L
   - `positions` - Open trading positions
   - `trades` - Closed trade history
   - `decisions` - AI decision log
   - `bot_status` - Bot operational state

3. **Verify database initialization**:
   ```bash
   # Check if trading.db was created
   ls -lh backend/data/trading.db
   ```

### Handling Stale WAL Files

SQLite uses Write-Ahead Logging (WAL) mode for better concurrency. WAL creates additional files:
- `trading.db` - Main database file
- `trading.db-wal` - Write-ahead log file
- `trading.db-shm` - Shared memory file

**Stale WAL files** can occur after crashes or improper shutdowns. Before production deployment:

```bash
# Remove stale WAL files (only if database was not running)
rm -f backend/data/trading.db-wal
rm -f backend/data/trading.db-shm

# Verify only main database file remains
ls -lh backend/data/
```

## Starting the Application

### Backend (Production Mode)

```bash
cd backend

# Install dependencies
npm install --production

# Start server
npm start
```

The server will:
1. Initialize the database (if not already done)
2. Validate environment variables
3. Start Express API server on the configured PORT
4. **Auto-start the trading bot** if `AUTO_START_BOT=true`

Expected output:
```
╔═══════════════════════════════════════════════════════════╗
║          AI Trading Platform - Backend Server             ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:3001                 ║
║  Environment: production                                  ║
║  Gemini API: ✅ Configured                                ║
║  Finnhub API: ✅ Configured                               ║
╚═══════════════════════════════════════════════════════════╝
```

### Frontend (Production Mode)

```bash
cd frontend

# Install dependencies
npm install --production

# Build for production
npm run build

# Start server (serves from .next/standalone)
npm start
```

The frontend will be available on `http://localhost:3000` (or configured port).

## Verifying Production Deployment

### Health Checks

1. **Backend health endpoint**:
   ```bash
   curl http://localhost:3001/health
   ```
   Response: `{"status":"ok","timestamp":"2026-01-14T...","version":"1.0.0"}`

2. **API endpoint availability**:
   ```bash
   curl http://localhost:3001/
   ```
   Lists all available endpoints

3. **Portfolio data**:
   ```bash
   curl http://localhost:3001/api/portfolio
   ```

### Bot Status

Check if the trading bot is running:
```bash
curl http://localhost:3001/api/bot/status
```

Response includes:
- `isRunning` - Bot status
- `currentMarket` - 'stock' or 'forex'
- `tradesToday` - Number of trades executed today
- `intervalMinutes` - Check frequency

### Database Verification

```bash
# Check database integrity
cd backend
npm run db:init  # Safe to run - uses INSERT OR IGNORE

# View recent AI decisions
sqlite3 data/trading.db "SELECT symbol, recommendation, confidence, action_taken FROM decisions ORDER BY created_at DESC LIMIT 5;"
```

## Auto-Start Bot Configuration

By default, the bot requires manual startup via API (`POST /api/bot/start`).

**For automatic startup on server boot**, set in `.env`:
```env
AUTO_START_BOT=true
```

The bot will:
1. Start immediately after server boots
2. Check market data every `AUTONOMY_INTERVAL_MINUTES`
3. Generate AI recommendations and execute trades
4. Reset daily trade count at midnight
5. Gracefully stop on server shutdown

To disable auto-start and manually control the bot:
```bash
# Set to false or remove from .env
AUTO_START_BOT=false

# Manually start bot via API
curl -X POST http://localhost:3001/api/bot/start

# Stop bot
curl -X POST http://localhost:3001/api/bot/stop
```

## Graceful Shutdown

The application handles graceful shutdown on `SIGTERM` and `SIGINT` signals:

1. **On shutdown signal**:
   - Trading bot stops accepting new signals
   - Current API requests complete
   - Database connections close properly
   - WAL checkpoint executes
   - Process exits cleanly

2. **Timeout protection**:
   - 30-second grace period for shutdown
   - Force kills after timeout to prevent hanging

3. **Running in Docker/Kubernetes**:
   ```bash
   # Send graceful shutdown
   kill -SIGTERM <process_id>

   # Or in Docker
   docker stop <container_id>  # Sends SIGTERM
   ```

## Database Backup Strategy

### Manual Backup

```bash
# Backup database file
cp backend/data/trading.db backup/trading.db.$(date +%Y%m%d_%H%M%S)

# Backup with WAL state included
sqlite3 backend/data/trading.db ".backup 'backup/trading.db.backup'"
```

### Automated Backup (Cron Job)

```bash
# Add to crontab (daily backup at 2 AM)
0 2 * * * cp /path/to/backend/data/trading.db /backup/trading.db.$(date +\%Y\%m\%d)
```

### Restore from Backup

```bash
# Stop the application first
# Then restore
cp backup/trading.db.20260114 backend/data/trading.db

# Restart application
npm start
```

## Production Troubleshooting

### Bot Not Starting

**Issue**: Bot doesn't start even with `AUTO_START_BOT=true`

**Solution**:
1. Check backend logs for errors
2. Verify API keys are valid (Gemini, Finnhub, TwelveData)
3. Check internet connectivity to API services
4. Manually start bot via API: `POST /api/bot/start`

### Database Locked

**Issue**: `SQLITE_BUSY` error on startup

**Solution**:
1. Remove stale WAL files: `rm backend/data/trading.db-wal backend/data/trading.db-shm`
2. Ensure no other processes have database open
3. Restart application

### API Keys Invalid

**Issue**: 401/403 errors when fetching market data

**Solution**:
1. Verify API keys in `.env` are correct
2. Check API rate limits haven't been exceeded
3. Test API key directly with provider
4. Check API key permissions in provider dashboard

### Frontend Can't Connect to Backend

**Issue**: CORS error or connection refused

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` matches backend URL
2. Check backend is running and accessible: `curl http://backend-url/health`
3. Verify CORS whitelist includes frontend domain (in backend `.env` FRONTEND_URL)
4. Check firewall rules allow connection

## Monitoring & Logging

The application logs to:
- **Console**: Real-time output (visible in `npm start`)
- **File**: `backend/logs/` directory (if configured)

Monitor these key events:
- Bot cycle execution (every 15 min)
- API calls to Gemini, Finnhub, TwelveData
- Trade execution and position updates
- Database operations
- Error events

View logs in production:
```bash
# Tail recent logs (if using file logging)
tail -f backend/logs/app.log

# Filter for errors
grep "ERROR" backend/logs/app.log

# Filter for trading decisions
grep "DECISION" backend/logs/app.log
```

## Railway Deployment (Recommended)

If deploying to Railway.app:

1. **Set environment variables in Railway dashboard**:
   - `PORT=3001`
   - `NODE_ENV=production`
   - `GEMINI_API_KEY=...`
   - `FINNHUB_API_KEY=...`
   - `TWELVEDATA_API_KEY=...`
   - `FRONTEND_URL=https://your-railway-frontend.railway.app`
   - `AUTO_START_BOT=true`

2. **Database persistence**:
   - Railway provides persistent volumes
   - Database file persists between deployments
   - No manual backup needed (but recommended for safety)

3. **Viewing logs**:
   - Use Railway dashboard → Deployments → Logs
   - Or via Railway CLI: `railway logs`

## Production Checklist

Before going live, verify:

- [ ] All environment variables set correctly (.env files)
- [ ] Database initialized successfully (`npm run db:init`)
- [ ] Stale WAL files removed (`rm *.wal *.shm`)
- [ ] Backend starts without errors (`npm start` in backend/)
- [ ] Frontend builds successfully (`npm run build` in frontend/)
- [ ] Health endpoints respond correctly (curl /health)
- [ ] API keys are valid (test with actual API calls)
- [ ] Bot can be started and stopped via API
- [ ] At least one test trade cycle completes successfully
- [ ] Logs are being generated properly
- [ ] Graceful shutdown works (SIGTERM/SIGINT)
- [ ] Database backup procedure tested
- [ ] Frontend connects to backend correctly
- [ ] CORS settings allow frontend domain

## Next Steps

After successful deployment:

1. Monitor the trading bot for 24-48 hours in production
2. Review decision logs at `/api/decisions` endpoint
3. Verify trades execute as expected
4. Set up automated backups
5. Configure log aggregation (if needed)
6. Set up alerts for API failures or bot errors

For detailed architecture and system information, see `CLAUDE.md`.
