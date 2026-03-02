const axios = require('axios');

const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_URL = 'https://serpapi.com/search.json';

/**
 * Fetches search results from SerpAPI for a given query.
 */
const fetchSerpApi = async (query) => {
    try {
        const response = await axios.get(SERP_API_URL, {
            params: {
                engine: 'google',
                q: query,
                api_key: SERP_API_KEY,
                num: 10
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching SerpAPI for query "${query}":`, error.message);
        return null;
    }
};

/**
 * Extracts and aggregates trending data from multiple search queries.
 */
const getTrendingData = async (topic) => {
    const currentYear = new Date().getFullYear();
    const queries = [
        `trending ${topic} ${currentYear}`,
        `viral ${topic} trends`,
        `${topic} news`,
        `${topic} trending on YouTube`,
        `latest ${topic} trends`
    ];

    const results = await Promise.all(queries.map(q => fetchSerpApi(q)));

    let allKeywords = [];
    let allRelatedSearches = [];
    let organicLinks = [];

    results.forEach(res => {
        if (!res) return;

        // Extract organic results for links and snippets
        if (res.organic_results && Array.isArray(res.organic_results)) {
            res.organic_results.forEach(item => {
                if (item.title && item.link) {
                    organicLinks.push({
                        title: item.title,
                        url: item.link
                    });
                }

                // Extract words from snippets as potential keywords
                if (item.snippet) {
                    const words = item.snippet.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
                    allKeywords.push(...words);
                }
            });
        }

        // Extract related searches
        if (res.related_searches && Array.isArray(res.related_searches)) {
            res.related_searches.forEach(item => {
                if (item.query) {
                    allRelatedSearches.push(item.query.toLowerCase());
                }
            });
        }
    });

    // Rank related searches by frequency
    const relatedFrequency = {};
    allRelatedSearches.forEach(rs => {
        relatedFrequency[rs] = (relatedFrequency[rs] || 0) + 1;
    });

    // Sort related searches by count
    const sortedRelated = Object.entries(relatedFrequency)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    // Top 8 trends/keywords
    const topTrends = sortedRelated.slice(0, 8);

    // If we don't have enough related searches, supplement with common snippet keywords
    if (topTrends.length < 5) {
        // Exclude common stop words and the topic itself
        const stopWords = ['this', 'that', 'with', 'from', 'your', 'have', 'more', 'about', 'what', 'which', 'when', 'where', 'will', 'they', topic.toLowerCase()];
        const keywordFreq = {};

        allKeywords.forEach(kw => {
            if (!stopWords.includes(kw)) {
                keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
            }
        });

        const sortedKeywords = Object.entries(keywordFreq)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        for (const kw of sortedKeywords) {
            if (topTrends.length >= 8) break;
            if (!topTrends.includes(kw)) {
                topTrends.push(kw);
            }
        }
    }

    // Deduplicate organic links and take top 5
    const uniqueLinks = [];
    const seenUrls = new Set();

    for (const link of organicLinks) {
        if (!seenUrls.has(link.url)) {
            seenUrls.add(link.url);
            uniqueLinks.push(link);
            if (uniqueLinks.length >= 5) break;
        }
    }

    return {
        trending_topics: topTrends,
        proof_links: uniqueLinks
    };
};

module.exports = {
    getTrendingData
};
