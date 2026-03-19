/**
 * Notification Service Stubs
 * Placeholder utility endpoints logically integrated across architecture, 
 * ready to be wired cleanly to Firebase Cloud Messaging (FCM) or Web Push API in future phases.
 */

const sendCallNotification = async (targetUserId, callerInfo, type) => {
  try {
    // e.g. target specific user socket pushes, or mobile app FCM broadcast:
    // admin.messaging().sendToDevice(targetDeviceToken, payload)
    console.log(`[Notification Service] Triggered ${type.toUpperCase()} CALL STUB push notification to user ${targetUserId} initiated by ${callerInfo.username}`);
    return true;
  } catch (error) {
    console.error('sendCallNotification Error stub:', error);
    return false;
  }
};

const sendMessageNotification = async (targetUserIds, messagePreview, senderInfo) => {
  try {
    console.log(`[Notification Service] Triggered MESSAGE STUB push notification to downstream users: [${targetUserIds.join(', ')}]. Sender: ${senderInfo.username}`);
    return true;
  } catch (error) {
    console.error('sendMessageNotification Error stub:', error);
    return false;
  }
};

module.exports = {
  sendCallNotification,
  sendMessageNotification
};
