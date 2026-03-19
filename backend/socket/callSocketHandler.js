const { createCallLog } = require('../controllers/callController');

module.exports = (io, socket, userSocketMap) => {
  const userId = socket.user._id.toString();

  // call_invite
  socket.on('call_invite', ({ targetUserId, conversationId, type, callerInfo }) => {
    const targetSockets = Array.from(userSocketMap.get(targetUserId.toString()) || []);
    
    // Relay offer completely
    targetSockets.forEach(id => {
      io.to(id).emit('call_invite', {
        callerUserId: userId,
        conversationId,
        type,
        callerInfo
      });
    });
  });

  // call_accept
  socket.on('call_accept', ({ callerUserId }) => {
    const callerSockets = Array.from(userSocketMap.get(callerUserId.toString()) || []);
    callerSockets.forEach(id => {
      io.to(id).emit('call_accept', { acceptedBy: userId });
    });
  });

  // call_reject
  socket.on('call_reject', async ({ callerUserId, conversationId, type }) => {
    const callerSockets = Array.from(userSocketMap.get(callerUserId.toString()) || []);
    callerSockets.forEach(id => {
      io.to(id).emit('call_reject', { rejectedBy: userId });
    });

    try {
      await createCallLog({
        conversationId,
        initiator: callerUserId,
        participants: [callerUserId, userId],
        type,
        status: 'rejected',
        endedAt: Date.now()
      });
    } catch (error) {
      console.error('call_reject Error logging:', error);
    }
  });

  // call_end
  socket.on('call_end', async ({ targetUserId, conversationId, type, duration, status = 'completed', startedAt }) => {
    try {
      const targetSockets = Array.from(userSocketMap.get(targetUserId.toString()) || []);
      targetSockets.forEach(id => {
        io.to(id).emit('call_end', { endedBy: userId });
      });

      await createCallLog({
        conversationId,
        initiator: userId, 
        participants: [userId, targetUserId],
        type,
        status,
        startedAt: startedAt || Date.now(),
        endedAt: Date.now(),
        duration: duration || 0
      });
    } catch (error) {
      console.error('call_end Error logging:', error);
    }
  });

  // call_busy
  socket.on('call_busy', ({ callerUserId }) => {
    const callerSockets = Array.from(userSocketMap.get(callerUserId.toString()) || []);
    callerSockets.forEach(id => {
      io.to(id).emit('call_busy', { busyUser: userId });
    });
  });

  // webrtc_offer
  socket.on('webrtc_offer', ({ targetUserId, offer }) => {
    const targetSockets = Array.from(userSocketMap.get(targetUserId.toString()) || []);
    targetSockets.forEach(id => {
      io.to(id).emit('webrtc_offer', { fromUserId: userId, offer });
    });
  });

  // webrtc_answer
  socket.on('webrtc_answer', ({ targetUserId, answer }) => {
    const targetSockets = Array.from(userSocketMap.get(targetUserId.toString()) || []);
    targetSockets.forEach(id => {
      io.to(id).emit('webrtc_answer', { fromUserId: userId, answer });
    });
  });

  // webrtc_ice_candidate
  socket.on('webrtc_ice_candidate', ({ targetUserId, candidate }) => {
    const targetSockets = Array.from(userSocketMap.get(targetUserId.toString()) || []);
    targetSockets.forEach(id => {
      io.to(id).emit('webrtc_ice_candidate', { fromUserId: userId, candidate });
    });
  });

};
