const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { authenticate } = require('../middleware/auth');

router.get('/', galleryController.getGalleryItems);
router.post('/', authenticate, galleryController.createGalleryItem);
router.delete('/:id', authenticate, galleryController.deleteGalleryItem);

module.exports = router;
