'use client';

import { History, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import styles from './TradeHistory.module.css';

export default function TradeHistory({ trades }) {
    if (!trades || trades.length === 0) {
        return (
            <div className={`card ${styles.history}`}>
                <div className="card-header">
                    <h2 className="card-title">
                        <History size={20} /> Trade History
                    </h2>
                </div>
                <div className={styles.empty}>
                    <p>No trades yet</p>
                    <span>Completed trades will appear here</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`card ${styles.history}`}>
            <div className="card-header">
                <h2 className="card-title">
                    <History size={20} /> Trade History
                </h2>
                <span className="badge badge-info">{trades.length} Trades</span>
            </div>

            <div className={styles.list}>
                {trades.map((trade) => (
                    <div key={trade.id} className={styles.tradeItem}>
                        <div className={styles.tradeMain}>
                            <div className={styles.tradeSymbol}>
                                <span className={styles.symbol}>{trade.symbol}</span>
                                <span className={`badge ${trade.side === 'long' ? 'badge-success' : 'badge-danger'}`}>
                                    {trade.side.toUpperCase()}
                                </span>
                            </div>
                            <div className={styles.tradePrices}>
                                <span>${trade.entry_price?.toFixed(4)}</span>
                                <ArrowRight size={14} />
                                <span>${trade.exit_price?.toFixed(4)}</span>
                            </div>
                        </div>
                        <div className={styles.tradePnL}>
                            <span className={`${styles.pnlValue} ${trade.profit_loss >= 0 ? styles.positive : styles.negative}`}>
                                {trade.profit_loss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                ${Math.abs(trade.profit_loss).toFixed(2)}
                            </span>
                            <span className={`${styles.pnlPercent} ${trade.profit_loss >= 0 ? styles.positive : styles.negative}`}>
                                {trade.profit_loss_percent >= 0 ? '+' : ''}{trade.profit_loss_percent?.toFixed(2)}%
                            </span>
                        </div>
                        <div className={styles.tradeReason}>
                            <span className={styles.reasonLabel}>Exit:</span>
                            <span className={styles.reasonValue}>{trade.exit_reason?.replace('_', ' ')}</span>
                        </div>
                        <div className={styles.tradeDate}>
                            {new Date(trade.closed_at).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
