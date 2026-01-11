import { logger } from '../utils/logger.js';
import db from './database.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Database Migration System
 * Manages database schema migrations
 */
class MigrationManager {
    constructor(dbInstance) {
        this.db = dbInstance;
        this.migrationsTable = 'migrations';
        this.migrationsDir = join(__dirname, 'migrations');
        this.initMigrationsTable();
    }

    /**
     * Initialize migrations tracking table
     */
    initMigrationsTable() {
        try {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    executedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'completed'
                )
            `);
        } catch (error) {
            logger.error('Failed to create migrations table', error);
        }
    }

    /**
     * Get executed migrations
     */
    getExecutedMigrations() {
        try {
            return this.db.prepare(`SELECT * FROM ${this.migrationsTable}`).all();
        } catch (error) {
            logger.error('Failed to get migrations', error);
            return [];
        }
    }

    /**
     * Record executed migration
     */
    recordMigration(name) {
        try {
            this.db.prepare(
                `INSERT INTO ${this.migrationsTable} (name, status) VALUES (?, 'completed')`
            ).run(name);

            logger.info(`Migration recorded: ${name}`);
        } catch (error) {
            logger.error(`Failed to record migration ${name}`, error);
        }
    }

    /**
     * Check if migration was executed
     */
    hasMigration(name) {
        try {
            const result = this.db.prepare(
                `SELECT * FROM ${this.migrationsTable} WHERE name = ?`
            ).get(name);

            return !!result;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get migration status
     */
    getStatus() {
        const executed = this.getExecutedMigrations();
        return {
            total: executed.length,
            executed: executed.filter(m => m.status === 'completed').length,
            pending: executed.filter(m => m.status === 'pending').length,
            migrations: executed,
        };
    }
}

export const migrationManager = new MigrationManager(db);

/**
 * Define built-in migrations
 */
export const builtInMigrations = {
    '001_add_indexes': () => {
        logger.info('Migration: Adding database indexes');
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(closed_at);
            CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_type);
            CREATE INDEX IF NOT EXISTS idx_decisions_recommendation ON decisions(recommendation);
        `);
    },

    '002_add_api_cost_tracking': () => {
        logger.info('Migration: Adding API cost tracking table');
        db.exec(`
            CREATE TABLE IF NOT EXISTS api_costs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_name TEXT NOT NULL,
                cost REAL NOT NULL,
                endpoint TEXT,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_costs_service ON api_costs(service_name);
            CREATE INDEX IF NOT EXISTS idx_costs_date ON api_costs(recorded_at);
        `);
    },

    '003_add_health_metrics': () => {
        logger.info('Migration: Adding health metrics table');
        db.exec(`
            CREATE TABLE IF NOT EXISTS health_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT NOT NULL,
                value REAL,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_metrics_type ON health_metrics(metric_type);
            CREATE INDEX IF NOT EXISTS idx_metrics_date ON health_metrics(recorded_at);
        `);
    },

    '004_add_session_tracking': () => {
        logger.info('Migration: Adding session tracking');
        db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                api_key_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_key ON sessions(api_key_hash);
        `);
    },
};

/**
 * Run pending migrations
 */
export function runPendingMigrations() {
    try {
        logger.info('Running database migrations...');

        for (const [name, migration] of Object.entries(builtInMigrations)) {
            if (!migrationManager.hasMigration(name)) {
                logger.info(`Executing migration: ${name}`);
                migration();
                migrationManager.recordMigration(name);
            }
        }

        const status = migrationManager.getStatus();
        logger.info(`Migrations complete: ${status.executed}/${status.total} executed`);

        return status;
    } catch (error) {
        logger.error('Migration failed', error);
        throw error;
    }
}

/**
 * Get migration status
 */
export function getMigrationStatus() {
    return migrationManager.getStatus();
}

export default {
    migrationManager,
    runPendingMigrations,
    getMigrationStatus,
    builtInMigrations,
};
