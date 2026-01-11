'use client';

import { Briefcase, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import styles from './PositionsTable.module.css';

export default function PositionsTable({ positions }) {
    if (!positions || positions.length === 0) {
        return (
            <div className={`card ${styles.positions}`}>
                <div className="card-header">
                    <h2 className="card-title">
                        <Briefcase size={20} /> Open Positions
                    </h2>
                    <span className="badge badge-info">0 Active</span>
                </div>
                <div className={styles.empty}>
                    <AlertCircle size={32} />
                    <p>No open positions</p>
                    <span>Start the bot to begin trading</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`card ${styles.positions}`}>
            <div className="card-header">
                <h2 className="card-title">
                    <Briefcase size={20} /> Open Positions
                </h2>
                <span className="badge badge-success">{positions.length} Active</span>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Side</th>
                            <th>Entry Price</th>
                            <th>Quantity</th>
                            <th>Stop Loss</th>
                            <th>Take Profit</th>
                            <th>Opened</th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((position) => (
                            <tr key={position.id}>
                                <td>
                                    <span className={styles.symbol}>{position.symbol}</span>
                                    <span className={styles.marketType}>{position.market_type}</span>
                                </td>
                                <td>
                                    <span className={`badge ${position.side === 'long' ? 'badge-success' : 'badge-danger'}`}>
                                        {position.side === 'long' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {position.side.toUpperCase()}
                                    </span>
                                </td>
                                <td className={styles.price}>${position.entry_price?.toFixed(4)}</td>
                                <td>{position.quantity}</td>
                                <td className={styles.stopLoss}>
                                    <Target size={12} />
                                    ${position.stop_loss?.toFixed(4)}
                                </td>
                                <td className={styles.takeProfit}>
                                    <Target size={12} />
                                    ${position.take_profit?.toFixed(4)}
                                </td>
                                <td className={styles.date}>
                                    {new Date(position.opened_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
