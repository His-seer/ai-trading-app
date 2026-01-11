'use client';

import { TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import styles from './PortfolioCard.module.css';

export default function PortfolioCard({ portfolio }) {
    if (!portfolio) {
        return (
            <div className={`card ${styles.portfolio}`}>
                <div className={styles.skeleton}></div>
            </div>
        );
    }

    const { balance, initialBalance, totalProfitLoss, totalProfitLossPercent, stats } = portfolio;
    const isPositive = totalProfitLoss >= 0;

    return (
        <div className={`card ${styles.portfolio}`}>
            <div className="card-header">
                <h2 className="card-title">
                    <PieChart size={20} /> Portfolio Overview
                </h2>
                <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
                    {isPositive ? 'Profit' : 'Loss'}
                </span>
            </div>

            <div className={styles.balanceSection}>
                <div className={styles.mainBalance}>
                    <span className={styles.label}>Virtual Balance</span>
                    <span className={styles.value}>${balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className={styles.pnlSection}>
                    <div className={styles.pnlItem}>
                        <span className={styles.label}>Total P&L</span>
                        <span className={`${styles.pnlValue} ${isPositive ? styles.positive : styles.negative}`}>
                            {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            ${Math.abs(totalProfitLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className={styles.pnlItem}>
                        <span className={styles.label}>Return</span>
                        <span className={`${styles.pnlValue} ${isPositive ? styles.positive : styles.negative}`}>
                            {totalProfitLossPercent >= 0 ? '+' : ''}{totalProfitLossPercent?.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.statsRow}>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{stats?.totalTrades || 0}</span>
                    <span className={styles.statLabel}>Total Trades</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{stats?.winningTrades || 0}</span>
                    <span className={styles.statLabel}>Winners</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{stats?.winRate || 0}%</span>
                    <span className={styles.statLabel}>Win Rate</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{stats?.averageProfitLoss || 0}%</span>
                    <span className={styles.statLabel}>Avg. Return</span>
                </div>
            </div>

            <div className={styles.progressBar}>
                <div className={styles.progressLabel}>
                    <span>Starting: ${initialBalance?.toLocaleString()}</span>
                    <span>Current: ${balance?.toLocaleString()}</span>
                </div>
                <div className={styles.progressTrack}>
                    <div
                        className={`${styles.progressFill} ${isPositive ? styles.positive : styles.negative}`}
                        style={{ width: `${Math.min(Math.max((balance / initialBalance) * 50, 5), 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
