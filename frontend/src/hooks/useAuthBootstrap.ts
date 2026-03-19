'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/lib/api/authApi';

/**
 * Silent bootstrap hook.
 * On every app load / page refresh, this hook attempts to restore the
 * user session by calling /api/auth/refresh using the HttpOnly cookie.
 * If successful, it writes the new access token + user into Zustand memory.
 * If it fails (no cookie or expired), it silently marks the user as logged out.
 * 
 * Mount this ONCE at the app shell level.
 */
export const useAuthBootstrap = () => {
  const { login, logout, setLoading, isAuthenticated } = useAuthStore();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double-firing in React Strict Mode
    if (hasRun.current) return;
    hasRun.current = true;

    const bootstrap = async () => {
      try {
        setLoading(true);

        // Step 1: Refresh the access token using the HttpOnly cookie
        const refreshRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { method: 'POST', credentials: 'include' }
        );

        if (!refreshRes.ok) {
          logout();
          return;
        }

        const refreshData = await refreshRes.json();
        const newToken = refreshData.accessToken;

        if (!newToken) {
          logout();
          return;
        }

        // Step 2: Now fetch user profile with the fresh token
        const meRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`,
          {
            method: 'GET',
            credentials: 'include',
            headers: { Authorization: `Bearer ${newToken}` },
          }
        );

        if (!meRes.ok) {
          logout();
          return;
        }

        const meData = await meRes.json();
        if (meData.success && meData.user) {
          login(meData.user, newToken);
        } else {
          logout();
        }
      } catch {
        // No valid session — user is not authenticated
        logout();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isAuthenticated };
};

