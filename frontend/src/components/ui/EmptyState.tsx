import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  linkAction?: { label: string; href: string };
}

export default function EmptyState({ icon, title, description, action, linkAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[#F2F4F7] flex items-center justify-center mb-4 text-[#9CA3AF]">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-[#172033] mb-1.5">{title}</p>
      {description && (
        <p className="text-xs text-[#667085] max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#155EEF] hover:text-[#1251D0] transition-colors"
        >
          <RefreshCw size={12} /> {action.label}
        </button>
      )}
      {linkAction && (
        <a
          href={linkAction.href}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#155EEF] hover:text-[#1251D0] transition-colors"
        >
          {linkAction.label}
        </a>
      )}
    </div>
  );
}
