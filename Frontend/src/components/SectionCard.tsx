interface SectionCardProps {
  icon: string;
  title: string;
  accent: 'green' | 'blue';
  items: { label: string; value: string | number }[];
  ctaLabel: string;
  onOpen: () => void;
}

export default function SectionCard({
  icon,
  title,
  accent,
  items,
  ctaLabel,
  onOpen,
}: SectionCardProps) {
  const border = accent === 'green' ? 'border-green-500/40' : 'border-blue-500/40';
  const bg = accent === 'green' ? 'from-green-500/10' : 'from-blue-500/10';
  const btnBg =
    accent === 'green'
      ? 'from-green-500 to-emerald-500'
      : 'from-blue-500 to-cyan-500';

  return (
    <div
      className={`bg-gradient-to-br ${bg} to-slate-900/70 border ${border} rounded-2xl p-8 flex flex-col`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h2 className="text-2xl font-bold text-slate-100 mb-6">{title}</h2>

      <div className="space-y-4 mb-8 flex-1">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex justify-between items-baseline border-b border-slate-700/30 pb-2"
          >
            <span className="text-slate-400 text-sm">{it.label}</span>
            <span className="text-slate-100 font-bold font-mono">{it.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onOpen}
        className={`w-full bg-gradient-to-r ${btnBg} text-white font-bold py-3 rounded-xl hover:opacity-90 transition`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}