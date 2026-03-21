const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

const isBlockedBetween = async (aId, bId) => {
  const [a, b] = await Promise.all([
    User.findById(aId).select('blockedUsers'),
    User.findById(bId).select('blockedUsers'),
  ]);
  const aBlockedB = !!a?.blockedUsers?.some((id) => id.toString() === bId.toString());
  const bBlockedA = !!b?.blockedUsers?.some((id) => id.toString() === aId.toString());
  return aBlockedB || bBlockedA;
};

module.exports = (io, socket, userSocketMap) => {
  const userId = socket.user._id.toString();

  // --------------------------------------------------------
  // PRESENCE & CONNECTION EVENTS
  // --------------------------------------------------------
  
  // connection — register user as online, notify contacts
  const notifyContactsOnline = async () => {
    try {
      const user = await User.findById(userId).populate('contacts', '_id');
      if (!user) return;
      
      user.status = 'online';
      await user.save();

      for (const contact of user.contacts) {
        const contactId = contact._id.toString();
        const blocked = await isBlockedBetween(userId, contactId);
        if (blocked) continue;

        const contactSocketIds = Array.from(userSocketMap.get(contactId) || []);
        contactSocketIds.forEach((id) => {
          io.to(id).emit('user_online', { userId, status: 'online' });
        });
      }
    } catch (err) {
      console.error('Notify Online Error:', err);
    }
  };
  
  // Call automatically on setup
  notifyContactsOnline();

  // status_change
  socket.on('status_change', async (status) => {
    try {
      if (!['online', 'offline', 'away'].includes(status)) return;
      
      const user = await User.findById(userId).populate('contacts', '_id');
      if (!user) return;

      user.status = status;
      if (status === 'offline') user.lastSeen = Date.now();
      await user.save();

      for (const contact of user.contacts) {
        const contactId = contact._id.toString();
        const blocked = await isBlockedBetween(userId, contactId);
        if (blocked) continue;

        const contactSocketIds = Array.from(userSocketMap.get(contactId) || []);
        contactSocketIds.forEach((id) => {
          io.to(id).emit('status_change', { userId, status, lastSeen: user.lastSeen });
        });
      }
    } catch (err) {
      console.error('Status Change Error:', err);
    }
  });

  // --------------------------------------------------------
  // MESSAGING EVENTS
  // --------------------------------------------------------

  // send_message
  socket.on('send_message', async (messageData) => {
    try {
      const { conversationId, type, content, mediaUrl, mediaType, replyTo, clientId } = messageData;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId)) return;

      // Block enforcement (direct chats only)
      let blockedBetweenUsers = false;
      if (conversation.type === 'direct') {
        const otherParticipantId = conversation.participants
          .find((p) => p.toString() !== userId)?.toString();
        if (otherParticipantId) {
          const [senderUser, otherUser] = await Promise.all([
            User.findById(userId).select('blockedUsers'),
            User.findById(otherParticipantId).select('blockedUsers'),
          ]);
          const senderBlockedOther = !!senderUser?.blockedUsers?.some((id) => id.toString() === otherParticipantId);
          const otherBlockedSender = !!otherUser?.blockedUsers?.some((id) => id.toString() === userId);
          // If either side blocked, allow "sent" but do not deliver (single tick)
          blockedBetweenUsers = senderBlockedOther || otherBlockedSender;
        }
      }

      // Media restrictions: only allow text + audio (voice notes) + system
      const normalizedType = (type || 'text').toString();
      const allowedTypes = new Set(['text', 'audio', 'system']);
      if (!allowedTypes.has(normalizedType)) {
        return;
      }

      // If audio, require a mediaUrl (uploaded via /api/upload)
      if (normalizedType === 'audio' && !mediaUrl) {
        return;
      }

      // Save to DB
      const newMessage = await Message.create({
        conversationId,
        sender: userId,
        type: normalizedType,
        content: content || '',
        clientId: clientId || '',
        mediaUrl: normalizedType === 'audio' ? (mediaUrl || '') : '',
        mediaType: normalizedType === 'audio' ? (mediaType || 'audio') : '',
        replyTo: replyTo || null,
        readBy: [{ user: userId, readAt: Date.now() }],
        deliveredTo: [{ user: userId, deliveredAt: Date.now() }]
      });

      const populatedMessage = await newMessage.populate('sender', 'username avatar');

      // If either side blocked, emit ONLY to sender and do NOT bump conversation lastMessage/updatedAt
      if (blockedBetweenUsers) {
        const senderSockets = Array.from(userSocketMap.get(userId) || []);
        senderSockets.forEach((id) => {
          io.to(id).emit('receive_message', populatedMessage);
        });
        return;
      }

      conversation.lastMessage = populatedMessage._id;
      await conversation.save();

      // Emit to all participants in conversation
      conversation.participants.forEach((participantId) => {
        const pIdStr = participantId.toString();
        const pSockets = Array.from(userSocketMap.get(pIdStr) || []);
        pSockets.forEach(id => {
          io.to(id).emit('receive_message', populatedMessage);
        });
      });
    } catch (err) {
      console.error('send_message Error:', err);
    }
  });

  // message_read
  socket.on('message_read', async ({ messageId, conversationId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.conversationId.toString() !== conversationId) return;

      if (!message.readBy.some(r => r.user.toString() === userId)) {
        message.readBy.push({ user: userId, readAt: Date.now() });
        await message.save();

        // Emit update to the original sender so they see read receipts
        const senderSockets = Array.from(userSocketMap.get(message.sender.toString()) || []);
        senderSockets.forEach(id => {
          io.to(id).emit('message_read_update', { messageId, conversationId, readBy: message.readBy });
        });
      }
    } catch (err) {
      console.error('message_read Error:', err);
    }
  });

  // message_delivered
  socket.on('message_delivered', async ({ messageId, conversationId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.conversationId.toString() !== conversationId) return;

      if (!message.deliveredTo.some(r => r.user.toString() === userId)) {
        message.deliveredTo.push({ user: userId, deliveredAt: Date.now() });
        await message.save();

        // Emit update to the original sender so they see delivery receipts (double gray ticks)
        const senderSockets = Array.from(userSocketMap.get(message.sender.toString()) || []);
        senderSockets.forEach(id => {
          io.to(id).emit('message_delivered_update', { messageId, conversationId, deliveredTo: message.deliveredTo });
        });
      }
    } catch (err) {
      console.error('message_delivered Error:', err);
    }
  });

  // typing_start
  socket.on('typing_start', async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId)) return;

      if (conversation.type === 'direct') {
        const otherParticipantId = conversation.participants
          .find((p) => p.toString() !== userId)?.toString();
        if (otherParticipantId) {
          const blocked = await isBlockedBetween(userId, otherParticipantId);
          if (blocked) return;
        }
      }

      conversation.participants.forEach((participantId) => {
        const pIdStr = participantId.toString();
        if (pIdStr === userId) return; // Don't emit to self

        const pSockets = Array.from(userSocketMap.get(pIdStr) || []);
        pSockets.forEach(id => {
          io.to(id).emit('user_typing', { conversationId, userId });
        });
      });
    } catch (err) {
      console.error('typing_start Error:', err);
    }
  });

  // typing_stop
  socket.on('typing_stop', async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId)) return;

      if (conversation.type === 'direct') {
        const otherParticipantId = conversation.participants
          .find((p) => p.toString() !== userId)?.toString();
        if (otherParticipantId) {
          const blocked = await isBlockedBetween(userId, otherParticipantId);
          if (blocked) return;
        }
      }

      conversation.participants.forEach((participantId) => {
        const pIdStr = participantId.toString();
        if (pIdStr === userId) return;

        const pSockets = Array.from(userSocketMap.get(pIdStr) || []);
        pSockets.forEach(id => {
          io.to(id).emit('user_stopped_typing', { conversationId, userId });
        });
      });
    } catch (err) {
      console.error('typing_stop Error:', err);
    }
  });

  // delete_message
  socket.on('delete_message', async ({ messageId, conversationId, deleteForEveryone }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.conversationId.toString() !== conversationId) return;

      const conversation = await Conversation.findById(conversationId);

      if (deleteForEveryone && message.sender.toString() === userId) {
        message.deletedForEveryone = true;
        message.content = 'This message was deleted';
        message.mediaUrl = '';
        await message.save();

        conversation.participants.forEach((participantId) => {
          const pSockets = Array.from(userSocketMap.get(participantId.toString()) || []);
          pSockets.forEach(id => {
            io.to(id).emit('message_deleted', { messageId, conversationId, deleteForEveryone: true });
          });
        });
      } else if (!deleteForEveryone) {
        if (!message.deletedFor.includes(userId)) {
          message.deletedFor.push(userId);
          await message.save();
          // Emit only to self
          const mySockets = Array.from(userSocketMap.get(userId) || []);
          mySockets.forEach(id => {
             io.to(id).emit('message_deleted', { messageId, conversationId, deleteForEveryone: false, userId });
          });
        }
      }
    } catch (err) {
      console.error('delete_message Error:', err);
    }
  });
};

module.exports.handleDisconnectPresence = async (io, userSocketMap, userId) => {
  try {
     const user = await User.findById(userId).populate('contacts', '_id');
     if (!user) return;

     user.status = 'offline';
     user.lastSeen = Date.now();
     await user.save();

     for (const contact of user.contacts) {
       const contactId = contact._id.toString();
       const blocked = await isBlockedBetween(userId, contactId);
       if (blocked) continue;

       const contactSocketIds = Array.from(userSocketMap.get(contactId) || []);
       contactSocketIds.forEach((id) => {
         io.to(id).emit('user_offline', { userId, status: 'offline', lastSeen: user.lastSeen });
       });
     }
  } catch (err) {
    console.error('Disconnect Presence Error:', err);
  }
};
