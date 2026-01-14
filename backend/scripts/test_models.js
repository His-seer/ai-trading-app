import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // The SDK doesn't have a direct 'listModels' method exposed easily on the main class in some versions, 
        // but the error message suggested calling ListModels.
        // Actually, usually it's a separate API call or we iterate. 
        // Let's try a simple generation with 'gemini-pro' to see if that works at least.
        console.log("Checking gemini-pro...");
        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        const resultPro = await modelPro.generateContent("Test");
        console.log("gemini-pro works:", resultPro.response.text());
    } catch (error) {
        console.error("gemini-pro failed:", error.message);
    }

    try {
        console.log("Checking gemini-1.5-flash-latest...");
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const resultFlash = await modelFlash.generateContent("Test");
        console.log("gemini-1.5-flash-latest works:", resultFlash.response.text());
    } catch (error) {
        console.error("gemini-1.5-flash-latest failed:", error.message);
    }
}

listModels();
