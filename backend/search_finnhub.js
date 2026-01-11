import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.FINNHUB_API_KEY;

async function searchSymbol() {
    try {
        const query = 'EURUSD';
        console.log(`Searching for "${query}"...`);
        const response = await axios.get(`https://finnhub.io/api/v1/search?q=${query}&token=${API_KEY}`);

        console.log('Search Results:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

searchSymbol();
