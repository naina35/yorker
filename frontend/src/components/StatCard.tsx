interface Props {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
  highlight?: boolean;
}

export default function StatCard({ label, value, sub, highlight = false }: Props) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-[var(--blue-400)]/10 border border-[var(--blue-400)]/30' : 'bg-white/5 border border-white/10'}`}>
      <p className="text-blue-300/50 text-xs uppercase tracking-wide font-medium">{label}</p>
      <p className={`font-display text-2xl mt-1 ${highlight ? 'text-[var(--blue-400)]' : 'text-white'}`}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-blue-300/40 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}