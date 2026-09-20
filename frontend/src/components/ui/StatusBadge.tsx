import { CheckCircle, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react';

type Status = 'passed' | 'flagged' | 'failed' | 'pending' | 'running' | 'online' | 'offline' | 'connected' | 'disconnected' | 'ready' | 'completed' | 'error' | 'valid' | 'degraded' | 'rejected';

const config: Record<Status, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  passed: { label: 'Passed', color: '#4E8066', bg: '#EEF5F0', border: '#C5DDCC', Icon: CheckCircle },
  valid: { label: 'Valid', color: '#4E8066', bg: '#EEF5F0', border: '#C5DDCC', Icon: CheckCircle },
  completed: { label: 'Completed', color: '#4E8066', bg: '#EEF5F0', border: '#C5DDCC', Icon: CheckCircle },
  online: { label: 'Online', color: '#4E8066', bg: '#EEF5F0', border: '#C5DDCC', Icon: CheckCircle },
  connected: { label: 'Connected', color: '#4E8066', bg: '#EEF5F0', border: '#C5DDCC', Icon: CheckCircle },
  ready: { label: 'Ready', color: '#4E8066', bg: '#EEF5F0', border: '#C5DDCC', Icon: CheckCircle },
  flagged: { label: 'Flagged', color: '#95672D', bg: '#F7F2E7', border: '#E1CFAB', Icon: AlertTriangle },
  pending: { label: 'Pending', color: '#95672D', bg: '#F7F2E7', border: '#E1CFAB', Icon: Clock },
  degraded: { label: 'Degraded', color: '#95672D', bg: '#F7F2E7', border: '#E1CFAB', Icon: AlertTriangle },
  failed: { label: 'Failed', color: '#A85C57', bg: '#F7ECEA', border: '#E7C1BC', Icon: XCircle },
  offline: { label: 'Offline', color: '#A85C57', bg: '#F7ECEA', border: '#E7C1BC', Icon: XCircle },
  disconnected: { label: 'Disconnected', color: '#A85C57', bg: '#F7ECEA', border: '#E7C1BC', Icon: XCircle },
  error: { label: 'Error', color: '#A85C57', bg: '#F7ECEA', border: '#E7C1BC', Icon: XCircle },
  rejected: { label: 'Rejected', color: '#A85C57', bg: '#F7ECEA', border: '#E7C1BC', Icon: XCircle },
  running: { label: 'Running', color: '#6B5A78', bg: '#EEE8F2', border: '#D9CDE0', Icon: Loader2 },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const c = config[status] || config.pending;
  const Icon = c.Icon;
  const isRunning = status === 'running';
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${text} font-extrabold uppercase tracking-[0.07em]`}
      style={{ color: c.color, background: c.bg, borderColor: c.border }}
    >
      <Icon size={10} className={isRunning ? 'animate-spin' : ''} />
      {label ?? c.label}
    </span>
  );
}
