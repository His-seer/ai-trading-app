# AI Trading Platform - Frontend

Next.js dashboard for the AI-Assisted Paper Trading Platform.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Opens at: http://localhost:3000

> **Note:** Make sure the backend is running on port 3001 first!

## Features

- 📊 Portfolio overview with P&L tracking
- 🤖 Bot control (start/stop)
- 📈 Market selector (Stocks/Forex)
- 📝 Trade history
- 🧠 AI decision transparency log
- 💹 Real-time market overview

## Environment Variables

Create `.env.local` if you need to override the API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
