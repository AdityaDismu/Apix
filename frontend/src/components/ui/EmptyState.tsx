import { ReactNode } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  linkAction?: { label: string; href: string };
}

export default function EmptyState({ icon, title, description, action, linkAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DED7D0] bg-[#F2EEE8] text-[#8B858C] shadow-[0_8px_20px_rgba(70,61,69,.05)]">
          {icon}
        </div>
      )}
      <p className="mb-1.5 text-sm font-extrabold tracking-[-0.01em] text-[#3F3D45]">{title}</p>
      {description && <p className="max-w-md text-xs leading-relaxed text-[#858087]">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#6B5A78] hover:text-[#56485F]">
          <RefreshCw size={12} /> {action.label}
        </button>
      )}
      {linkAction && (
        <a href={linkAction.href} className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-[#6B5A78] hover:text-[#56485F]">
          {linkAction.label} <ArrowUpRight size={12} />
        </a>
      )}
    </div>
  );
}
