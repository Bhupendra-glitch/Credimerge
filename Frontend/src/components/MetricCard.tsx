interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'blue' | 'amber' | 'red';
}

export default function MetricCard({
  label,
  value,
  sub,
  accent = 'green',
}: MetricCardProps) {
  const accentColors = {
    green: 'from-green-400 to-blue-500',
    blue: 'from-blue-400 to-cyan-500',
    amber: 'from-amber-400 to-orange-500',
    red: 'from-red-400 to-pink-500',
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-800/70 to-slate-900/70 border border-slate-700/50 rounded-xl p-5 overflow-hidden">
      <div
        className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${accentColors[accent]}`}
      />
      <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="text-2xl font-bold font-mono text-slate-100">{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-2">{sub}</div>}
    </div>
  );
}