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
    <div className="bg-white border border-[#DCD7CE] rounded-lg shadow-sm px-3 py-2.5 text-xs">
      <div className="font-bold text-[#30313A] mb-0.5">{d.window}</div>
      {d.median_fare !== null ? (
        <div className="text-[#74727A]">
          Median fare <span className="font-semibold text-[#30313A]">{fmt(d.median_fare)}</span>
        </div>
      ) : (
        <div className="text-[#A19A9F]">No data</div>
      )}
      <div className="text-[#74727A]">{d.observation_count} obs.</div>
      {d.window === 'T+21' && (
        <div className="mt-1 text-[10px] font-medium text-[#718A78]">CPI-aligned window</div>
      )}
    </div>
  );
}

export default function LeadTimeChart({ data }: LeadTimeChartProps) {
  const chartData = data.filter(d => d.median_fare !== null);

  return (
    <div className="bg-white rounded-xl border border-[#DCD7CE] p-5">
      <div className="mb-1">
        <div className="text-[10px] font-bold tracking-widest uppercase text-[#74727A] mb-1">ADVANCE PURCHASE ANALYSIS</div>
        <h3 className="text-sm font-semibold text-[#30313A]">Fare by Advance Purchase Window</h3>
        <p className="text-[11px] text-[#74727A] mt-0.5">Observed airfare across different advance-purchase windows.</p>
      </div>

      <div className="mt-4">
        {chartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[#A19A9F]">Insufficient data for chart</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECE8E1" vertical={false} />
              <XAxis
                dataKey="window"
                tick={{ fill: '#A19A9F', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fill: '#A19A9F', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x="T+21"
                stroke="#718A78"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'CPI-aligned', position: 'top', fill: '#718A78', fontSize: 9 }}
              />
              <Line
                type="monotone"
                dataKey="median_fare"
                stroke="#6B5A78"
                strokeWidth={2}
                dot={{ r: 4, fill: '#6B5A78', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#6B5A78', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Window pills */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#ECE8E1]">
        {data.map(w => (
          <div
            key={w.window}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
              w.window === 'T+21'
                ? 'border-[#718A78]/40 bg-teal-50'
                : 'border-[#DCD7CE] bg-[#F6F2EC]'
            }`}
          >
            <span className={`font-mono font-bold text-[11px] ${w.window === 'T+21' ? 'text-[#718A78]' : 'text-[#6B5A78]'}`}>
              {w.window}
            </span>
            <span className="text-[#30313A] font-medium">
              {w.median_fare !== null ? fmt(w.median_fare) : '—'}
            </span>
            <span className="text-[#A19A9F] text-[10px]">{w.observation_count} obs</span>
          </div>
        ))}
      </div>
    </div>
  );
}
