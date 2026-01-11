'use client';

import { Brain, TrendingUp, TrendingDown, Minus, Clock, Trash2 } from 'lucide-react';
import styles from './AIDecisions.module.css';

export default function AIDecisions({ decisions, onClear }) {
    if (!decisions || decisions.length === 0) {
        return (
            <div className={`card ${styles.decisions}`}>
                <div className="card-header">
                    <h2 className="card-title">
                        <Brain size={20} /> AI Decision Log
                    </h2>
                </div>
                <div className={styles.empty}>
                    <Brain size={32} />
                    <p>No decisions yet</p>
                    <span>AI analysis will appear here when bot runs</span>
                </div>
            </div>
        );
    }

    const getRecommendationIcon = (rec) => {
        switch (rec) {
            case 'BUY': return <TrendingUp size={14} />;
            case 'SELL': return <TrendingDown size={14} />;
            default: return <Minus size={14} />;
        }
    };

    const getRecommendationClass = (rec) => {
        switch (rec) {
            case 'BUY': return styles.buy;
            case 'SELL': return styles.sell;
            default: return styles.hold;
        }
    };

    return (
        <div className={`card ${styles.decisions}`}>
            <div className="card-header">
                <h2 className="card-title">
                    <Brain size={20} /> AI Decision Log
                </h2>
                <div className={styles.headerActions}>
                    <span className="badge badge-info">{decisions.length} Decisions</span>
                    <button className={styles.clearBtn} onClick={onClear} title="Clear logs">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {decisions.map((decision) => (
                    <div key={decision.id} className={styles.decisionItem}>
                        <div className={styles.header}>
                            <div className={styles.symbolInfo}>
                                <span className={styles.symbol}>{decision.symbol}</span>
                                <span className={`${styles.recommendation} ${getRecommendationClass(decision.recommendation)}`}>
                                    {getRecommendationIcon(decision.recommendation)}
                                    {decision.recommendation}
                                </span>
                            </div>
                            <div className={styles.confidence}>
                                <span className={`${styles.confidenceBadge} ${styles[decision.confidence]}`}>
                                    {decision.confidence}
                                </span>
                            </div>
                        </div>

                        <div className={styles.indicators}>
                            <span>EMA20: ${decision.ema_short?.toFixed(2)}</span>
                            <span>EMA50: ${decision.ema_long?.toFixed(2)}</span>
                            <span>RSI: {decision.rsi?.toFixed(1)}</span>
                        </div>

                        <div className={styles.reasoning}>
                            <p>{decision.reasoning}</p>
                        </div>

                        {decision.action_taken && decision.action_taken !== 'HOLD' && (
                            <div className={styles.action}>
                                <span className={styles.actionLabel}>Action:</span>
                                <span className={styles.actionValue}>{decision.action_taken.replace(/_/g, ' ')}</span>
                            </div>
                        )}

                        <div className={styles.timestamp}>
                            <Clock size={12} />
                            {new Date(decision.created_at).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
