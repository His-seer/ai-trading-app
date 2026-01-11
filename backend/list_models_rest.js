import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function getModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        console.log(`Fetching models from: ${url}`);
        const response = await axios.get(url);

        console.log("Available Models:");
        const models = response.data.models;
        if (models) {
            models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found in response:", response.data);
        }

    } catch (error) {
        console.error("Error listing models:", error.response ? error.response.data : error.message);
    }
}

getModels();
