const express = require('express');
const router = express.Router();
const { getAnalyticsOverview, syncAnalytics, analyzeSentiment, analyzeSentimentRaw } = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/overview', getAnalyticsOverview);
router.post('/sync', syncAnalytics);
router.post('/emotion', analyzeSentiment);
router.post('/emotion-debug', analyzeSentimentRaw);

module.exports = router;
