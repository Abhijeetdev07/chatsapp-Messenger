const mongoose = require('mongoose');

const readBySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  readAt: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const deliveredToSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  deliveredAt: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'audio', 'system'],
    default: 'text',
  },
  content: {
    type: String,
    default: '',
  },
  clientId: {
    type: String,
    default: '',
  },
  mediaUrl: {
    type: String, // Cloudinary URL for media
    default: '',
  },
  mediaType: {
    type: String, // Mime type for media
    default: '',
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  readBy: [readBySchema],
  deliveredTo: [deliveredToSchema],
  deletedFor: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  deletedForEveryone: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
