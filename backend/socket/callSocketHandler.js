const { createCallLog } = require('../controllers/callController');

/**
 * Helper: safely get socket IDs for a user.
 * Returns an empty array (never throws) if userId is missing or unknown.
 */
const getSockets = (userSocketMap, userId) => {
  if (!userId) return [];
  return Array.from(userSocketMap.get(userId.toString()) || []);
};

module.exports = (io, socket, userSocketMap) => {
  const userId = socket.user._id.toString();

  // ── call_invite ──────────────────────────────────────────────────────────
  socket.on('call_invite', ({ targetUserId, conversationId, type, callerInfo, callType }) => {
    // callType is sent by frontend, type is the canonical field — accept both
    const resolvedType = type || callType;
    const sockets = getSockets(userSocketMap, targetUserId);
    sockets.forEach(id => {
      io.to(id).emit('call_invite', {
        callerUserId: userId,
        conversationId,
        type: resolvedType,
        callerInfo,
        callType: resolvedType, // include both for frontend compat
      });
    });
  });

  // ── call_accept ──────────────────────────────────────────────────────────
  // Frontend emits: { targetUserId, conversationId }
  socket.on('call_accept', ({ targetUserId, callerUserId, conversationId }) => {
    // Accept both field names — targetUserId is what the frontend sends
    const resolvedId = targetUserId || callerUserId;
    const sockets = getSockets(userSocketMap, resolvedId);
    sockets.forEach(id => {
      io.to(id).emit('call_accept', { acceptedBy: userId });
    });
  });

  // ── call_reject ──────────────────────────────────────────────────────────
  // Frontend emits: { targetUserId, conversationId }
  socket.on('call_reject', async ({ targetUserId, callerUserId, conversationId, type, callType, reason }) => {
    const resolvedId = targetUserId || callerUserId;
    const resolvedType = type || callType;
    const sockets = getSockets(userSocketMap, resolvedId);
    sockets.forEach(id => {
      io.to(id).emit('call_reject', { rejectedBy: userId, reason });
    });

    // Only log if we have enough info
    if (resolvedId && conversationId) {
      try {
        await createCallLog({
          conversationId,
          initiator: resolvedId,
          participants: [resolvedId, userId],
          type: resolvedType || 'audio',
          status: 'rejected',
          endedAt: Date.now(),
        });
      } catch (error) {
        console.error('call_reject — Error logging call:', error);
      }
    }
  });

  // ── call_end ─────────────────────────────────────────────────────────────
  socket.on('call_end', async ({ targetUserId, conversationId, type, callType, duration, status = 'completed', startedAt }) => {
    const resolvedType = type || callType;
    const sockets = getSockets(userSocketMap, targetUserId);
    sockets.forEach(id => {
      io.to(id).emit('call_end', { endedBy: userId });
    });

    if (targetUserId && conversationId) {
      try {
        await createCallLog({
          conversationId,
          initiator: userId,
          participants: [userId, targetUserId],
          type: resolvedType || 'audio',
          status,
          startedAt: startedAt || Date.now(),
          endedAt: Date.now(),
          duration: duration || 0,
        });
      } catch (error) {
        console.error('call_end — Error logging call:', error);
      }
    }
  });

  // ── call_busy ────────────────────────────────────────────────────────────
  socket.on('call_busy', ({ targetUserId, callerUserId }) => {
    const resolvedId = targetUserId || callerUserId;
    const sockets = getSockets(userSocketMap, resolvedId);
    sockets.forEach(id => {
      io.to(id).emit('call_busy', { busyUser: userId });
    });
  });

  // ── webrtc_offer ─────────────────────────────────────────────────────────
  socket.on('webrtc_offer', ({ targetUserId, signalData, offer }) => {
    const sockets = getSockets(userSocketMap, targetUserId);
    sockets.forEach(id => {
      // Forward whichever field the caller included (offer or signalData)
      io.to(id).emit('webrtc_offer', { fromUserId: userId, signalData: signalData || offer });
    });
  });

  // ── webrtc_answer ────────────────────────────────────────────────────────
  socket.on('webrtc_answer', ({ targetUserId, signalData, answer }) => {
    const sockets = getSockets(userSocketMap, targetUserId);
    sockets.forEach(id => {
      io.to(id).emit('webrtc_answer', { fromUserId: userId, signalData: signalData || answer });
    });
  });

  // ── webrtc_ice_candidate ─────────────────────────────────────────────────
  socket.on('webrtc_ice_candidate', ({ targetUserId, candidate }) => {
    const sockets = getSockets(userSocketMap, targetUserId);
    sockets.forEach(id => {
      io.to(id).emit('webrtc_ice_candidate', { fromUserId: userId, candidate });
    });
  });

};

