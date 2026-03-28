import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '../api/matches';
import Scorecard from '../components/Scorecard';

export default function Match() {
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);

  const { data: match, isLoading: mLoading } = useQuery({ queryKey: ['match', matchId], queryFn: () => matchesApi.getById(matchId) });
  const { data: scorecard, isLoading: sLoading } = useQuery({ queryKey: ['scorecard', matchId], queryFn: () => matchesApi.scorecard(matchId) });

  if (mLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--blue-400)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!match) return <p className="text-center text-red-400 py-16">Match not found</p>;

  const statusStyle: Record<string, string> = { live: 'text-red-400 animate-pulse', upcoming: 'text-blue-300', completed: 'text-green-400', abandoned: 'text-gray-400' };

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-[var(--blue-800)] to-[var(--blue-900)] border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-medium uppercase tracking-wide ${statusStyle[match.status]}`}>{match.status}</span>
          {match.league && <span className="text-xs text-blue-300/40">{match.league.name}</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white font-display text-xl mx-auto mb-2">
              {match.team_a.name.charAt(0)}
            </div>
            <p className="text-white font-medium">{match.team_a.name}</p>
            {match.results?.find(r => r.team_id === match.team_a.id) && (
              <p className="font-display text-[var(--blue-400)] text-2xl mt-1">
                {match.results.find(r => r.team_id === match.team_a.id)!.runs}/{match.results.find(r => r.team_id === match.team_a.id)!.wickets}
              </p>
            )}
          </div>
          <div className="text-blue-300/40 font-display text-xl">vs</div>
          <div className="flex-1 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--blue-600)] to-[var(--blue-900)] flex items-center justify-center text-white font-display text-xl mx-auto mb-2">
              {match.team_b.name.charAt(0)}
            </div>
            <p className="text-white font-medium">{match.team_b.name}</p>
            {match.results?.find(r => r.team_id === match.team_b.id) && (
              <p className="font-display text-[var(--blue-400)] text-2xl mt-1">
                {match.results.find(r => r.team_id === match.team_b.id)!.runs}/{match.results.find(r => r.team_id === match.team_b.id)!.wickets}
              </p>
            )}
          </div>
        </div>
        {match.winner && <p className="text-center text-green-400 text-sm mt-4 font-medium">🏆 {match.winner.name} won</p>}
        {match.venue && <p className="text-center text-blue-300/40 text-xs mt-2">📍 {match.venue}</p>}
      </div>
      {sLoading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--blue-400)] border-t-transparent rounded-full animate-spin" /></div>
        : scorecard ? <Scorecard scorecard={scorecard} />
        : <p className="text-center text-blue-300/40 py-8 text-sm">No scorecard yet</p>}
    </div>
  );
}