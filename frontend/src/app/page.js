'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Wallet, TrendingUp, TrendingDown, Activity,
    Play, Square, RefreshCw, Bot, DollarSign,
    BarChart3, Clock, Target, AlertCircle
} from 'lucide-react';
import * as api from '@/services/api';
import PortfolioCard from '@/components/PortfolioCard';
import PositionsTable from '@/components/PositionsTable';
import TradeHistory from '@/components/TradeHistory';
import AIDecisions from '@/components/AIDecisions';
import BotControls from '@/components/BotControls';
import MarketOverview from '@/components/MarketOverview';
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from '@/components/Toast';
import styles from './page.module.css';

function Dashboard() {
    const [portfolio, setPortfolio] = useState(null);
    const [botStatus, setBotStatus] = useState(null);
    const [decisions, setDecisions] = useState([]);
    const [market, setMarket] = useState('stock');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [portfolioRes, statusRes, decisionsRes] = await Promise.all([
                api.getPortfolio(),
                api.getBotStatus(),
                api.getDecisions(20),
            ]);

            setPortfolio(portfolioRes.data);
            setBotStatus(statusRes.data);
            setDecisions(decisionsRes.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to fetch data. Is the backend running?');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Refresh every 60 seconds instead of 30 to reduce API calls
        // Combined with client-side caching, this prevents most rate limit errors
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleStartBot = async () => {
        try {
            await api.startBot(market);
            setTimeout(() => {
                fetchData();
            }, 1000); // Wait for bot to start before fetching
        } catch (err) {
            console.error('Start bot error:', err);
        }
    };

    const handleStopBot = async () => {
        try {
            await api.stopBot();
            await fetchData();
        } catch (error) {
            console.error('Error stopping bot:', error);
        }
    };

    const handleTriggerBot = async () => {
        try {
            await api.triggerBot();
            // Wait a moment for processing to start/finish
            setTimeout(() => {
                fetchData();
            }, 2000);
        } catch (error) {
            console.error('Error triggering bot:', error);
        }
    };

    const handleClearDecisions = async () => {
        try {
            await api.clearDecisions();
            fetchData();
        } catch (error) {
            console.error('Error clearing decisions:', error);
        }
    };

    const handleMarketChange = async (newMarket) => {
        setMarket(newMarket);
        if (botStatus?.isRunning) {
            await api.setMarket(newMarket);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Activity size={48} className={styles.spinner} />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <Bot size={32} />
                    <div>
                        <h1>AI Trading Platform</h1>
                        <p>Paper Trading • Educational Mode</p>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <div className="market-toggle">
                        <button
                            className={market === 'stock' ? 'active' : ''}
                            onClick={() => handleMarketChange('stock')}
                        >
                            <TrendingUp size={16} /> Stocks
                        </button>
                        <button
                            className={market === 'forex' ? 'active' : ''}
                            onClick={() => handleMarketChange('forex')}
                        >
                            <DollarSign size={16} /> Forex
                        </button>
                    </div>

                    <button className="btn btn-outline" onClick={fetchData}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className={styles.errorBanner}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Main Content */}
            <main className={styles.main}>
                {/* Top Row: Portfolio + Bot Controls */}
                <div className={styles.mainGrid}>
                    <div className={styles.leftColumn}>
                        <BotControls
                            botStatus={botStatus}
                            market={market}
                            onStart={handleStartBot}
                            onStop={handleStopBot}
                            onTrigger={handleTriggerBot}
                        />
                        <AIDecisions
                            decisions={decisions}
                            onClear={handleClearDecisions}
                        />
                    </div>
                    <PortfolioCard portfolio={portfolio} />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4">
                    <StatCard
                        icon={<Wallet />}
                        label="Virtual Balance"
                        value={`$${portfolio?.balance?.toLocaleString() || '10,000'}`}
                        change={portfolio?.totalProfitLossPercent}
                    />
                    <StatCard
                        icon={<BarChart3 />}
                        label="Total Trades"
                        value={portfolio?.stats?.totalTrades || 0}
                    />
                    <StatCard
                        icon={<Target />}
                        label="Win Rate"
                        value={`${portfolio?.stats?.winRate || 0}%`}
                    />
                    <StatCard
                        icon={<Clock />}
                        label="Trades Today"
                        value={`${botStatus?.tradesToday || 0}/${botStatus?.maxTradesPerDay || 3}`}
                    />
                </div>

                {/* Open Positions */}
                <PositionsTable positions={portfolio?.openPositions || []} />

                {/* Two Column Layout */}
                <div className={styles.twoColumn}>
                    <TradeHistory trades={portfolio?.recentTrades || []} />
                    <MarketOverview market={market} />
                </div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <p>⚠️ Paper Trading Only - No Real Money • Built for Education</p>
            </footer>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, change }) {
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">{icon} {label}</span>
            </div>
            <div className="stat-value">{value}</div>
            {change !== undefined && (
                <span className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
                    {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(change).toFixed(2)}%
                </span>
            )}
        </div>
    );
}

// Export Dashboard wrapped with Error Boundary
export default function Page() {
    return (
        <ErrorBoundary>
            <Dashboard />
        </ErrorBoundary>
    );
}
