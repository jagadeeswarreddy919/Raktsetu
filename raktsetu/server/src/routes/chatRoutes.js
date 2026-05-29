const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists in server directory
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', authenticate, chatController.getChats);
router.post('/', authenticate, chatController.createOrGetChat);
router.get('/:chatId/messages', authenticate, chatController.getMessages);
router.post('/:chatId/messages', authenticate, upload.single('file'), chatController.sendMessage);
router.post('/message/:messageId/reaction', authenticate, chatController.addReaction);

module.exports = router;
