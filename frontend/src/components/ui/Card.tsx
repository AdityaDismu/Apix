import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const p = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }[padding];
  return (
    <div className={`rounded-2xl border border-[#DCD7CE] bg-[#FBF9F4] shadow-[0_12px_30px_rgba(70,61,69,.055)] ${p} ${className}`}>
      {children}
    </div>
  );
}
