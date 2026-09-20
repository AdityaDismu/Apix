import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { IndexHistory } from '../../api/types';
import EmptyState from '../ui/EmptyState';
import { TrendingUp } from 'lucide-react';

const PERIODS = ['1D', '7D', '30D', '90D'] as const;
type Period = typeof PERIODS[number];

const PERIOD_DAYS: Record<Period, number> = {
  '1D': 1,
  '7D': 7,
  '30D': 30,
  '90D': 90,
};

interface TrendChartProps {
  data: IndexHistory[];
  title?: string;
  label?: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: IndexHistory }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const date = new Date(d.timestamp);

  return (
    <div className="bg-[#403946] border-[#655B68] rounded-xl shadow-xl p-4 text-xs min-w-[180px] text-white">
      <div className="font-bold mb-2 border-b border-slate-700 pb-2">
        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
          {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
        </span>
      </div>
      <div className="flex items-center justify-between my-1">
        <span className="text-slate-400">APIx Index</span>
        <span className="font-bold text-blue-400 text-sm">{d.value.toFixed(2)}</span>
      </div>
      {d.observations !== undefined && (
        <div className="flex items-center justify-between text-[11px] mt-1">
          <span className="text-slate-400">Observations</span>
          <span className="font-bold text-slate-200">{d.observations}</span>
        </div>
      )}
    </div>
  );
}

export default function TrendChart({ data, title = 'Airfare Price Index History', label }: TrendChartProps) {
  const [period, setPeriod] = useState<Period>('7D');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const newestTimestamp = Math.max(...data.map(d => new Date(d.timestamp).getTime()));
    const cutoffTimestamp = newestTimestamp - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000;
    const filtered = data.filter(d => new Date(d.timestamp).getTime() >= cutoffTimestamp);
    return filtered.length > 0 ? filtered : data;
  }, [data, period]);

  if (!data || data.length < 2) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">{label || 'INDEX TREND'}</div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
        </div>
        <div className="flex-1 min-h-[240px] flex items-center justify-center">
          <EmptyState icon={<TrendingUp size={24} />} title="Insufficient Data" description="More cycles needed to map trend." />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">{label || 'INDEX TREND'}</div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
        </div>
        
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-max">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7A687F" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7A687F" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE6" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={v => {
                const d = new Date(v);
                return period === '1D' ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              }}
              tick={{ fill: '#9B959A', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              domain={['dataMin - 2', 'dataMax + 2']}
              tickFormatter={v => v.toFixed(0)}
              tick={{ fill: '#9B959A', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#CFC8BF', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#7A687F"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 6, fill: '#7A687F', stroke: '#FBF9F4', strokeWidth: 3, shadow: '0 4px 10px rgba(0,0,0,0.2)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}