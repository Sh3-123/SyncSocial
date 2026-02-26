const db = require('../config/db');
const { decrypt } = require('../utils/crypto');
const axios = require('axios');

const getPosts = async (req, res) => {
    const { platform, type } = req.query;
    const userId = req.user.id;

    try {
        let query = `
            SELECT p.*,
            (
                COALESCE(p.comments_count, 0) + 
                (SELECT COUNT(*) FROM posts r WHERE r.parent_post_id = p.platform_post_id AND r.user_id = p.user_id)
            ) as display_comments_count 
            FROM posts p 
            WHERE p.user_id = $1
        `;
        let params = [userId];

        if (platform) {
            query += ' AND platform = $2';
            params.push(platform.toLowerCase());
        }

        if (type) {
            // type could be 'POST' or 'REPLY'
            query += ` AND post_type = $${params.length + 1}`;
            params.push(type);
        }

        query += ' ORDER BY p.published_at DESC';
        const result = await db.query(query, params);

        // Map the updated comments count
        const posts = result.rows.map(post => {
            post.comments_count = parseInt(post.display_comments_count, 10);
            return post;
        });

        res.json(posts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ message: 'Server error fetching posts' });
    }
};

const getPostById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT p.*, 
            (
                COALESCE(p.comments_count, 0) + 
                (SELECT COUNT(*) FROM posts r WHERE r.parent_post_id = p.platform_post_id AND r.user_id = p.user_id)
            ) as display_comments_count
            FROM posts p
            WHERE p.id = $1 AND p.user_id = $2
        `, [id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Map the calculated display score to the field the frontend expects
        const post = result.rows[0];
        post.comments_count = parseInt(post.display_comments_count, 10);

        res.json(post);
    } catch (error) {
        console.error('Get post by id error:', error);
        res.status(500).json({ message: 'Server error fetching post' });
    }
};

const syncPosts = async (req, res) => {
    const { platform } = req.body;
    const userId = req.user.id;

    if (!platform || platform.toLowerCase() !== 'threads') {
        return res.status(400).json({ message: 'Only Threads sync is supported currently' });
    }

    try {
        // 1. Get encrypted token and user ID for this platform
        const accountResult = await db.query(
            'SELECT access_token, platform_user_id FROM connected_accounts WHERE user_id = $1 AND platform = $2',
            [userId, platform.toLowerCase()]
        );

        if (accountResult.rows.length === 0) {
            return res.status(404).json({ message: 'No connected account found for this platform' });
        }

        const { access_token: encryptedToken, platform_user_id: threadsUserId } = accountResult.rows[0];
        const accessToken = decrypt(encryptedToken);

        // 2. Fetch Threads (Posts) with Pagination
        let threads = [];
        let url = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
        let params = {
            fields: 'id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,thumbnail_url,is_quote_post,like_count,reply_count',
            limit: 25,
            access_token: accessToken
        };

        while (true) {
            const res = await axios.get(url, { params });
            const data = res.data;
            if (data.error) break;

            threads.push(...(data.data || []));

            const nextUrl = data.paging?.next;
            if (!nextUrl) break;
            url = nextUrl;
            params = {}; // nextUrl already contains all params
        }

        console.log(`Fetched ${threads.length} threads for syncing`);

        // 3. Fetch Replies (Comments) with Pagination
        let replies = [];
        url = `https://graph.threads.net/v1.0/${threadsUserId}/replies`;
        params = {
            fields: 'id,text,username,permalink,timestamp,media_product_type,media_type,media_url,shortcode,thumbnail_url,is_quote_post,has_replies,like_count,reply_count',
            limit: 50,
            access_token: accessToken
        };

        while (true) {
            const res = await axios.get(url, { params });
            const data = res.data;
            if (data.error) break;

            replies.push(...(data.data || []));

            const nextUrl = data.paging?.next;
            if (!nextUrl) break;
            url = nextUrl;
            params = {}; // nextUrl already contains all params
        }
        console.log(`Fetched ${replies.length} self replies for syncing`);

        // 4. Upsert Threads into DB
        for (const thread of threads) {
            await db.query(
                `INSERT INTO posts (user_id, platform, platform_post_id, content, media_url, published_at, post_type, likes_count, comments_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
                 content = EXCLUDED.content,
                 media_url = EXCLUDED.media_url,
                 published_at = EXCLUDED.published_at,
                 likes_count = EXCLUDED.likes_count,
                 comments_count = EXCLUDED.comments_count,
                 updated_at = CURRENT_TIMESTAMP`,
                [userId, platform.toLowerCase(), thread.id, thread.text, thread.media_url || null, thread.timestamp, 'POST', thread.like_count || 0, thread.reply_count || 0]
            );
        }

        // 5. Upsert Replies into DB
        for (const reply of replies) {
            await db.query(
                `INSERT INTO posts (user_id, platform, platform_post_id, content, media_url, published_at, post_type, likes_count, comments_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
                 content = EXCLUDED.content,
                 media_url = EXCLUDED.media_url,
                 published_at = EXCLUDED.published_at,
                 likes_count = EXCLUDED.likes_count,
                 comments_count = EXCLUDED.comments_count,
                 updated_at = CURRENT_TIMESTAMP`,
                [userId, platform.toLowerCase(), reply.id, reply.text, reply.media_url || null, reply.timestamp, 'REPLY', reply.like_count || 0, reply.reply_count || 0]
            );
        }

        res.json({
            message: `Successfully synced ${platform} content`,
            stats: { posts: threads.length, comments: replies.length }
        });
    } catch (error) {
        console.error('Sync posts error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Server error syncing content',
            details: error.response?.data?.error?.message || error.message
        });
    }
};

const syncPublicReplies = async (req, res) => {
    const { id: threadId } = req.params;
    const userId = req.user.id;
    const platform = 'threads';

    try {
        // 1. Get the original post and encrypted token
        const postResult = await db.query('SELECT platform_post_id FROM posts WHERE id = $1 AND user_id = $2', [threadId, userId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        const platformPostId = postResult.rows[0].platform_post_id;

        const accountResult = await db.query(
            'SELECT access_token FROM connected_accounts WHERE user_id = $1 AND platform = $2',
            [userId, platform]
        );

        if (accountResult.rows.length === 0) {
            return res.status(404).json({ message: 'No connected account found for this platform' });
        }

        const accessToken = decrypt(accountResult.rows[0].access_token);

        // 2. Fetch public replies with pagination
        let publicReplies = [];
        let url = `https://graph.threads.net/v1.0/${platformPostId}/replies`;
        let params = {
            fields: 'id,text,username,permalink,timestamp,media_product_type,media_type,media_url,shortcode,thumbnail_url,children,is_quote_post,has_replies,like_count,reply_count',
            reverse: 'true',
            access_token: accessToken
        };

        while (true) {
            const response = await axios.get(url, { params });
            const data = response.data;
            if (data.error) break;

            publicReplies.push(...(data.data || []));

            const nextUrl = data.paging?.cursors?.after ? `${url}?after=${data.paging.cursors.after}` : null; // Threads replies sometimes use cursor
            if (!nextUrl || Object.keys(params).length === 0) break; // if we reset params on nextUrl, Object.keys logic fails. Let's just use the URL given by paging if it exists.

            // Note: Threads replies API pagination logic with cursors can be tricky, let's use the provided next url or construct it
            if (data.paging && data.paging.next) {
                url = data.paging.next;
                params = {};
            } else {
                break;
            }
        }

        // 3. Upsert Public Replies into DB
        for (const reply of publicReplies) {
            await db.query(
                `INSERT INTO posts (user_id, platform, platform_post_id, parent_post_id, platform_username, content, media_url, published_at, post_type, likes_count, comments_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
                 content = EXCLUDED.content,
                 media_url = EXCLUDED.media_url,
                 published_at = EXCLUDED.published_at,
                 platform_username = EXCLUDED.platform_username,
                 parent_post_id = EXCLUDED.parent_post_id,
                 likes_count = EXCLUDED.likes_count,
                 comments_count = EXCLUDED.comments_count,
                 updated_at = CURRENT_TIMESTAMP`,
                [userId, platform, reply.id, platformPostId, reply.username, reply.text, reply.media_url || null, reply.timestamp, 'REPLY', reply.like_count || 0, reply.reply_count || 0]
            );
        }

        res.json({
            message: 'Successfully synced public replies',
            count: publicReplies.length
        });
    } catch (error) {
        console.error('Sync public replies error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Server error syncing public replies' });
    }
};

const getPublicReplies = async (req, res) => {
    const { id: threadId } = req.params;
    const userId = req.user.id;

    try {
        const postResult = await db.query('SELECT platform_post_id FROM posts WHERE id = $1 AND user_id = $2', [threadId, userId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        const platformPostId = postResult.rows[0].platform_post_id;

        const result = await db.query(
            `SELECT * FROM posts 
             WHERE user_id = $1 AND platform = 'threads' AND parent_post_id = $2
             ORDER BY published_at DESC`,
            [userId, platformPostId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get public replies error:', error);
        res.status(500).json({ message: 'Server error fetching public replies' });
    }
};

module.exports = { getPosts, getPostById, syncPosts, syncPublicReplies, getPublicReplies };
