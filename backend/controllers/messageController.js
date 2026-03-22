const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { getReceiverSocketIds, getIo } = require('../socket/socketManager');

// @desc    Get paginated messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor; // Timestamp or Message ID for cursor pagination

    // Ensure user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let query = {
      conversationId,
      deletedForEveryone: false,
      deletedFor: { $ne: req.user._id }
    };

    // Hide messages from users I have blocked (primarily affects direct chats)
    const currentUser = await User.findById(req.user._id).select('blockedUsers');
    if (currentUser?.blockedUsers?.length) {
      query.sender = { $nin: currentUser.blockedUsers };
    }

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content type sender');

    // Return reversed so client gets chronological oldest at top
    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('getMessages Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Send a text or media message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { conversationId, type, content, mediaUrl, mediaType, replyTo, clientId } = req.body;

    const normalizedType = (type || 'text').toString();
    const allowedTypes = new Set(['text', 'audio', 'system']);
    if (!allowedTypes.has(normalizedType)) {
      return res.status(400).json({ success: false, message: 'Unsupported message type' });
    }

    if (normalizedType === 'audio' && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Audio message requires mediaUrl' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Block enforcement (direct chats only)
    let blockedBetweenUsers = false;
    if (conversation.type === 'direct') {
      const otherParticipantId = conversation.participants
        .find((p) => p.toString() !== req.user._id.toString())?.toString();
      if (otherParticipantId) {
        const [senderUser, otherUser] = await Promise.all([
          User.findById(req.user._id).select('blockedUsers'),
          User.findById(otherParticipantId).select('blockedUsers'),
        ]);
        const senderBlockedOther = !!senderUser?.blockedUsers?.some((id) => id.toString() === otherParticipantId);
        const otherBlockedSender = !!otherUser?.blockedUsers?.some((id) => id.toString() === req.user._id.toString());
        // If either side blocked, allow "sent" but do not deliver/bump lastMessage (single tick)
        blockedBetweenUsers = senderBlockedOther || otherBlockedSender;
      }
    }

    const newMessage = await Message.create({
      conversationId,
      sender: req.user._id,
      type: normalizedType,
      content: content || '',
      clientId: clientId || '',
      mediaUrl: normalizedType === 'audio' ? (mediaUrl || '') : '',
      mediaType: normalizedType === 'audio' ? (mediaType || 'audio') : '',
      replyTo: replyTo || null,
      readBy: [{ user: req.user._id, readAt: Date.now() }],
      deliveredTo: [{ user: req.user._id, deliveredAt: Date.now() }]
    });

    const populatedMessage = await newMessage.populate('sender', 'username avatar');

    // If either side blocked, do not bump conversation lastMessage/updatedAt
    if (!blockedBetweenUsers) {
      conversation.lastMessage = populatedMessage._id;
      await conversation.save();
    }

    // Emit real-time message to participants so mobile doesn't need refresh
    const senderId = req.user._id.toString();
    const participants = (conversation.participants || []).map((p) => p.toString());
    const targets = blockedBetweenUsers ? [senderId] : participants;

    targets.forEach((pId) => {
      const socketIds = getReceiverSocketIds(pId);
      socketIds.forEach((id) => {
        getIo().to(id).emit('receive_message', populatedMessage);
      });
    });

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('sendMessage Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a message for me
// @route   DELETE /api/messages/:id/me
// @access  Private
const deleteMessageForMe = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (!message.deletedFor.includes(req.user._id)) {
      message.deletedFor.push(req.user._id);
      await message.save();
    }

    res.json({ success: true, message: 'Message deleted for you' });
  } catch (error) {
    console.error('deleteMessageForMe Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a message for everyone
// @route   DELETE /api/messages/:id/everyone
// @access  Private
const deleteMessageForEveryone = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Only sender can delete for everyone
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only sender can delete message for everyone' });
    }

    message.deletedForEveryone = true;
    message.content = 'This message was deleted';
    message.mediaUrl = '';
    
    await message.save();

    res.json({ success: true, message: 'Message deleted for everyone', deletedMessage: message });
  } catch (error) {
    console.error('deleteMessageForEveryone Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark messages in a conversation as read
// @route   PUT /api/messages/:conversationId/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.updateMany(
      {
        conversationId,
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: { readBy: { user: req.user._id, readAt: Date.now() } }
      }
    );

    res.json({ success: true, count: messages.modifiedCount });
  } catch (error) {
    console.error('markAsRead Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get unread count per conversation
// @route   GET /api/messages/unread
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const unreadStats = await Message.aggregate([
      {
        $match: {
          'readBy.user': { $ne: req.user._id },
          deletedForEveryone: false,
          deletedFor: { $ne: req.user._id },
          sender: { $ne: req.user._id }
        }
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ success: true, unreadStats });
  } catch (error) {
    console.error('getUnreadCount Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  markAsRead,
  getUnreadCount
};
