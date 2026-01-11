import { logger } from './logger.js';

/**
 * Database Transaction Wrapper
 * Provides transaction support for SQLite operations
 */
export class Transaction {
    constructor(db) {
        this.db = db;
        this.inTransaction = false;
    }

    /**
     * Begin a transaction
     */
    begin() {
        if (this.inTransaction) {
            throw new Error('Transaction already in progress');
        }
        this.db.exec('BEGIN');
        this.inTransaction = true;
        logger.trace('Transaction started');
    }

    /**
     * Commit the transaction
     */
    commit() {
        if (!this.inTransaction) {
            throw new Error('No active transaction to commit');
        }
        this.db.exec('COMMIT');
        this.inTransaction = false;
        logger.trace('Transaction committed');
    }

    /**
     * Rollback the transaction
     */
    rollback() {
        if (!this.inTransaction) {
            throw new Error('No active transaction to rollback');
        }
        this.db.exec('ROLLBACK');
        this.inTransaction = false;
        logger.warn('Transaction rolled back');
    }

    /**
     * Execute a function within a transaction
     * Automatically commits on success, rolls back on error
     */
    execute(fn) {
        try {
            this.begin();
            const result = fn(this.db);
            this.commit();
            return { success: true, result, data: result };
        } catch (error) {
            this.rollback();
            logger.error('Transaction execution failed', error);
            throw error;
        }
    }

    /**
     * Execute async function within a transaction
     */
    async executeAsync(fn) {
        try {
            this.begin();
            const result = await fn(this.db);
            this.commit();
            return { success: true, result, data: result };
        } catch (error) {
            this.rollback();
            logger.error('Async transaction execution failed', error);
            throw error;
        }
    }
}

/**
 * Create a transaction manager
 */
export function createTransactionManager(db) {
    return new Transaction(db);
}

/**
 * Execute operations within a transaction
 * @param {Database} db - SQLite database instance
 * @param {Function} fn - Function to execute within transaction
 * @returns {Object} Result object with success flag
 */
export function withTransaction(db, fn) {
    const transaction = new Transaction(db);
    return transaction.execute(fn);
}

/**
 * Execute async operations within a transaction
 * @param {Database} db - SQLite database instance
 * @param {Function} fn - Async function to execute within transaction
 * @returns {Promise<Object>} Result object with success flag
 */
export async function withTransactionAsync(db, fn) {
    const transaction = new Transaction(db);
    return transaction.executeAsync(fn);
}

export default {
    Transaction,
    createTransactionManager,
    withTransaction,
    withTransactionAsync,
};
