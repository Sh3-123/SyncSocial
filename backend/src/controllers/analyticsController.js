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
        let followerCount = 0;

        if (platform.toLowerCase() === 'youtube') {
            const youtubeService = require('../services/youtubeService');
            const accountResult = await db.query(
                'SELECT platform_user_id FROM connected_accounts WHERE user_id = $1 AND platform = $2',
                [userId, 'youtube']
            );

            if (accountResult.rows.length === 0) {
                return res.status(404).json({ message: 'No connected YouTube account found' });
            }

            const channelId = accountResult.rows[0].platform_user_id;
            const channelDetails = await youtubeService.getChannelDetails(channelId);
            followerCount = parseInt(channelDetails.subscriberCount, 10) || 0;

        } else if (platform.toLowerCase() === 'threads') {
            const { decrypt } = require('../utils/crypto');
            const axios = require('axios');

            const accountResult = await db.query(
                'SELECT access_token, platform_user_id FROM connected_accounts WHERE user_id = $1 AND platform = $2',
                [userId, 'threads']
            );

            if (accountResult.rows.length === 0) {
                return res.status(404).json({ message: 'No connected Threads account found' });
            }

            const { access_token: encryptedToken, platform_user_id: threadsUserId } = accountResult.rows[0];
            const accessToken = decrypt(encryptedToken);

            try {
                const response = await axios.get(`https://graph.threads.net/v1.0/${threadsUserId}`, {
                    params: {
                        fields: 'follower_count',
                        access_token: accessToken
                    }
                });
                followerCount = parseInt(response.data.follower_count, 10) || 0;
            } catch (err) {
                console.error('Failed to fetch Threads profile data:', err.response?.data || err.message);
                followerCount = null;
            }
            if (followerCount === 0) followerCount = null;
        } else {
            // Fallback for unknown platforms
            followerCount = null;
        }

        await db.query(
            'INSERT INTO analytics_history (user_id, platform, follower_count) VALUES ($1, $2, $3)',
            [userId, platform.toLowerCase(), followerCount]
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
