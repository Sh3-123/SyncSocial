const express = require('express');
const router = express.Router();
const { getPosts, getPostById, syncPosts, getPublicReplies, syncPublicReplies } = require('../controllers/postController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/sync', syncPosts);
router.get('/:id/public-replies', getPublicReplies);
router.post('/:id/sync-public-replies', syncPublicReplies);

module.exports = router;
