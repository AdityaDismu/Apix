import { Menu, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Props {
  onMenuClick: () => void;
  onRefresh?: () => void;
  lastUpdated?: string;
  pipelineOnline?: boolean;
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/routes': 'Route Explorer',
  '/quality': 'Data Quality',
  '/pipeline': 'Collection Pipeline',
  '/analytics': 'Analytics',
  '/backtesting': 'Backtesting',
  '/methodology': 'Methodology',
  '/system': 'System Status',
};

export default function TopBar({ onMenuClick, onRefresh, lastUpdated, pipelineOnline = true }: Props) {
  const location = useLocation();
  const title = pageNames[location.pathname] || 'APIx';
  const t = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    : null;

  return (
    <header className="sticky top-0 z-10 flex h-[66px] shrink-0 items-center gap-4 border-b border-[#DCD7CE] bg-[#F5F1EB]/88 px-4 backdrop-blur-xl md:px-6">
      <button onClick={onMenuClick} className="rounded-lg p-2 text-[#6E6971] hover:bg-[#E9E4DE] lg:hidden" aria-label="Open navigation">
        <Menu size={19} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#A09A9F]">APIx workspace</div>
        <div className="truncate text-sm font-extrabold tracking-[-0.015em] text-[#3B3941]">{title}</div>
      </div>

      <div className="hidden items-center gap-2 rounded-xl border border-[#DDD7CF] bg-[#FBF8F3] px-3 py-2 text-[10px] font-bold text-[#757078] sm:flex">
        <span className={`h-2 w-2 rounded-full ${pipelineOnline ? 'bg-[#718A78]' : 'bg-[#A85C57]'}`} />
        <span>{pipelineOnline ? 'Live connection' : 'Offline'}</span>
        {t && <span className="text-[#A19AA0]">· {t}</span>}
      </div>

      {onRefresh && (
        <button onClick={onRefresh} className="icon-button" aria-label="Refresh">
          <RefreshCw size={14} />
        </button>
      )}
    </header>
  );
}
