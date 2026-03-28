import { Link } from 'react-router-dom';
import type { League } from '../types';

const formatBadge: Record<string, string> = {
  T20: 'bg-emerald-500/20 text-emerald-300',
  ODI: 'bg-blue-500/20 text-blue-300',
  Test: 'bg-amber-500/20 text-amber-300',
  Custom: 'bg-purple-500/20 text-purple-300',
};

interface Props {
  league: League;
}

export default function LeagueCard({ league }: Props) {
  return (
    <Link
      to={`/leagues/${league.id}`}
      className="group block bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-[var(--blue-400)]/50 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-white text-lg truncate group-hover:text-[var(--blue-400)] transition-colors">
            {league.name}
          </h3>
          {league.description && (
            <p className="text-blue-300/60 text-sm mt-1 line-clamp-2">{league.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {league.format && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${formatBadge[league.format] || 'bg-white/10 text-white/70'}`}>
                {league.format}
              </span>
            )}
            {league.max_overs && (
              <span className="text-xs text-blue-300/50">{league.max_overs} overs</span>
            )}
            {league.location_name && (
              <span className="text-xs text-blue-300/50 truncate">📍 {league.location_name}</span>
            )}
            {league.distance_km !== undefined && (
              <span className="text-xs text-blue-400 font-medium">{league.distance_km} km away</span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--blue-600)] to-[var(--blue-900)] flex items-center justify-center text-lg flex-shrink-0">
          🏆
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-blue-300/40">by {league.creator_name || league.creator?.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${league.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {league.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </Link>
  );
}