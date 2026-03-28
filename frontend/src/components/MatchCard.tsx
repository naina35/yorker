import { Link } from 'react-router-dom';
import type { Match } from '../types';

const statusStyle: Record<string, string> = {
  live: 'bg-red-500/20 text-red-400 animate-pulse',
  upcoming: 'bg-blue-500/20 text-blue-300',
  completed: 'bg-green-500/20 text-green-400',
  abandoned: 'bg-gray-500/20 text-gray-400',
};

interface Props {
  match: Match;
}

export default function MatchCard({ match }: Props) {
  const resultA = match.results?.find((r) => r.team_id === match.team_a.id);
  const resultB = match.results?.find((r) => r.team_id === match.team_b.id);

  return (
    <Link
      to={`/matches/${match.id}`}
      className="group block bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-[var(--blue-400)]/50 transition-all duration-200"
    >
      {/* Status + League */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium uppercase tracking-wide ${statusStyle[match.status]}`}>
          {match.status}
        </span>
        {match.league && (
          <span className="text-xs text-blue-300/40 truncate max-w-[140px]">{match.league.name}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3">
        {/* Team A */}
        <div className="flex-1 text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white font-display text-sm mx-auto mb-1">
            {match.team_a.name.charAt(0)}
          </div>
          <p className="text-white text-sm font-medium truncate">{match.team_a.name}</p>
          {resultA && (
            <p className="text-[var(--blue-400)] font-display text-lg">
              {resultA.runs}/{resultA.wickets}
            </p>
          )}
          {resultA && <p className="text-blue-300/50 text-xs">{resultA.overs_played} ov</p>}
        </div>

        {/* VS */}
        <div className="text-blue-300/40 font-display text-sm px-2">vs</div>

        {/* Team B */}
        <div className="flex-1 text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--blue-600)] to-[var(--blue-900)] flex items-center justify-center text-white font-display text-sm mx-auto mb-1">
            {match.team_b.name.charAt(0)}
          </div>
          <p className="text-white text-sm font-medium truncate">{match.team_b.name}</p>
          {resultB && (
            <p className="text-[var(--blue-400)] font-display text-lg">
              {resultB.runs}/{resultB.wickets}
            </p>
          )}
          {resultB && <p className="text-blue-300/50 text-xs">{resultB.overs_played} ov</p>}
        </div>
      </div>

      {/* Winner / Venue / Date */}
      <div className="mt-4 pt-3 border-t border-white/5">
        {match.winner ? (
          <p className="text-green-400 text-xs text-center font-medium">🏆 {match.winner.name} won</p>
        ) : match.venue ? (
          <p className="text-blue-300/40 text-xs text-center">📍 {match.venue}</p>
        ) : match.match_date ? (
          <p className="text-blue-300/40 text-xs text-center">
            {new Date(match.match_date).toLocaleDateString()}
          </p>
        ) : null}
      </div>
    </Link>
  );
}