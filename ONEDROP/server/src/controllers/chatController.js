const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { notifyUser } = require('../config/socket');
const { sendPushNotification } = require('../utils/firebase');

// Retrieve all chat sessions for the logged in user
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id
    })
      .populate('participants', 'fullName email profileImage role availability')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'fullName' }
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving chat logs.', error: error.message });
  }
};

// Create or fetch an existing 1-on-1 chat
exports.createOrGetChat = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient user ID is required.' });
    }

    if (recipientId === req.user.id) {
      return res.status(400).json({ message: 'You cannot initiate a chat session with yourself.' });
    }

    // Check if chat already exists between these participants
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, recipientId] }
    }).populate('participants', 'fullName email profileImage role availability');

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user.id, recipientId]
      });
      chat = await Chat.findById(chat._id).populate('participants', 'fullName email profileImage role availability');
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Failed to initialize chat session.', error: error.message });
  }
};

// Retrieve message logs for a particular chat
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'fullName profileImage role')
      .sort({ createdAt: 1 });

    // Mark messages as read by current user (Read Receipts)
    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.user.id }, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages.', error: error.message });
  }
};

// Post a new message (text and media file upload compatible)
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    let fileUrl = '';
    let fileType = 'none';

    if (req.file) {
      // Local file uploads path
      fileUrl = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype.startsWith('audio/')) {
        fileType = 'audio';
      } else if (req.file.mimetype.startsWith('video/')) {
        fileType = 'video';
      } else {
        fileType = 'document';
      }
    }

    const message = await Message.create({
      chat: chatId,
      sender: req.user.id,
      text: text || '',
      fileUrl,
      fileType,
      readBy: [req.user.id]
    });

    // Update the parent chat with the last message pointer
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { lastMessage: message._id },
      { new: true }
    );

    const populatedMsg = await Message.findById(message._id)
      .populate('sender', 'fullName profileImage role');

    const chatRoom = await Chat.findById(chatId).populate('participants', 'fullName fcmToken');
    if (chatRoom) {
      const recipient = chatRoom.participants.find(
        (p) => p._id.toString() !== req.user.id.toString()
      );
      if (recipient) {
        const preview = (text || 'Sent an attachment').slice(0, 120);
        const alertMessage = `💬 ${populatedMsg.sender.fullName}: ${preview}`;

        await Notification.create({
          recipient: recipient._id,
          donor: req.user.id,
          chat: chatId,
          type: 'chat_message',
          message: alertMessage,
          requestStatus: 'None'
        });

        notifyUser(recipient._id, 'chat_notification', {
          chatId: chatId.toString(),
          senderId: req.user.id.toString(),
          senderName: populatedMsg.sender.fullName,
          message: preview,
          type: 'chat_message'
        });

        if (recipient.fcmToken) {
          sendPushNotification(recipient.fcmToken, {
            title: `💬 ${populatedMsg.sender.fullName}`,
            body: preview,
            data: {
              type: 'chat_message',
              chatId: chatId.toString(),
              senderId: req.user.id.toString(),
              chatPartnerId: req.user.id.toString()
            }
          });
        }
      }
    }

    res.status(201).json(populatedMsg);
  } catch (error) {
    res.status(500).json({ message: 'Failed to transmit message.', error: error.message });
  }
};

// Add emoji reaction
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji character is required.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Remove existing reaction by same user if present, then add new reaction
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user.id
    );
    message.reactions.push({ user: req.user.id, emoji });
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'fullName profileImage role');

    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Reaction addition failed.', error: error.message });
  }
};
