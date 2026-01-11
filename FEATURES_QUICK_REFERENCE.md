# Features Quick Reference

A quick guide to all the new features added to the AI Trading Platform.

## 🚀 Core Features Added

### 1. **Input Validation**
Validates all incoming requests before processing.

```bash
# Automatically applied to all API endpoints
# Returns 400 Bad Request if validation fails

Example error response:
{
    "success": false,
    "error": "Validation failed",
    "details": "Market must be one of: stock, forex, crypto"
}
```

### 2. **Structured Logging**
All logs are structured JSON for better monitoring.

```bash
# Logs are written to: backend/logs/
# Files: error.log, warn.log, info.log, debug.log, combined.log

# Control log level with:
LOG_LEVEL=DEBUG
```

### 3. **Database Transactions**
Ensures data consistency for multi-step operations.

```bash
# Automatically used when opening/closing positions
# If any step fails, all changes are rolled back
```

### 4. **Resilience Features**
- **Circuit Breaker**: Stops repeated calls to failing APIs
- **Automatic Retries**: Retries failed requests with exponential backoff

```bash
# Check circuit breaker status:
curl http://localhost:3001/health
```

### 5. **Environment Validation**
Application won't start if required env vars are missing.

```bash
# Required variables:
GEMINI_API_KEY=
FINNHUB_API_KEY=

# Optional:
TWELVEDATA_API_KEY=
LOG_LEVEL=INFO
```

### 6. **Unit Tests**
Comprehensive test coverage for core services.

```bash
# Run all tests
npm test

# Run specific test file
npm test src/services/trading/tradingEngine.test.js
```

### 7. **Daily Statistics**
Track daily trading performance automatically.

```bash
# Get today's stats
GET /api/stats/daily

# Get stats summary (last 30 days)
GET /api/stats/summary?days=30

# Get win rate
GET /api/stats/winrate?days=30

# Example response:
{
    "date": "2024-01-10",
    "startingBalance": 10000,
    "endingBalance": 10250,
    "dayPL": 250,
    "dayPLPercent": "2.50",
    "totalTrades": 5,
    "winningTrades": 3,
    "winRate": "60.00"
}
```

### 8. **Cost Tracking**
Monitor API call costs for budget management.

```javascript
// Automatically tracks costs
// Available per service:
- Gemini API: $0.001/call
- Finnhub API: Free
- TwelveData API: Free
- Market Data Calls: $0.0001/call

// Get cost report
GET /api/cost-report
```

### 9. **Rate Limiting**
Prevents API abuse with per-IP and per-endpoint limits.

```bash
# Default limits:
# 100 requests per minute per IP
# 10 requests per minute for /api/bot endpoints
# 50 requests per minute per endpoint

# Error response when limited:
{
    "success": false,
    "error": "Too many requests, please try again later",
    "retryAfter": 45
}
```

### 10. **API Authentication**
Optional API key support for production use.

```bash
# Use in development (automatic):
No auth required

# Enable in production by setting:
VALID_API_KEYS=key1,key2,key3

# Send API key with requests:
curl -H "Authorization: Bearer YOUR_API_KEY" ...
# or
curl -H "X-API-Key: YOUR_API_KEY" ...
# or
curl "http://localhost:3001/api/...?api_key=YOUR_API_KEY"
```

### 11. **Health Checks**
Monitor application and service health.

```bash
# Full health check
GET /health
# Returns: { status: 'healthy'/'degraded', checks: {...} }

# Liveness probe (is app running?)
GET /health/live
# Used by container orchestration

# Readiness probe (is app ready for requests?)
GET /health/ready
# Returns 503 if database not available

# Specific checks:
GET /health/db         # Database connectivity
GET /health/resources  # Memory/CPU usage
GET /health/bot        # Bot status
```

### 12. **Database Migrations**
Automatic schema updates on startup.

```bash
# Migrations automatically run on server start
# Tracking table: migrations

# Built-in migrations:
1. Add indexes for performance
2. Add API cost tracking table
3. Add health metrics table
4. Add session tracking table
```

### 13. **Frontend Error Boundaries**
Catches and displays component errors gracefully.

```jsx
// Automatically enabled
// Shows user-friendly error dialog
// Development shows full error stack
// Users can "Try Again" or "Reload Page"
```

### 14. **Toast Notifications**
User feedback for all operations.

```javascript
import { toast } from '@/components/Toast';

// Usage
toast.success('Trade opened successfully');
toast.error('Failed to open position');
toast.warning('Low balance warning');
toast.info('Bot has started running');

// Auto-dismiss after 4 seconds (configurable)
```

### 15. **Enhanced Assets**
Support for more trading symbols.

```javascript
// Stocks (10 major US stocks)
AAPL, MSFT, NVDA, SPY, TSLA, GOOG, AMZN, META, NFLX, UBER

// Forex pairs (6 pairs)
EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, NZD/USD

// Cryptocurrencies (5 major cryptos)
BTC/USD, ETH/USD, XRP/USD, ADA/USD, SOL/USD

// Global stocks (5 international)
0700.HK, ASML.AS, BABA, SAP, UNIQLO

// Switch market in UI:
Market selector dropdown in top navigation
```

---

## 📊 Monitoring & Observability

### Check Application Status
```bash
# Health check
curl http://localhost:3001/health

# Full report example:
{
  "status": "healthy",
  "timestamp": "2024-01-10T12:00:00.000Z",
  "responseTime": 45,
  "checks": {
    "database": { "status": "healthy", "responseTime": 12 },
    "resources": { "uptime": 3600, "memory": { "heapUsed": 245, "heapTotal": 512 } },
    "bot": { "status": "running", "isRunning": true, "lastCheck": "2024-01-10T11:59:00Z" },
    "databasePool": { "status": "healthy", "type": "SQLite", "connections": 1 }
  }
}
```

### View Logs
```bash
# All logs
tail -f logs/combined.log

# Only errors
tail -f logs/error.log

# Only info
tail -f logs/info.log

# Search for specific operation
grep "BUY" logs/combined.log
grep "portfolio" logs/combined.log
```

### Monitor Performance
```bash
# API response time is logged with each request
# Example log entry:
{
  "timestamp": "2024-01-10T12:00:00.000Z",
  "level": "INFO",
  "message": "API Request - POST /api/bot/start",
  "statusCode": 200,
  "duration": "125ms"
}
```

---

## 🔒 Security

### Environment Variables
```bash
# Always set in production:
GEMINI_API_KEY=your_key
FINNHUB_API_KEY=your_key
VALID_API_KEYS=prod_key_1,prod_key_2
NODE_ENV=production

# Optional:
LOG_LEVEL=WARN
AUTONOMY_INTERVAL_MINUTES=30
```

### Rate Limiting
- **IP-based**: 100 req/min per IP
- **Endpoint-specific**: 10 req/min for sensitive endpoints
- **Automatic cleanup**: Removes expired entries

### Input Validation
- All market types validated
- All symbols checked for format
- Numeric values validated (min/max)
- Request bodies validated before processing

---

## 🧪 Testing

### Run Tests
```bash
# Install dependencies (if needed)
npm install

# Run all tests
npm test

# Run specific test file
npm test src/services/trading/tradingEngine.test.js

# Run with verbose output
npm test -- --verbose
```

### Test Coverage
- Trading Engine: 8 test cases
- Risk Manager: 12 test cases
- Validation: 20 test cases
- **Total: 40+ test cases**

---

## 📈 Analytics Endpoints

### Daily Statistics
```bash
# Today's stats
GET /api/stats/daily

# Date range (YYYY-MM-DD format)
GET /api/stats/range?startDate=2024-01-01&endDate=2024-01-31

# Summary for last N days
GET /api/stats/summary?days=30

# Comprehensive metrics
GET /api/stats/metrics?days=30

# Win rate percentage
GET /api/stats/winrate?days=30

# Record daily stats (called daily)
POST /api/stats/record
```

### Response Example
```json
{
  "success": true,
  "data": {
    "date": "2024-01-10",
    "startingBalance": 10000,
    "endingBalance": 10350,
    "dayPL": 350,
    "dayPLPercent": "3.50",
    "totalTrades": 6,
    "winningTrades": 4,
    "winRate": "66.67"
  }
}
```

---

## 🔧 Configuration

### Key Configuration Variables
```bash
# In backend/.env

# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=INFO

# APIs
GEMINI_API_KEY=your_key
FINNHUB_API_KEY=your_key
TWELVEDATA_API_KEY=your_key

# Trading
INITIAL_BALANCE=10000
MAX_RISK_PER_TRADE=0.02  # 2%
MAX_TRADES_PER_DAY=3
AUTONOMY_INTERVAL_MINUTES=15
```

### Modify Settings
- Edit `.env` file
- Restart server with `npm run dev`
- Changes take effect immediately

---

## 🚨 Troubleshooting

### Issue: Server won't start
```bash
✓ Check environment variables: all required vars set?
✓ Check database file exists: backend/data/trading.db
✓ Check logs: tail -f logs/error.log
```

### Issue: API calls failing with 429
```bash
→ You've hit the rate limit
→ Wait for retry-after seconds
→ Reduce request frequency
```

### Issue: Database locked error
```bash
→ Delete: backend/data/trading.db-shm
→ Delete: backend/data/trading.db-wal
→ Restart server
```

### Issue: Bot not running/executing trades
```bash
→ Check health: curl http://localhost:3001/health
→ Check bot status: GET /api/bot/status
→ Check logs: tail -f logs/combined.log
→ Verify API keys are correct
```

---

## 📞 Support

### Check Documentation
- `CLAUDE.md` - Architecture and setup
- `IMPLEMENTATION_SUMMARY.md` - All features detailed
- `backend/README.md` - Backend-specific docs
- `frontend/README.md` - Frontend-specific docs

### View Logs for Debugging
```bash
# All activity
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Follow specific keyword
grep -i "error\|failed" logs/combined.log
```

---

## 🎯 Next Steps

1. **Test the new endpoints** - Use curl or Postman
2. **Monitor health** - Set up health checks in monitoring system
3. **Configure auth** - Add API keys for production
4. **Set up logging** - Configure log aggregation
5. **Monitor costs** - Track API usage and costs
6. **Run tests** - Ensure all services working

---

**All features are production-ready and fully documented!**
