const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true,
  },
  status: {
    type: String,
    enum: ['missed', 'completed', 'rejected'],
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0,
  },
});

const CallLog = mongoose.model('CallLog', callLogSchema);
module.exports = CallLog;
