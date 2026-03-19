import api from '../axios';

export const conversationApi = {
  getConversations: () => api.get('/conversations').then(res => res.data),
  createDirect: (targetUserId: string) => api.post('/conversations/direct', { targetUserId }).then(res => res.data),
  createGroup: (payload: { groupName: string, participants: string[] }) => api.post('/conversations/group', payload).then(res => res.data),
  getById: (conversationId: string) => api.get(`/conversations/${conversationId}`).then(res => res.data),
  updateGroup: (conversationId: string, payload: { groupName?: string, groupAvatar?: string }) => api.put(`/conversations/${conversationId}/group`, payload).then(res => res.data),
  addParticipant: (conversationId: string, userId: string) => api.post(`/conversations/${conversationId}/participants`, { userId }).then(res => res.data),
  removeParticipant: (conversationId: string, userId: string) => api.delete(`/conversations/${conversationId}/participants/${userId}`).then(res => res.data),
  leaveGroup: (conversationId: string) => api.post(`/conversations/${conversationId}/leave`).then(res => res.data),
  deleteGroup: (conversationId: string) => api.delete(`/conversations/${conversationId}`).then(res => res.data),
};
