import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
interface FareDistribution { bucket: string; count: number; type: 'valid'|'flagged'; }

interface FareDistributionChartProps {
  data: FareDistribution[];
}

export default function FareDistributionChart({ data }: FareDistributionChartProps) {
  return (
    <div className="bg-white rounded-xl border border-[#DCD7CE] p-5">
      <div className="mb-4">
        <div className="text-[10px] font-bold tracking-widest uppercase text-[#74727A] mb-1">FARE DISTRIBUTION</div>
        <h3 className="text-sm font-semibold text-[#30313A]">Fare Distribution &amp; Outliers</h3>
        <p className="text-[11px] text-[#74727A] mt-0.5">
          Outliers are flagged rather than silently deleted from the raw dataset.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ECE8E1" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fill: '#A19A9F', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#A19A9F', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as FareDistribution;
              return (
                <div className="bg-white border border-[#DCD7CE] rounded-lg shadow-sm px-3 py-2 text-xs">
                  <div className="font-medium text-[#30313A]">{d.bucket}</div>
                  <div className="text-[#74727A]">{d.count} observations</div>
                  {d.type === 'flagged' && <div className="text-[#A87535] text-[10px]">⚠ Flagged (outlier)</div>}
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.type === 'flagged' ? '#E1CFAB' : '#C7B8CE'} stroke={d.type === 'flagged' ? '#A87535' : '#6B5A78'} strokeWidth={0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[#74727A]">
          <span className="w-3 h-3 rounded-sm bg-[#C7B8CE] border border-[#6B5A78]/30 shrink-0" />
          Valid observations
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#74727A]">
          <span className="w-3 h-3 rounded-sm bg-[#E1CFAB] border border-[#A87535]/30 shrink-0" />
          Flagged (outlier)
        </div>
      </div>
    </div>
  );
}
