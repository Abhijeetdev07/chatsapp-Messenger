const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get all conversations for the authenticated user
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('blockedUsers');

    const conversations = await Conversation.find({
      participants: { $in: [req.user._id] }
    })
      .populate('participants', 'username avatar status lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const blockedSet = new Set((currentUser?.blockedUsers || []).map((id) => id.toString()));
    const sanitized = conversations.map((conv) => {
      if (conv.type !== 'direct' || !conv.lastMessage) return conv;
      const senderId = conv.lastMessage.sender?.toString?.() || conv.lastMessage.sender;
      if (senderId && blockedSet.has(senderId.toString())) {
        conv.lastMessage = null;
      }
      return conv;
    });

    res.json({ success: true, conversations: sanitized });
  } catch (error) {
    console.error('getConversations Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Find or create a direct conversation
// @route   POST /api/conversations/direct
// @access  Private
const createDirectConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required' });
    }

    // Check if direct conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, targetUserId] }
    }).populate('participants', 'username avatar status lastSeen');

    if (conversation) {
      return res.json({ success: true, conversation });
    }

    // Create new direct conversation
    conversation = await Conversation.create({
      type: 'direct',
      participants: [req.user._id, targetUserId]
    });

    conversation = await conversation.populate('participants', 'username avatar status lastSeen');

    res.status(201).json({ success: true, conversation });
  } catch (error) {
    console.error('createDirectConversation Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new group conversation
// @route   POST /api/conversations/group
// @access  Private
const createGroupConversation = async (req, res) => {
  try {
    const { groupName, groupAvatar, participants } = req.body;

    if (!groupName || !participants || participants.length < 2) {
      return res.status(400).json({ success: false, message: 'Group name and at least 2 other participants are required' });
    }

    const allParticipants = [...new Set([...participants, req.user._id.toString()])];

    const conversation = await Conversation.create({
      type: 'group',
      groupName,
      groupAvatar: groupAvatar || '',
      participants: allParticipants,
      groupAdmin: req.user._id
    });

    const populated = await conversation.populate('participants', 'username avatar status');

    res.status(201).json({ success: true, conversation: populated });
  } catch (error) {
    console.error('createGroupConversation Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single conversation details
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'username avatar status bio')
      .populate('groupAdmin', 'username');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized for this conversation' });
    }

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('getConversationById Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update group name/avatar
// @route   PUT /api/conversations/:id/group
// @access  Private
const updateGroup = async (req, res) => {
  try {
    const { groupName, groupAvatar } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.type !== 'group' || conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (groupName) conversation.groupName = groupName;
    if (groupAvatar !== undefined) conversation.groupAvatar = groupAvatar;

    await conversation.save();
    
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('updateGroup Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add participant to group
// @route   POST /api/conversations/:id/participants
// @access  Private
const addGroupParticipant = async (req, res) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can add participants' });
    }

    if (conversation.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User already in group' });
    }

    conversation.participants.push(userId);
    await conversation.save();

    res.json({ success: true, message: 'Participant added', conversation });
  } catch (error) {
    console.error('addGroupParticipant Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Remove participant from group
// @route   DELETE /api/conversations/:id/participants/:userId
// @access  Private
const removeGroupParticipant = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can remove participants' });
    }

    conversation.participants = conversation.participants.filter(
      p => p.toString() !== req.params.userId
    );
    await conversation.save();

    res.json({ success: true, message: 'Participant removed', conversation });
  } catch (error) {
    console.error('removeGroupParticipant Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Leave a group
// @route   POST /api/conversations/:id/leave
// @access  Private
const leaveGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    conversation.participants = conversation.participants.filter(
      p => p.toString() !== req.user._id.toString()
    );

    // If admin leaves, assign new admin or delete if empty
    if (conversation.groupAdmin.toString() === req.user._id.toString()) {
      if (conversation.participants.length > 0) {
        conversation.groupAdmin = conversation.participants[0];
      } else {
        await Conversation.deleteOne({ _id: conversation._id });
        return res.json({ success: true, message: 'Group deleted as it is empty' });
      }
    }

    await conversation.save();
    res.json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('leaveGroup Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a group (soft delete or hard delete)
// @route   DELETE /api/conversations/:id
// @access  Private
const deleteGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can delete group' });
    }

    await Conversation.deleteOne({ _id: conversation._id });
    await Message.deleteMany({ conversationId: conversation._id });

    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error('deleteGroup Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getConversations,
  createDirectConversation,
  createGroupConversation,
  getConversationById,
  updateGroup,
  addGroupParticipant,
  removeGroupParticipant,
  leaveGroup,
  deleteGroup
};
