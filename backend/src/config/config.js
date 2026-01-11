import dotenv from 'dotenv';
dotenv.config();

const config = {
    // Server
    port: parseInt(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // API Keys
    geminiApiKey: process.env.GEMINI_API_KEY,
    finnhubApiKey: process.env.FINNHUB_API_KEY,
    twelveDataApiKey: process.env.TWELVEDATA_API_KEY,

    // Trading Parameters
    initialBalance: parseFloat(process.env.INITIAL_BALANCE) || 10000,
    maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE) || 0.02,
    maxTradesPerDay: parseInt(process.env.MAX_TRADES_PER_DAY) || 3,
    autonomyIntervalMinutes: parseInt(process.env.AUTONOMY_INTERVAL_MINUTES) || 15,

    // Supported Assets
    stocks: ['AAPL', 'MSFT', 'NVDA', 'SPY', 'TSLA', 'GOOG', 'AMZN', 'META', 'NFLX', 'UBER'],
    forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD'],
    crypto: ['BTC/USD', 'ETH/USD', 'XRP/USD', 'ADA/USD', 'SOL/USD'],
    globalStocks: ['0700.HK', 'ASML.AS', 'BABA', 'SAP', 'UNIQLO'],  // Hong Kong, Netherlands, China, Germany, Japan

    // Technical Indicators
    indicators: {
        emaShort: 20,
        emaLong: 50,
        rsiPeriod: 14,
        rsiBuyThreshold: 55,
        rsiSellThreshold: 45,
    },

    // Risk Management
    risk: {
        stocks: {
            stopLossPercent: 0.025,      // 2.5%
            takeProfitPercent: 0.05,     // 5%
        },
        forex: {
            stopLossPips: 35,            // 35 pips
            takeProfitPips: 70,          // 70 pips
            pipValue: 0.0001,            // For most pairs
        },
    },

    // Gemini Model
    geminiModel: 'gemini-2.0-flash',

    // Rate Limiting
    rateLimit: {
        twelveData: {
            maxCredits: 7,        // Max API calls per window (reduced to 7 for safety)
            windowMs: 60000,      // 1 minute window
        },
    },
};

// Validation
if (!config.geminiApiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set. AI features will not work.');
}
if (!config.finnhubApiKey) {
    console.warn('⚠️  FINNHUB_API_KEY not set. Market data will not work.');
}

if (!config.twelveDataApiKey) {
    console.warn('⚠️  TWELVEDATA_API_KEY not set. Forex data will not work.');
}

export default config;
