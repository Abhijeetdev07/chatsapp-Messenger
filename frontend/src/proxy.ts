import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/chat', '/settings', '/profile'];

// Routes only for unauthenticated users
const authRoutes = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In production (cross-origin), the backend's HttpOnly "jwt" cookie lives on the
  // backend domain and is NEVER sent to Vercel's Edge Middleware.
  // Instead we rely on a lightweight "chatup_auth" marker cookie that JavaScript
  // sets on the FRONTEND domain immediately after a successful login/register.
  // Security note: this cookie only controls UI routing — all real auth is still
  // enforced by the backend checking the HttpOnly jwt cookie on every request.
  const authMarker = request.cookies.get('chatup_auth')?.value;
  const isAuthenticated = !!authMarker;

  // Redirect authenticated users AWAY from auth pages → /chat
  if (isAuthenticated && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // Redirect unauthenticated users AWAY from protected routes → /login
  if (!isAuthenticated && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Only run middleware on these paths (skip API routes, static assets, etc.)
export const config = {
  matcher: ['/chat/:path*', '/settings/:path*', '/profile/:path*', '/login', '/register'],
};
