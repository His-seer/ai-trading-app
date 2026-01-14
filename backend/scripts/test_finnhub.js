import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
    console.error('No API Key found in .env');
    process.exit(1);
}

async function testForex() {
    const symbols = ['OANDA:EUR_USD', 'EUR/USD', 'IC MARKETS:EURUSD', 'FX:EURUSD'];

    console.log(`Testing Finnhub API with key: ${API_KEY.substring(0, 5)}...`);

    for (const symbol of symbols) {
        try {
            console.log(`\nTesting symbol: ${symbol}`);
            const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`);
            console.log('Response:', response.data);

            if (response.data.c === 0 && response.data.d === null) {
                console.log('⚠️  Response indicates invalid symbol (all zeros/nulls)');
            } else {
                console.log('✅ Success!');
            }
        } catch (error) {
            console.error('❌ Error:', error.response ? error.response.data : error.message);
        }
    }
}

testForex();
