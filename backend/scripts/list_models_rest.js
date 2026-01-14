import dotenv from 'dotenv';
dotenv.config();

import https from 'https';

const API_KEY = process.env.GEMINI_API_KEY;

async function getModels() {
    console.log(`Fetching models from: https://generativelanguage.googleapis.com/v1beta/models?key=...`);

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models?key=${API_KEY}`,
        method: 'GET',
    };

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.models) {
                    console.log('Available Models:');
                    response.models.sort((a, b) => a.name.localeCompare(b.name)).forEach(model => {
                        console.log(`- ${model.name.replace('models/', '')}: ${model.description}`);
                        console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
                    });
                } else {
                    console.log('Error listing models:', response);
                }
            } catch (e) {
                console.error('Error parsing response:', e);
                console.log('Raw data:', data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.end();
}

if (!API_KEY) {
    console.error('API_KEY is missing in .env');
} else {
    getModels();
}
