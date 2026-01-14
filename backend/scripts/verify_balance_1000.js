import config from './src/config/config.js';

console.log('🧪 Verifying Initial Balance Configuration...');
console.log(`Current Configured Balance: $${config.initialBalance}`);

if (config.initialBalance === 1000) {
    console.log('✅ Success: Initial Balance is set to $1000');
} else {
    console.log(`❌ Failure: Initial Balance is $${config.initialBalance}, expected $1000`);
}
