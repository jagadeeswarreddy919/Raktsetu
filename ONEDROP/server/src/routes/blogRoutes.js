const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, blogController.createBlog);
router.get('/', blogController.getBlogs);

module.exports = router;
