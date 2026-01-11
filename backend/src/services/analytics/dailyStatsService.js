import { logger } from '../../utils/logger.js';
import db from '../../db/database.js';

/**
 * Daily Statistics Service
 * Tracks and analyzes daily trading performance
 */
class DailyStatsService {
    /**
     * Record daily statistics for a user
     */
    recordDailyStats(userId = 1) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

            if (!user) {
                logger.warn('User not found for daily stats', { userId });
                return null;
            }

            // Get today's trades
            const trades = db.prepare(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning,
                       SUM(profit_loss) as totalPL
                FROM trades
                WHERE user_id = ?
                AND DATE(closed_at) = ?
            `).get(userId, today);

            // Check if we already have stats for today
            const existingStats = db.prepare(
                'SELECT * FROM daily_stats WHERE user_id = ? AND date = ?'
            ).get(userId, today);

            if (existingStats) {
                // Update existing
                db.prepare(`
                    UPDATE daily_stats
                    SET ending_balance = ?,
                        total_trades = ?,
                        winning_trades = ?,
                        total_profit_loss = ?
                    WHERE user_id = ? AND date = ?
                `).run(
                    user.balance,
                    trades.total || 0,
                    trades.winning || 0,
                    trades.totalPL || 0,
                    userId,
                    today
                );
            } else {
                // Get starting balance for today (end of yesterday)
                const previousStats = db.prepare(`
                    SELECT ending_balance FROM daily_stats
                    WHERE user_id = ?
                    ORDER BY date DESC LIMIT 1
                `).get(userId);

                const startingBalance = previousStats ? previousStats.ending_balance : 10000;

                // Insert new
                db.prepare(`
                    INSERT INTO daily_stats
                    (user_id, date, starting_balance, ending_balance, total_trades, winning_trades, total_profit_loss)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    userId,
                    today,
                    startingBalance,
                    user.balance,
                    trades.total || 0,
                    trades.winning || 0,
                    trades.totalPL || 0
                );
            }

            logger.info('Daily stats recorded', { userId, date: today });
            return this.getDailyStats(userId, today);
        } catch (error) {
            logger.error('Failed to record daily stats', error, { userId });
            throw error;
        }
    }

    /**
     * Get daily statistics for a specific date
     */
    getDailyStats(userId = 1, date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];

            const stats = db.prepare(
                'SELECT * FROM daily_stats WHERE user_id = ? AND date = ?'
            ).get(userId, targetDate);

            if (!stats) {
                return null;
            }

            return this.formatStats(stats);
        } catch (error) {
            logger.error('Failed to get daily stats', error, { userId, date });
            throw error;
        }
    }

    /**
     * Get stats for a date range
     */
    getStatsRange(userId = 1, startDate = null, endDate = null) {
        try {
            const end = endDate || new Date().toISOString().split('T')[0];
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const stats = db.prepare(`
                SELECT * FROM daily_stats
                WHERE user_id = ? AND date BETWEEN ? AND ?
                ORDER BY date DESC
            `).all(userId, start, end);

            return stats.map(s => this.formatStats(s));
        } catch (error) {
            logger.error('Failed to get stats range', error, { userId, startDate, endDate });
            throw error;
        }
    }

    /**
     * Get statistics summary for last N days
     */
    getSummary(userId = 1, days = 30) {
        try {
            const stats = db.prepare(`
                SELECT
                    COUNT(*) as totalDays,
                    SUM(total_trades) as totalTrades,
                    SUM(winning_trades) as totalWinningTrades,
                    SUM(total_profit_loss) as totalProfitLoss,
                    AVG(total_profit_loss) as avgDailyPL,
                    MAX(total_profit_loss) as bestDay,
                    MIN(total_profit_loss) as worstDay
                FROM daily_stats
                WHERE user_id = ?
                AND date >= DATE('now', '-' || ? || ' days')
            `).get(userId, days);

            return this._enrichSummary(stats);
        } catch (error) {
            logger.error('Failed to get summary', error, { userId, days });
            throw error;
        }
    }

    /**
     * Calculate win rate
     */
    getWinRate(userId = 1, days = 30) {
        try {
            const stats = db.prepare(`
                SELECT
                    SUM(total_trades) as totalTrades,
                    SUM(winning_trades) as winningTrades
                FROM daily_stats
                WHERE user_id = ?
                AND date >= DATE('now', '-' || ? || ' days')
            `).get(userId, days);

            if (!stats.totalTrades || stats.totalTrades === 0) {
                return 0;
            }

            return (stats.winningTrades / stats.totalTrades) * 100;
        } catch (error) {
            logger.error('Failed to calculate win rate', error, { userId, days });
            throw error;
        }
    }

    /**
     * Get trading metrics
     */
    getMetrics(userId = 1, days = 30) {
        try {
            const summary = this.getSummary(userId, days);
            const winRate = this.getWinRate(userId, days);
            const stats = this.getStatsRange(userId);

            return {
                period: `Last ${days} days`,
                summary,
                winRate: winRate.toFixed(2),
                dailyStats: stats.slice(0, days),
            };
        } catch (error) {
            logger.error('Failed to get metrics', error, { userId, days });
            throw error;
        }
    }

    /**
     * Format stats object
     */
    formatStats(stats) {
        return {
            id: stats.id,
            date: stats.date,
            startingBalance: stats.starting_balance,
            endingBalance: stats.ending_balance,
            dayPL: stats.total_profit_loss,
            dayPLPercent: ((stats.total_profit_loss / stats.starting_balance) * 100).toFixed(2),
            totalTrades: stats.total_trades,
            winningTrades: stats.winning_trades,
            winRate: stats.total_trades > 0 ? ((stats.winning_trades / stats.total_trades) * 100).toFixed(2) : 0,
        };
    }

    /**
     * Enrich summary with calculated metrics
     */
    _enrichSummary(stats) {
        return {
            totalDays: stats.totalDays || 0,
            totalTrades: stats.totalTrades || 0,
            totalWinningTrades: stats.totalWinningTrades || 0,
            totalProfitLoss: stats.totalProfitLoss || 0,
            averageDailyPL: (stats.avgDailyPL || 0).toFixed(2),
            bestDay: (stats.bestDay || 0).toFixed(2),
            worstDay: (stats.worstDay || 0).toFixed(2),
            overallWinRate: stats.totalTrades > 0
                ? ((stats.totalWinningTrades / stats.totalTrades) * 100).toFixed(2)
                : 0,
        };
    }

    /**
     * Clean up old statistics
     */
    cleanupOldStats(userId = 1, retentionDays = 90) {
        try {
            const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

            const result = db.prepare(
                'DELETE FROM daily_stats WHERE user_id = ? AND date < ?'
            ).run(userId, cutoffDate);

            logger.info('Cleaned up old stats', { userId, retentionDays, deletedCount: result.changes });
            return result.changes;
        } catch (error) {
            logger.error('Failed to cleanup old stats', error, { userId, retentionDays });
            throw error;
        }
    }
}

export default new DailyStatsService();
