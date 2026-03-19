import api from '../axios';

export const callApi = {
  getCallLogs: (page = 1, limit = 20) => api.get(`/calls?page=${page}&limit=${limit}`).then(res => res.data),
  getCallLogById: (callId: string) => api.get(`/calls/${callId}`).then(res => res.data),
};
