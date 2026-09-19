import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
interface FareDistribution { bucket: string; count: number; type: 'valid'|'flagged'; }

interface FareDistributionChartProps {
  data: FareDistribution[];
}

export default function FareDistributionChart({ data }: FareDistributionChartProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E4E7EC] p-5">
      <div className="mb-4">
        <div className="text-[10px] font-bold tracking-widest uppercase text-[#667085] mb-1">FARE DISTRIBUTION</div>
        <h3 className="text-sm font-semibold text-[#172033]">Fare Distribution &amp; Outliers</h3>
        <p className="text-[11px] text-[#667085] mt-0.5">
          Outliers are flagged rather than silently deleted from the raw dataset.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as FareDistribution;
              return (
                <div className="bg-white border border-[#E4E7EC] rounded-lg shadow-sm px-3 py-2 text-xs">
                  <div className="font-medium text-[#172033]">{d.bucket}</div>
                  <div className="text-[#667085]">{d.count} observations</div>
                  {d.type === 'flagged' && <div className="text-[#D97706] text-[10px]">⚠ Flagged (outlier)</div>}
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.type === 'flagged' ? '#FDE68A' : '#BFDBFE'} stroke={d.type === 'flagged' ? '#D97706' : '#155EEF'} strokeWidth={0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
          <span className="w-3 h-3 rounded-sm bg-[#BFDBFE] border border-[#155EEF]/30 shrink-0" />
          Valid observations
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
          <span className="w-3 h-3 rounded-sm bg-[#FDE68A] border border-[#D97706]/30 shrink-0" />
          Flagged (outlier)
        </div>
      </div>
    </div>
  );
}
