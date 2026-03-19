const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  searchUsers,
  addContact,
  removeContact,
  blockUser,
  unblockUser,
  getContacts,
  updateStatus,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// Apply protection to all user routes
router.use(protect);

// User search
router.get('/search', searchUsers);

// Contacts management
router.get('/contacts', getContacts);
router.post('/contacts/:id', addContact);
router.delete('/contacts/:id', removeContact);

// Blocking management
router.post('/block/:id', blockUser);
router.delete('/block/:id', unblockUser);

// Profile and status
router.put('/profile', [
  check('username', 'Username cannot be empty').optional().trim().notEmpty(),
], validateRequest, updateProfile);

router.put('/status', [
  check('status', 'Invalid status').isIn(['online', 'offline', 'away'])
], validateRequest, updateStatus);

// Generic ID routes at the bottom
router.get('/:id', getProfile);

module.exports = router;
