import { initializeDatabase } from './database.js';

try {
    initializeDatabase();
    console.log('✅ Database initialization complete');
} catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
}
