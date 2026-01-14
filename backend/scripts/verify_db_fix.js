
import { initializeDatabase } from '../src/db/database.js';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '..', 'data');

// Clean up data dir if exists
if (existsSync(dataDir)) {
    try {
        console.log('Cleaning up existing data directory...');
        rmSync(dataDir, { recursive: true, force: true });
    } catch (e) {
        console.warn('⚠️ Could not delete data directory (likely busy). Proceeding anyway...', e.message);
    }

}

console.log('Starting verification...');
try {
    // This import should trigger the db init
    await import('../src/db/database.js');
    console.log('✅ Database module imported successfully');

    if (existsSync(dataDir)) {
        console.log('✅ Data directory created successfully');
    } else {
        console.error('❌ Data directory NOT created');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
}
