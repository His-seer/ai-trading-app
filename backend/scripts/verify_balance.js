import config from './src/config/config.js';

console.log('🧪 Verifying Initial Balance Configuration...');
console.log(`Current Configured Balance: $${config.initialBalance}`);

if (config.initialBalance === 50) {
    console.log('✅ Success: Initial Balance is set to $50');
} else {
    console.log(`❌ Failure: Initial Balance is $${config.initialBalance}, expected $50`);
}
