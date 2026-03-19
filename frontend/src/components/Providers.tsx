'use client';

import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Client-side providers wrapper.
 * Handles silent auth bootstrap on refresh and socket initialization.
 * Mount this in the root layout to wrap {children}.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  useAuthBootstrap();
  useSocket();
  
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground/50 text-sm">Loading ChatUp...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
