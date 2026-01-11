'use client';

import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import * as api from '@/services/api';
import styles from './MarketOverview.module.css';

export default function MarketOverview({ market }) {
    const [marketData, setMarketData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMarketData = async () => {
            setLoading(true);
            try {
                const response = market === 'stock'
                    ? await api.getStocksData()
                    : await api.getForexData();
                setMarketData(response.data || []);
            } catch (err) {
                console.error('Market data error:', err);
                setMarketData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMarketData();
    }, [market]);

    if (loading) {
        return (
            <div className={`card ${styles.overview}`}>
                <div className="card-header">
                    <h2 className="card-title">
                        <BarChart2 size={20} /> Market Overview
                    </h2>
                </div>
                <div className={styles.loading}>
                    <Activity size={24} className={styles.spinner} />
                    <span>Loading market data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`card ${styles.overview}`}>
            <div className="card-header">
                <h2 className="card-title">
                    <BarChart2 size={20} /> Market Overview - {market.toUpperCase()}
                </h2>
                <span className="badge badge-info">{marketData.length} Assets</span>
            </div>

            <div className={styles.grid}>
                {marketData.map((asset, index) => (
                    <div key={index} className={styles.assetCard}>
                        <div className={styles.assetHeader}>
                            <span className={styles.assetSymbol}>
                                {asset.symbol || asset.pair}
                            </span>
                            {asset.error ? (
                                <span className={styles.error}>Error</span>
                            ) : (
                                <span className={`${styles.change} ${asset.changePercent >= 0 ? styles.positive : styles.negative}`}>
                                    {asset.changePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {asset.changePercent?.toFixed(2)}%
                                </span>
                            )}
                        </div>
                        {!asset.error && (
                            <>
                                <div className={styles.price}>
                                    ${asset.currentPrice?.toFixed(market === 'forex' ? 4 : 2)}
                                </div>
                                <div className={styles.priceChange}>
                                    {asset.change >= 0 ? '+' : ''}{asset.change?.toFixed(2)}
                                </div>
                                <div className={styles.priceRange}>
                                    <span>L: ${asset.lowPrice?.toFixed(2)}</span>
                                    <span>H: ${asset.highPrice?.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
