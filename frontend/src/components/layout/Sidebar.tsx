import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, ShieldCheck, Zap, BookOpen, Activity, X, BarChart3, LineChart } from 'lucide-react';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/routes', label: 'Route Explorer', icon: Map },
  { to: '/quality', label: 'Data Quality', icon: ShieldCheck },
  { to: '/pipeline', label: 'Collection Pipeline', icon: Zap },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
  { to: '/backtesting', label: 'Backtesting', icon: BarChart3 },
  { to: '/methodology', label: 'Methodology', icon: BookOpen },
  { to: '/system', label: 'System Status', icon: Activity },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-30 w-56 flex flex-col
          bg-white border-r border-[#E4E7EC]
          transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#E4E7EC]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#155EEF] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 10 L7 2 L12 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="10.5" r="1.5" fill="white"/>
              </svg>
            </div>
            <span className="text-[#172033] font-bold text-lg tracking-tight">API<span className="text-[#155EEF]">x</span></span>
          </div>
          <button onClick={onClose} className="lg:hidden text-[#667085] hover:text-[#172033] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${active
                    ? 'bg-[#EEF4FF] text-[#155EEF]'
                    : 'text-[#667085] hover:bg-[#F9FAFB] hover:text-[#172033]'
                  }
                `}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E4E7EC]">
          <div className="text-[11px] font-semibold text-[#172033] tracking-wide uppercase mb-0.5">APIx Prototype</div>
          <div className="text-[11px] text-[#667085] leading-snug">Data-driven airfare intelligence</div>
        </div>
      </aside>
    </>
  );
}
