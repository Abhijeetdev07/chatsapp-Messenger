import type { Metadata } from 'next';
import { MessageCircle, Shield, Zap, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ChatUp — Sign In',
  description: 'Log in to your ChatUp account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Brand Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-900 to-[#0c1222]" />
        
        {/* Decorative Circles */}
        <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">ChatUp</span>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Connect with anyone,<br />
            <span className="text-accent-400">anywhere.</span>
          </h2>
          <p className="text-white/60 text-lg mb-12 max-w-md">
            Fast, secure, and beautifully designed real-time messaging for everyone.
          </p>

          {/* Feature Pills */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-accent-400" />
              </div>
              <span>Lightning-fast real-time messaging</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-accent-400" />
              </div>
              <span>End-to-end encrypted conversations</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-accent-400" />
              </div>
              <span>HD video & audio calls</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
