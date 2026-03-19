import api from '../axios';

export const authApi = {
  register: (payload: Record<string, any>) => api.post('/auth/register', payload).then(res => res.data),
  login: (payload: Record<string, any>) => api.post('/auth/login', payload).then(res => res.data),
  logout: () => api.post('/auth/logout').then(res => res.data),
  getMe: () => api.get('/auth/me').then(res => res.data),
};
