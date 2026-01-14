'use client';

import { Play, Square, Zap, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './BotControls.module.css';

export default function BotControls({ botStatus, market, onStart, onStop, onTrigger }) {
    const isRunning = botStatus?.isRunning;

    return (
        <div className={`card ${styles.controls}`}>
            <div className="card-header">
                <h2 className="card-title">
                    <Zap size={20} /> Bot Control
                </h2>
                <span className={`badge ${isRunning ? 'badge-success' : 'badge-warning'}`}>
                    <span className={`status-dot ${isRunning ? 'active' : 'inactive'}`}></span>
                    {isRunning ? 'Running' : 'Stopped'}
                </span>
            </div>

            <div className={styles.content}>
                <div className={styles.info}>
                    <div className={styles.infoItem}>
                        <Clock size={16} />
                        <span>Check every {botStatus?.intervalMinutes || 15} min</span>
                    </div>
                    <div className={styles.infoItem}>
                        <AlertTriangle size={16} />
                        <span>{botStatus?.tradesToday || 0}/{botStatus?.maxTradesPerDay || 5} trades today</span>
                    </div>
                    {botStatus?.lastCheckAt && (
                        <div className={styles.infoItem}>
                            <span className={styles.lastCheck}>
                                Last check: {new Date(botStatus.lastCheckAt).toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>

                <div className={styles.marketInfo}>
                    <span className={styles.marketLabel}>Current Market:</span>
                    <span className={styles.marketValue}>{market?.toUpperCase()}</span>
                </div>

                <div className={styles.buttons}>
                    {isRunning ? (
                        <>
                            <button className="btn btn-danger" onClick={onStop}>
                                <Square size={18} /> Stop Bot
                            </button>
                            <button className="btn btn-secondary" onClick={onTrigger} title="Run analysis cycle immediately">
                                <RefreshCw size={18} /> Run Now
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-success" onClick={onStart}>
                                <Play size={18} /> Start Bot
                            </button>
                        </>
                    )}
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                    {!isRunning && (
                        <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ff6b6b', borderColor: '#ff6b6b', fontSize: '0.8rem' }}
                            onClick={() => {
                                if (confirm('⚠️ DANGER: This will delete ALL trade history, close ALL positions, and reset your balance to $10,000.\n\nAre you sure you want to reset your account?')) {
                                    // Call the reset API
                                    import('../services/api').then(api => {
                                        api.resetAccount().then(() => {
                                            alert('Account reset successfully.');
                                            window.location.reload();
                                        });
                                    });
                                }
                            }}
                        >
                            <RefreshCw size={14} style={{ marginRight: '5px' }} /> Reset Account
                        </button>
                    )}
                </div>

                {isRunning && (
                    <div className={styles.activeIndicator}>
                        <div className={styles.pulse}></div>
                        <span>Actively monitoring {market} market</span>
                    </div>
                )}
            </div>
        </div>
    );
}
