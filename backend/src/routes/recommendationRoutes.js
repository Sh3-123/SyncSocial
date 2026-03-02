const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', recommendationController.generateRecommendation);
router.post('/trend-content', recommendationController.generateTrendContent);

module.exports = router;
