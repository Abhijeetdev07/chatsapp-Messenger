import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  fallback: React.ReactNode | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function Avatar({ src, fallback, className = '', size = 'md' }: AvatarProps) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
    '2xl': 'w-24 h-24 text-4xl',
    '3xl': 'w-32 h-32 text-6xl',
  };

  const baseClasses = `relative flex-shrink-0 flex items-center justify-center rounded-full font-semibold text-white bg-primary-800 border-[1px] border-primary-800/20 overflow-hidden select-none ${sizeClasses[size]} ${className}`;

  if (src && !error) {
    return (
      <div className={baseClasses}>
        <img
          src={src}
          alt={typeof fallback === 'string' ? fallback : 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {typeof fallback === 'string' ? fallback.charAt(0).toUpperCase() || '?' : fallback}
    </div>
  );
}
