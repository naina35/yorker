import type { Standing } from '../types';

interface Props {
  standings: Standing[];
}

export default function Standings({ standings }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="font-display text-white text-lg">Points Table</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-300/40 text-xs border-b border-white/5">
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-3 py-3 font-medium">Team</th>
              <th className="px-3 py-3 font-medium text-right">P</th>
              <th className="px-3 py-3 font-medium text-right">W</th>
              <th className="px-3 py-3 font-medium text-right">L</th>
              <th className="px-3 py-3 font-medium text-right">T</th>
              <th className="px-5 py-3 font-medium text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.team_id}
                className={`border-b border-white/5 transition-colors hover:bg-white/3 ${i === 0 ? 'bg-[var(--blue-400)]/5' : ''}`}
              >
                <td className="px-5 py-3 text-blue-300/50 font-medium">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white text-xs font-display flex-shrink-0">
                      {s.team_name.charAt(0)}
                    </div>
                    <span className="text-white font-medium truncate">{s.team_name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-blue-300/60">{s.played}</td>
                <td className="px-3 py-3 text-right text-green-400">{s.won}</td>
                <td className="px-3 py-3 text-right text-red-400/70">{s.lost}</td>
                <td className="px-3 py-3 text-right text-blue-300/60">{s.tied}</td>
                <td className="px-5 py-3 text-right font-display text-[var(--blue-400)] text-lg">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {standings.length === 0 && (
          <p className="text-center text-blue-300/40 py-8 text-sm">No standings yet</p>
        )}
      </div>
    </div>
  );
}