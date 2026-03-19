const User = require('../models/User');

// @desc    Get user's public profile by ID
// @route   GET /api/users/:id
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username avatar bio status lastSeen');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('getProfile Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.avatar = req.body.avatar || user.avatar;

      const updatedUser = await user.save();

      res.json({
        success: true,
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
          status: updatedUser.status,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('updateProfile Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Search users by username or email
// @route   GET /api/users/search?q=
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.q
      ? {
          $or: [
            { username: { $regex: req.query.q, $options: 'i' } },
            { email: { $regex: req.query.q, $options: 'i' } },
          ],
        }
      : {};

    const currentUser = await User.findById(req.user._id);

    // Find users matching keyword, excluding self and blocked users
    const users = await User.find({ ...keyword, _id: { $ne: req.user._id, $nin: currentUser.blockedUsers } })
      .select('username avatar bio status lastSeen');

    res.json({ success: true, users });
  } catch (error) {
    console.error('searchUsers Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add a user to contacts list
// @route   POST /api/users/contacts/:id
// @access  Private
const addContact = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetUserId = req.params.id;

    if (user.contacts.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'User is already in contacts' });
    }

    if (user.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Cannot add a blocked user to contacts' });
    }

    user.contacts.push(targetUserId);
    await user.save();

    res.json({ success: true, message: 'Contact added successfully', contacts: user.contacts });
  } catch (error) {
    console.error('addContact Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Remove a user from contacts list
// @route   DELETE /api/users/contacts/:id
// @access  Private
const removeContact = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetUserId = req.params.id;

    user.contacts = user.contacts.filter(
      (contactId) => contactId.toString() !== targetUserId.toString()
    );

    await user.save();

    res.json({ success: true, message: 'Contact removed successfully', contacts: user.contacts });
  } catch (error) {
    console.error('removeContact Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Block a user
// @route   POST /api/users/block/:id
// @access  Private
const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetUserId = req.params.id;

    if (!user.blockedUsers.includes(targetUserId)) {
      user.blockedUsers.push(targetUserId);
    }

    // Remove from contacts if present
    user.contacts = user.contacts.filter(
      (contactId) => contactId.toString() !== targetUserId.toString()
    );

    await user.save();

    res.json({ success: true, message: 'User blocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    console.error('blockUser Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Unblock a user
// @route   DELETE /api/users/block/:id
// @access  Private
const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetUserId = req.params.id;

    user.blockedUsers = user.blockedUsers.filter(
      (blockedId) => blockedId.toString() !== targetUserId.toString()
    );

    await user.save();

    res.json({ success: true, message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    console.error('unblockUser Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get user's contact list with online status
// @route   GET /api/users/contacts
// @access  Private
const getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'contacts',
      'username avatar bio status lastSeen'
    );

    res.json({ success: true, contacts: user.contacts });
  } catch (error) {
    console.error('getContacts Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Manually update online status
// @route   PUT /api/users/status
// @access  Private
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'online', 'offline', 'away'

    if (!['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(req.user._id);
    if (user) {
      user.status = status;
      if (status === 'offline') {
        user.lastSeen = Date.now();
      }
      await user.save();

      res.json({ success: true, status: user.status, lastSeen: user.lastSeen });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('updateStatus Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  searchUsers,
  addContact,
  removeContact,
  blockUser,
  unblockUser,
  getContacts,
  updateStatus,
};
