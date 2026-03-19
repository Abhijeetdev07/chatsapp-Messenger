const express = require('express');
const router = express.Router();
const {
  getConversations,
  createDirectConversation,
  createGroupConversation,
  getConversationById,
  updateGroup,
  addGroupParticipant,
  removeGroupParticipant,
  leaveGroup,
  deleteGroup
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

router.use(protect);

router.route('/')
  .get(getConversations);

router.post('/direct', [
  check('targetUserId', 'Target User ID is required').notEmpty()
], validateRequest, createDirectConversation);

router.post('/group', [
  check('groupName', 'Group name is required').notEmpty(),
  check('participants', 'Participants must be an array').isArray()
], validateRequest, createGroupConversation);

router.route('/:id')
  .get(getConversationById)
  .delete(deleteGroup);

router.route('/:id/group')
  .put([
    check('groupName').optional().trim().notEmpty()
  ], validateRequest, updateGroup);

router.route('/:id/participants')
  .post([
    check('userId', 'User ID is required to add').notEmpty()
  ], validateRequest, addGroupParticipant);

router.route('/:id/participants/:userId')
  .delete(removeGroupParticipant);

router.post('/:id/leave', leaveGroup);

module.exports = router;
