import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/chat', '/settings', '/profile'];

// Routes only for unauthenticated users
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for refresh token cookie (set by backend as HttpOnly)
  // This is the only reliable auth signal available at the Edge middleware layer,
  // since Zustand in-memory state isn't accessible here.
  const refreshToken = request.cookies.get('jwt')?.value;
  const isAuthenticated = !!refreshToken;

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
