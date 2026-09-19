import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const p = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }[padding];
  return (
    <div className={`bg-white rounded-xl border border-[#E4E7EC] ${p} ${className}`}>
      {children}
    </div>
  );
}
