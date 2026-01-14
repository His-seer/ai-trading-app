import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'data', 'trading.db');

console.log(`Openning database at ${dbPath}...`);
const db = new Database(dbPath);

try {
    console.log('Checking schema...');

    // Check if column exists
    const tableInfo = db.pragma('table_info(decisions)');
    const hasColumn = tableInfo.some(col => col.name === 'ai_model');

    if (!hasColumn) {
        console.log('⚠️ Column "ai_model" missing in "decisions" table. Adding it...');
        db.exec("ALTER TABLE decisions ADD COLUMN ai_model TEXT DEFAULT 'gemini'");
        console.log('✅ Column added successfully.');
    } else {
        console.log('✅ Column "ai_model" already exists.');
    }

} catch (error) {
    console.error('❌ Migration failed:', error);
}
