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
  const isGreen = accent === 'green';

  return (
    <div
      className={`
        group relative overflow-hidden
        bg-slate-950/60
        border
        ${isGreen ? 'border-emerald-400/20 hover:border-emerald-400/50' : 'border-cyan-400/20 hover:border-cyan-400/50'}
        p-8
        flex flex-col
        transition-all duration-500
        hover:-translate-y-1
      `}
    >
      {/* Ambient glow */}
      <div
        className={`
          absolute -top-24 -right-24
          w-48 h-48 rounded-full blur-[90px]
          opacity-20 group-hover:opacity-40
          transition-opacity duration-500
          ${isGreen ? 'bg-emerald-400' : 'bg-cyan-400'}
        `}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-10">
        <div>
          <div
            className={`data-mono text-[10px] uppercase tracking-[0.25em] mb-3 ${
              isGreen ? 'text-emerald-400/60' : 'text-cyan-400/60'
            }`}
          >
            {isGreen ? 'Debt / 01' : 'Credit / 02'}
          </div>

          <h2 className="text-2xl font-bold text-white">
            {title}
          </h2>
        </div>

        <div
          className={`
            text-xl transition-transform duration-300
            group-hover:translate-x-1 group-hover:-translate-y-1
            ${isGreen ? 'text-emerald-400' : 'text-cyan-400'}
          `}
        >
          ↗
        </div>
      </div>

      {/* Metrics */}
      <div className="relative space-y-5 mb-10 flex-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-3"
          >
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
              {item.label}
            </span>

            <span className="data-mono text-sm md:text-base font-semibold text-slate-200">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onOpen}
        className={`
          relative w-full py-3
          text-xs uppercase tracking-[0.16em] font-semibold
          border
          transition-all duration-300
          ${
            isGreen
              ? 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400 hover:text-black'
              : 'border-cyan-400/30 text-cyan-400 hover:bg-cyan-400 hover:text-black'
          }
        `}
      >
        {ctaLabel}
      </button>
    </div>
  );
}