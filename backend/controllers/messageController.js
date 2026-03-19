const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

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
    const { conversationId, type, content, mediaUrl, mediaType, replyTo } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const newMessage = await Message.create({
      conversationId,
      sender: req.user._id,
      type: type || 'text',
      content: content || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || '',
      replyTo: replyTo || null,
      readBy: [{ user: req.user._id, readAt: Date.now() }]
    });

    const populatedMessage = await newMessage.populate('sender', 'username avatar');
    
    // Update the conversation with the newest message pointer
    conversation.lastMessage = populatedMessage._id;
    await conversation.save();

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
