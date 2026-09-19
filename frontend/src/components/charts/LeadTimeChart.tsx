import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
interface LeadTimeWindow { window: string; days: number; median_fare: number | null; observation_count: number; quality_status: 'good'|'partial'|'insufficient'; }

interface LeadTimeChartProps {
  data: LeadTimeWindow[];
}

function fmt(v: number) {
  return `₹${v.toLocaleString('en-IN')}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: LeadTimeWindow }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#E4E7EC] rounded-lg shadow-sm px-3 py-2.5 text-xs">
      <div className="font-bold text-[#172033] mb-0.5">{d.window}</div>
      {d.median_fare !== null ? (
        <div className="text-[#667085]">
          Median fare <span className="font-semibold text-[#172033]">{fmt(d.median_fare)}</span>
        </div>
      ) : (
        <div className="text-[#9CA3AF]">No data</div>
      )}
      <div className="text-[#667085]">{d.observation_count} obs.</div>
      {d.window === 'T+21' && (
        <div className="mt-1 text-[10px] font-medium text-[#0E9F9A]">CPI-aligned window</div>
      )}
    </div>
  );
}

export default function LeadTimeChart({ data }: LeadTimeChartProps) {
  const chartData = data.filter(d => d.median_fare !== null);

  return (
    <div className="bg-white rounded-xl border border-[#E4E7EC] p-5">
      <div className="mb-1">
        <div className="text-[10px] font-bold tracking-widest uppercase text-[#667085] mb-1">ADVANCE PURCHASE ANALYSIS</div>
        <h3 className="text-sm font-semibold text-[#172033]">Fare by Advance Purchase Window</h3>
        <p className="text-[11px] text-[#667085] mt-0.5">Observed airfare across different advance-purchase windows.</p>
      </div>

      <div className="mt-4">
        {chartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[#9CA3AF]">Insufficient data for chart</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
              <XAxis
                dataKey="window"
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x="T+21"
                stroke="#0E9F9A"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'CPI-aligned', position: 'top', fill: '#0E9F9A', fontSize: 9 }}
              />
              <Line
                type="monotone"
                dataKey="median_fare"
                stroke="#155EEF"
                strokeWidth={2}
                dot={{ r: 4, fill: '#155EEF', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#155EEF', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Window pills */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#F2F4F7]">
        {data.map(w => (
          <div
            key={w.window}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
              w.window === 'T+21'
                ? 'border-[#0E9F9A]/40 bg-teal-50'
                : 'border-[#E4E7EC] bg-[#F9FAFB]'
            }`}
          >
            <span className={`font-mono font-bold text-[11px] ${w.window === 'T+21' ? 'text-[#0E9F9A]' : 'text-[#155EEF]'}`}>
              {w.window}
            </span>
            <span className="text-[#172033] font-medium">
              {w.median_fare !== null ? fmt(w.median_fare) : '—'}
            </span>
            <span className="text-[#9CA3AF] text-[10px]">{w.observation_count} obs</span>
          </div>
        ))}
      </div>
    </div>
  );
}
