import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Absolutely necessary to silently transmit the refresh HttpOnly cookie to backend
});

// Outbound logic: Dynamically inject Bearer token securely from memory payload directly
api.interceptors.request.use((config) => {
  // Prevent SSR crashes by exclusively firing on Client Window bindings
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Inbound logic: Intercept 401s and transparently retry via Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if precisely authorization collapsed and we haven't already recursively failed
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Exchange HTTPcookie natively via the /refresh payload endpoint
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const newToken = res.data.token;
        
        if (typeof window !== 'undefined') {
           useAuthStore.getState().refreshToken(newToken);
        }

        // Dynamically inject the new token onto the failed request and recursively retry. User notices ZERO loading disruption.
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
         // Refresh token explicitly expired/invalidated. Full forced log out necessary.
        if (typeof window !== 'undefined') {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
