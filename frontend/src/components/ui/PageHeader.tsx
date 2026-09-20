import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  tag?: string;
}

export default function PageHeader({ title, subtitle, actions, tag }: PageHeaderProps) {
  return (
    <div className="mb-7 flex items-end justify-between gap-5 border-b border-[#DCD7CE] pb-5">
      <div className="min-w-0">
        {tag && (
          <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#EEE8F2] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#675571]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8F7BA0]" />
            {tag}
          </span>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
