import { Link } from 'react-router-dom';
import type { TeamDetail, Team } from '../types';

interface Props {
  team: TeamDetail | Team;
  showCaptain?: boolean;
}

export default function TeamCard({ team, showCaptain = false }: Props) {
  const detail = team as TeamDetail;

  return (
    <Link
      to={`/teams/${team.id}`}
      className="group block bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-[var(--blue-400)]/50 transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white font-display text-lg flex-shrink-0">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            team.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-white text-lg truncate group-hover:text-[var(--blue-400)] transition-colors">
            {team.name}
          </h3>
          {showCaptain && detail.captain && (
            <p className="text-blue-300/70 text-sm truncate">Captain: {detail.captain.name}</p>
          )}
          {detail.players && (
            <p className="text-blue-300/50 text-xs mt-0.5">{detail.players.length} players</p>
          )}
        </div>
      </div>
    </Link>
  );
}