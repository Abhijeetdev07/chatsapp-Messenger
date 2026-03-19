const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  markAsRead,
  getUnreadCount
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

router.use(protect);

router.get('/unread', getUnreadCount);

router.route('/')
  .post([
    check('conversationId', 'Conversation ID is required').notEmpty()
  ], validateRequest, sendMessage);

router.route('/:conversationId')
  .get(getMessages);

router.put('/:conversationId/read', markAsRead);

router.delete('/:id/me', deleteMessageForMe);
router.delete('/:id/everyone', deleteMessageForEveryone);

module.exports = router;
