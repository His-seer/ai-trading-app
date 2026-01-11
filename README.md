# AI-Assisted Stock & Forex Investing Platform

An educational paper trading platform with AI-assisted decision support.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Gemini API key (from Google AI Studio)
- Finnhub API key (free at finnhub.io)

### Setup

1. **Configure Backend**
```bash
cd backend
copy .env.example .env
# Edit .env with your API keys
npm install
npm run dev
```

2. **Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

3. **Open Dashboard**
Navigate to http://localhost:3000

## 📁 Project Structure

```
AI Trading App/
├── backend/          # Node.js API server
│   ├── src/
│   │   ├── config/   # Configuration
│   │   ├── db/       # SQLite database
│   │   ├── services/ # Core services
│   │   ├── routes/   # API endpoints
│   │   └── scheduler/# Autonomy loop
│   └── README.md
│
├── frontend/         # Next.js dashboard
│   ├── src/
│   │   ├── app/      # Pages
│   │   ├── components/
│   │   └── services/ # API client
│   └── README.md
│
└── README.md         # This file
```

## ✨ Features

- **Paper Trading**: Trade stocks and forex with virtual $10,000
- **AI Decisions**: Gemini 2.0 Flash provides transparent recommendations
- **Risk Management**: Stop-loss, take-profit, position sizing
- **Autonomy Loop**: Bot runs every 15 minutes (configurable)
- **Dashboard**: Real-time portfolio tracking

## ⚠️ Disclaimer

This is an **educational platform** for learning investing concepts.
- No real money is traded
- No financial advice is provided
- Past performance does not guarantee future results

## 📚 Documentation

- [Backend README](./backend/README.md) - API documentation
- [Frontend README](./frontend/README.md) - Dashboard setup
