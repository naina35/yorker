import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '../api/teams';
import { Link } from 'react-router-dom';

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading } = useQuery({ queryKey: ['team', Number(id)], queryFn: () => teamsApi.getById(Number(id)) });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--blue-400)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!team) return <p className="text-center text-red-400 py-16">Team not found</p>;

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-[var(--blue-800)] to-[var(--blue-900)] border border-white/10 rounded-2xl p-6 mb-6">
        <h1 className="font-display text-2xl text-white">{team.name}</h1>
        <p className="text-blue-300/60 text-sm mt-1">Captain: {team.captain.name}</p>
      </div>
      <h2 className="font-display text-white text-lg mb-3">Squad ({team.players.length})</h2>
      <div className="space-y-2">
        {team.players.map(p => (
          <Link key={p.id} to={`/profile/${p.id}`}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white text-sm font-display">
              {p.name.charAt(0)}
            </div>
            <span className="text-white font-medium">{p.name}</span>
            {p.id === team.captain.id && <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Captain</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}