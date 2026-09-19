import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  tag?: string;
}

export default function PageHeader({ title, subtitle, actions, tag }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {tag && (
          <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-[#155EEF] mb-2">
            {tag}
          </span>
        )}
        <h1 className="text-xl font-bold text-[#172033] leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#667085] mt-1 leading-relaxed max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
