import { CheckCircle, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react';

type Status = 'passed' | 'flagged' | 'failed' | 'pending' | 'running' | 'online' | 'offline' | 'connected' | 'disconnected' | 'ready' | 'completed' | 'error' | 'valid' | 'degraded' | 'rejected';

const config: Record<Status, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  passed:      { label: 'Passed',      color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
  valid:       { label: 'Valid',       color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
  online:      { label: 'Online',      color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
  connected:   { label: 'Connected',   color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
  ready:       { label: 'Ready',       color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
  flagged:     { label: 'Flagged',     color: '#D97706', bg: '#FFFBEB', Icon: AlertTriangle },
  pending:     { label: 'Pending',     color: '#D97706', bg: '#FFFBEB', Icon: Clock },
  degraded:    { label: 'Degraded',    color: '#D97706', bg: '#FFFBEB', Icon: AlertTriangle },
  failed:      { label: 'Failed',      color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
  offline:     { label: 'Offline',     color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
  disconnected:{ label: 'Disconnected',color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
  error:       { label: 'Error',       color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
  rejected:    { label: 'Rejected',    color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
  running:     { label: 'Running',     color: '#155EEF', bg: '#EEF4FF', Icon: Loader2 },
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
  const text = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${text} font-medium rounded-full px-2 py-0.5`}
      style={{ color: c.color, background: c.bg }}
    >
      <Icon size={10} className={isRunning ? 'animate-spin' : ''} />
      {label ?? c.label}
    </span>
  );
}
