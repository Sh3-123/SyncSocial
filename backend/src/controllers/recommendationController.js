const axios = require('axios');
const db = require('../config/db');
const { getTrendingData } = require('../services/serpApiService');

exports.generateTrendContent = async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic || typeof topic !== 'string' || topic.length > 50) {
            return res.status(400).json({ error: 'Valid topic string is required (max 50 characters)' });
        }

        // 1. Check cache
        const cacheResult = await db.query(
            'SELECT data FROM trend_cache WHERE topic = $1 AND expires_at > NOW()',
            [topic.toLowerCase()]
        );

        if (cacheResult.rows.length > 0) {
            return res.json(cacheResult.rows[0].data);
        }

        // 2. Fetch from SerpAPI
        const trendingData = await getTrendingData(topic);

        if (!trendingData || !trendingData.trending_topics || trendingData.trending_topics.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve trending data for this topic.' });
        }

        // 3. Send to Groq
        const systemMessage = `You are an expert social media manager and trend analyst.
You must analyze the provided trending topics for the subject "${topic}" and generate content ideas.
Do NOT hallucinate or generate URLs/links.
Return ONLY valid JSON with this exact structure:
{
  "story_idea": "One short, engaging qualitative content creation story idea based on the trends.",
  "titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "trend_explanation": "A short explanation of why these specific trends are popular right now."
}`;

        const userPrompt = `Trending Topics for ${topic}:\n${trendingData.trending_topics.join(', ')}`;

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiOutput = response.data.choices[0].message.content;

        let parsedOutput;
        try {
            parsedOutput = JSON.parse(aiOutput);
        } catch (e) {
            console.error('Failed to parse Groq response:', aiOutput);
            return res.status(500).json({ error: 'Failed to process AI trend recommendation' });
        }

        // 4. Combine Results
        const finalResponse = {
            topic: topic,
            trending_topics: trendingData.trending_topics,
            story_idea: parsedOutput.story_idea || '',
            titles: parsedOutput.titles || [],
            hashtags: parsedOutput.hashtags || [],
            trend_explanation: parsedOutput.trend_explanation || '',
            proof_links: trendingData.proof_links || [],
            generated_at: new Date().toISOString()
        };

        // 5. Save to Cache
        await db.query(
            `INSERT INTO trend_cache (topic, data, expires_at) 
             VALUES ($1, $2, NOW() + INTERVAL '6 hours')
             ON CONFLICT (topic) DO UPDATE SET data = EXCLUDED.data, created_at = NOW(), expires_at = NOW() + INTERVAL '6 hours'`,
            [topic.toLowerCase(), finalResponse]
        );

        res.json(finalResponse);

    } catch (error) {
        console.error('Trend Recommendation Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to generate trend recommendation',
            details: error.response?.data?.error?.message || error.message
        });
    }
};

exports.generateRecommendation = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const systemMessage = `You are an expert social media manager. Generate social media content recommendations based on the topic provided by the user.

You MUST return the output STRICTLY as a JSON object with the following exact structure, without any markdown formatting or extra text:

{
  "contentIdea": "A brief description of the content idea.",
  "postText": "The actual text for the social media post.",
  "contentDirection": "Advice on story or content direction (e.g., video style, image type).",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "tips": "Tips for increasing engagement on this post."
}
`;

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiOutput = response.data.choices[0].message.content;

        let parsedOutput;
        try {
            parsedOutput = JSON.parse(aiOutput);
        } catch (e) {
            console.error('Failed to parse Groq response:', aiOutput);
            return res.status(500).json({ error: 'Failed to process AI recommendation' });
        }

        res.json(parsedOutput);

    } catch (error) {
        console.error('Recommendation Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to generate recommendation',
            details: error.response?.data?.error?.message || error.message
        });
    }
};
