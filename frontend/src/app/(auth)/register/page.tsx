'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye, EyeOff, MessageCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/authApi';
import { useAuthStore } from '@/store/useAuthStore';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await authApi.register({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      login(res.user, res.accessToken);
      toast.success('Account created successfully!');
      // Set a frontend-domain marker cookie so the Edge Middleware can detect auth.
      // The real security is enforced by the backend's HttpOnly jwt cookie.
      // In production (cross-origin), the backend cookie is invisible to middleware.
      document.cookie = 'chatup_auth=1; path=/; max-age=604800; SameSite=Lax';
      // Hard navigation flushes the cookie before the next request hits middleware
      window.location.href = '/chat';
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 mb-4">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Create account</h1>
        <p className="text-sm text-foreground/60 mt-2">Join ChatUp and start chatting</p>
      </div>

      {/* Form Card */}
      <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl shadow-black/5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="cooluser123"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1.5">{errors.username.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-12"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-12"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1.5">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-sm text-foreground/50 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
