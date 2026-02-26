const db = require('../config/db');
const sentimentService = require('../services/sentimentService');

const getAnalyticsOverview = async (req, res) => {
    const { platform } = req.query;
    const userId = req.user.id;

    try {
        // Fetch current stats (latest from history)
        const currentStats = await db.query(
            'SELECT * FROM analytics_history WHERE user_id = $1 AND platform = $2 ORDER BY recorded_at DESC LIMIT 1',
            [userId, platform]
        );

        // Fetch stats from 7 days ago for growth calculation
        const previousStats = await db.query(
            'SELECT * FROM analytics_history WHERE user_id = $1 AND platform = $2 AND recorded_at < NOW() - INTERVAL \'7 days\' ORDER BY recorded_at DESC LIMIT 1',
            [userId, platform]
        );

        // Fetch best performing post
        const bestPost = await db.query(
            'SELECT * FROM posts WHERE user_id = $1 AND platform = $2 ORDER BY likes_count DESC LIMIT 1',
            [userId, platform]
        );

        // Summary metrics
        const summary = await db.query(
            'SELECT SUM(likes_count) as total_likes, SUM(comments_count) as total_comments, SUM(views_count) as total_views FROM posts WHERE user_id = $1 AND platform = $2',
            [userId, platform]
        );

        res.json({
            current: currentStats.rows[0] || { follower_count: 0 },
            previous: previousStats.rows[0] || { follower_count: 0 },
            bestPost: bestPost.rows[0],
            summary: summary.rows[0] || { total_likes: 0, total_comments: 0, total_views: 0 }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: 'Server error fetching analytics' });
    }
};

const syncAnalytics = async (req, res) => {
    const { platform } = req.body;
    const userId = req.user.id;

    try {
        // Mock analytics sync
        const mockFollowers = Math.floor(Math.random() * 5000) + 10000;

        await db.query(
            'INSERT INTO analytics_history (user_id, platform, follower_count) VALUES ($1, $2, $3)',
            [userId, platform, mockFollowers]
        );

        res.json({ message: `Successfully synced ${platform} analytics` });
    } catch (error) {
        console.error('Sync analytics error:', error);
        res.status(500).json({ message: 'Server error syncing analytics' });
    }
};

const analyzeSentiment = async (req, res) => {
    const { target_id, target_type, content } = req.body;

    if (!target_id || !target_type || !content) {
        return res.status(400).json({ message: 'Missing required fields: target_id, target_type, content' });
    }

    try {
        // 1. Check if we already have it in the db to avoid hitting HF repeatedly
        const existingResult = await db.query(
            'SELECT * FROM intelligence_results WHERE target_id = $1 AND target_type = $2',
            [target_id, target_type.toUpperCase()]
        );

        if (existingResult.rows.length > 0) {
            const row = existingResult.rows[0];
            return res.json({
                emotion: row.subclass_label,
                sentiment: row.sentiment_label,
                confidence: row.sentiment_score,
                breakdown: row.raw_results
            });
        }

        // 2. Call Hugging Face Service
        const analysis = await sentimentService.analyzeText(content);

        // 3. Save to DB
        await db.query(
            `INSERT INTO intelligence_results (target_id, target_type, sentiment_label, sentiment_score, subclass_label, subclass_score, raw_results)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (target_id, target_type) 
             DO UPDATE SET 
                sentiment_label = EXCLUDED.sentiment_label,
                sentiment_score = EXCLUDED.sentiment_score,
                subclass_label = EXCLUDED.subclass_label,
                subclass_score = EXCLUDED.subclass_score,
                raw_results = EXCLUDED.raw_results`,
            [
                target_id,
                target_type.toUpperCase(),
                analysis.sentiment,
                analysis.confidence,
                analysis.emotion,
                analysis.confidence,
                JSON.stringify(analysis.breakdown)
            ]
        );

        res.json(analysis);

    } catch (error) {
        console.error('Sentiment Analysis Controller Error:', error);
        res.status(500).json({ message: 'Error analyzing sentiment', details: error.message });
    }
};
const analyzeSentimentRaw = async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ message: 'Missing required field: text' });
    }

    try {
        const rawResponse = await sentimentService.analyzeTextRaw(text);
        res.json({ rawResponse });
    } catch (error) {
        console.error('Raw Sentiment Analysis Controller Error:', error);
        res.status(500).json({ message: 'Error analyzing sentiment raw', details: error.message });
    }
};

module.exports = { getAnalyticsOverview, syncAnalytics, analyzeSentiment, analyzeSentimentRaw };
