const axios = require('axios');
const db = require('../config/db');
const { getTrendingData } = require('../services/serpApiService');

exports.generateTrendContent = async (req, res) => {
    try {
        const { topic, useSerpApi = true } = req.body;

        if (!topic || typeof topic !== 'string' || topic.length > 50) {
            return res.status(400).json({ error: 'Valid topic string is required (max 50 characters)' });
        }

        // 1. Check cache (only if using SerpAPI to keep behavior consistent, but let's cache both based on useSerpApi flag)
        const cacheKey = `${topic.toLowerCase()}_${useSerpApi}`;
        const cacheResult = await db.query(
            'SELECT data FROM trend_cache WHERE topic = $1 AND expires_at > NOW()',
            [cacheKey]
        );

        if (cacheResult.rows.length > 0) {
            return res.json(cacheResult.rows[0].data);
        }

        // 2. Fetch from SerpAPI (if enabled)
        let trendingData = { trending_topics: [], proof_links: [] };
        if (useSerpApi) {
            trendingData = await getTrendingData(topic);

            if (!trendingData || !trendingData.trending_topics || trendingData.trending_topics.length === 0) {
                return res.status(500).json({ error: 'Failed to retrieve trending data for this topic.' });
            }
        } else {
            // Provide a generic array if SerpApi is bypassed so the prompt still has context
            trendingData.trending_topics = [`Current insights on ${topic}`, `Future of ${topic}`, `${topic} best practices`, `${topic} news`];
        }

        // 3. Send to Groq - Only generate titles to save tokens
        const systemMessage = `You are an expert social media manager and trend analyst.
You must analyze the provided trending topics for the subject "${topic}" and generate 5 DISTINCT, engaging hook titles or content angles.

## CRITICAL INSTRUCTIONS
1. Do NOT generate the full scripts. ONLY generate the hook titles.
2. The 5 hook angles must be completely unique from one another. Vary the approach (e.g., analytical, controversial, listicle, story-driven, news-based).

Return ONLY valid JSON with this exact structure:
{
  "story_idea": "One short, engaging qualitative content creation story idea based on the topic/trends.",
  "hooks": [
    { "title": "Engaging Hook / Title 1" },
    { "title": "Engaging Hook / Title 2" },
    { "title": "Engaging Hook / Title 3" },
    { "title": "Engaging Hook / Title 4" },
    { "title": "Engaging Hook / Title 5" }
  ],
  "trend_explanation": "A short explanation of why these specific angles/trends are relevant right now."
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
            hooks: parsedOutput.hooks || [],
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

exports.generateHookScript = async (req, res) => {
    try {
        const { topic, hookTitle } = req.body;

        if (!topic || !hookTitle) {
            return res.status(400).json({ error: 'Topic and hookTitle are required' });
        }

        const systemMessage = `You are an expert social media manager and trend analyst.
You must generate a completely unique, comprehensive social media script package for the subject "${topic}", specifically tailored to the hook/title: "${hookTitle}".

## CRITICAL INSTRUCTIONS FOR SCRIPT GENERATION
You are to generate completely unique, high-quality scripts tailored to this specific title and topic, eliminating all generic, repetitive outputs.

1. Title-Driven Context Extraction: Extract core entities from the hook title. Identify the content type, emotional angle, and target audience.
2. Remove Generic Patterns: NEVER use repetitive structures like "Welcome back to our channel", "Today we're diving into...", "Let’s set the stage", or "We’ll explore the possibilities...". Generate a unique hook tailored to the topic. Use topic-specific facts, scenarios, or questions. 
3. Topic-Specific Content Anchoring: Mention the exact title subject early and clearly. Reference real-world context related specifically to that title. Avoid generic AI-content commentary.
4. Structured Generation Logic: Follow this internal logic: (1) Topic-specific hook, (2) Context explanation tied directly to title, (3) Key points unique to subject, (4) Implications or debate specific to that subject, (5) Tailored closing aligned with topic. 
5. Tone Adaptation: Adapt tone to the topic (e.g., Policy -> analytical, Best practices -> advisory, Trend -> energetic).
6. Output Format: The 'youtube_script' must be a full 2-3 minute length script (at least 3-4 distinct paragraphs). Use a natural spoken tone. NO placeholders. NO bracketed stage directions unless explicitly requested.

Do NOT hallucinate or generate URLs/links.
Return ONLY valid JSON with this exact structure:
{
  "youtube_script": "A detailed, multi-paragraph script for a comprehensive YouTube video specifically about THIS title. This MUST be lengthy, completely unique to this hook, and strictly follow the critical instructions.",
  "threads_post": "A short, punchy, engaging post optimized for Threads specifically addressing THIS title.",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "image_recommendations": "Where to get images (e.g. Unsplash keywords) or what to film",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

        const userPrompt = `Generate the script package for the topic '${topic}' focusing strictly on the angle: '${hookTitle}'`;

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
            console.error('Failed to parse Groq script response:', aiOutput);
            return res.status(500).json({ error: 'Failed to process AI script generation' });
        }

        res.json(parsedOutput);

    } catch (error) {
        console.error('Hook Script Generation Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to generate hook script',
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
