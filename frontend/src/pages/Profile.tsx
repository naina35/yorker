import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/stats';
import StatCard from '../components/StatCard';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: ['playerStats', id], queryFn: () => statsApi.playerStats(Number(id)) });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--blue-400)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-center text-red-400 py-16">Player not found</p>;

  const { player, batting, bowling } = data;
  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white font-display text-2xl">
          {player.name.charAt(0)}
        </div>
        <div>
          <h1 className="font-display text-2xl text-white">{player.name}</h1>
          <p className="text-blue-300/50 text-sm">Career Stats</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-white text-lg mb-4">Batting</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Runs" value={batting?.total_runs} highlight />
          <StatCard label="Average" value={batting?.batting_average} />
          <StatCard label="Strike Rate" value={batting?.strike_rate} />
          <StatCard label="Highest" value={batting?.highest_score} />
          <StatCard label="50s / 100s" value={`${batting?.fifties ?? 0} / ${batting?.hundreds ?? 0}`} />
          <StatCard label="Innings" value={batting?.innings_played} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-white text-lg mb-4">Bowling</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Wickets" value={bowling?.total_wickets} highlight />
          <StatCard label="Economy" value={bowling?.economy_rate} />
          <StatCard label="Average" value={bowling?.bowling_average} />
          <StatCard label="Overs" value={bowling?.total_overs} />
          <StatCard label="Runs Given" value={bowling?.total_runs_given} />
          <StatCard label="Innings" value={bowling?.innings_bowled} />
        </div>
      </div>
    </div>
  );
}