import fs from 'fs';

const content = `# Environment Variables

# Google Gemini API Key
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

OPENAI_API_KEY=YOUR_OPENAI_API_KEY

# Finnhub API Key (Free)
FINNHUB_API_KEY=YOUR_FINNHUB_API_KEY

# Twelve Data API Key
TWELVEDATA_API_KEY=YOUR_TWELVEDATA_API_KEY

# Server Configuration
PORT=3001
NODE_ENV=development

# Trading Configuration
INITIAL_BALANCE=1000
MAX_RISK_PER_TRADE=0.02
MAX_TRADES_PER_DAY=5
AUTONOMY_INTERVAL_MINUTES=60
`;

fs.writeFileSync('.env', content, 'utf8');
console.log('✅ Updated .env file with INITIAL_BALANCE=1000');
