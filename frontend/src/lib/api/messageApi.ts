import api from '../axios';

export const messageApi = {
  getMessages: (conversationId: string, cursor?: string) => 
    api.get(`/messages/${conversationId}${cursor ? `?cursor=${cursor}` : ''}`).then(res => res.data),
  sendMessage: (payload: { conversationId: string, type?: string, content?: string, mediaUrl?: string, mediaType?: string, replyTo?: string }) => 
    api.post('/messages', payload).then(res => res.data),
  deleteMessage: (messageId: string, data: { deleteForEveryone: boolean }) => 
    api.delete(`/messages/${messageId}`, { data }).then(res => res.data),
  markAsRead: (messageId: string) => api.put(`/messages/${messageId}/read`).then(res => res.data),
  getUnreadCount: () => api.get('/messages/unread').then(res => res.data),
};
