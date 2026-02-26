const axios = require('axios');

const API_URL = 'https://router.huggingface.co/hf-inference/models/SamLowe/roberta-base-go_emotions';

const POSITIVE_EMOTIONS = new Set(['joy', 'love', 'admiration', 'excitement', 'gratitude', 'optimism', 'approval', 'pride', 'relief']);
const NEGATIVE_EMOTIONS = new Set(['anger', 'annoyance', 'sadness', 'fear', 'disgust', 'disappointment', 'grief', 'remorse']);

/**
 * Derives the overarching sentiment from the top emotion.
 * @param {string} emotion 
 * @returns {'positive' | 'negative' | 'neutral'}
 */
const deriveSentiment = (emotion) => {
    if (POSITIVE_EMOTIONS.has(emotion)) return 'positive';
    if (NEGATIVE_EMOTIONS.has(emotion)) return 'negative';
    return 'neutral';
};

/**
 * Analyzes text using the Hugging Face Inference API.
 * Includes retry logic to handle model loading states (503 Service Unavailable).
 * 
 * @param {string} text - The content to analyze
 * @param {number} retries - Number of retries left
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<{emotion: string, sentiment: string, confidence: number, breakdown: Array<{label: string, score: number}>}>}
 */
const analyzeText = async (text, retries = 3, delay = 5000) => {
    if (!text || text.trim() === '') {
        return {
            emotion: 'neutral',
            sentiment: 'neutral',
            confidence: 1.0,
            breakdown: []
        };
    }

    try {
        console.log("MODEL URL:", API_URL);
        console.log("INPUT TEXT:", text);

        const response = await axios.post(
            API_URL,
            { inputs: text },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log("HF RAW RESPONSE:", JSON.stringify(response.data, null, 2));

        // The API returns an array of arrays. We want the inner array of predictions.
        const predictions = response.data[0];

        if (!predictions || predictions.length === 0) {
            throw new Error('No predictions returned from Hugging Face API');
        }

        // The predictions are usually sorted by score, but let's be safe
        predictions.sort((a, b) => b.score - a.score);

        const topEmotion = predictions[0];

        const finalResult = {
            emotion: topEmotion.label,
            sentiment: deriveSentiment(topEmotion.label),
            confidence: topEmotion.score,
            breakdown: predictions
        };
        console.log("PARSED RESULT STRUCTURE:", JSON.stringify(finalResult, null, 2));

        return finalResult;

    } catch (error) {
        // Handle model loading: 503 means the model is currently loading into memory
        if (error.response && error.response.status === 503 && retries > 0) {
            console.log(`Model is loading. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return analyzeText(text, retries - 1, delay);
        }

        console.error('Sentiment Analysis API Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to analyze sentiment');
    }
};

const analyzeTextRaw = async (text, retries = 3, delay = 5000) => {
    if (!text || text.trim() === '') return {};
    try {
        console.log("MODEL URL:", API_URL);
        console.log("INPUT TEXT:", text);

        const response = await axios.post(
            API_URL,
            { inputs: text },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log("HF RAW RESPONSE:", JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 503 && retries > 0) {
            console.log(`Model is loading. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return analyzeTextRaw(text, retries - 1, delay);
        }
        console.error('Sentiment Analysis Raw API Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to analyze sentiment raw');
    }
};

module.exports = {
    analyzeText,
    analyzeTextRaw,
    deriveSentiment
};
