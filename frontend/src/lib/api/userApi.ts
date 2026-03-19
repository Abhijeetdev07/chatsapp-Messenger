import api from '../axios';

export const userApi = {
  getProfile: (userId: string) => api.get(`/users/${userId}`).then(res => res.data),
  updateProfile: (payload: Record<string, any>) => api.put('/users/profile', payload).then(res => res.data),
  searchUsers: (query: string) => api.get(`/users/search?q=${query}`).then(res => res.data),
  addContact: (userId: string) => api.post(`/users/contacts/${userId}`).then(res => res.data),
  removeContact: (userId: string) => api.delete(`/users/contacts/${userId}`).then(res => res.data),
  getContacts: () => api.get('/users/contacts').then(res => res.data),
  blockUser: (userId: string) => api.post(`/users/block/${userId}`).then(res => res.data),
  unblockUser: (userId: string) => api.delete(`/users/block/${userId}`).then(res => res.data),
  updateStatus: (status: 'online' | 'offline' | 'away') => api.put('/users/status', { status }).then(res => res.data),
};
