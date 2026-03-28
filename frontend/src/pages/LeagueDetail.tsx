import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaguesApi } from '../api/leagues';
import { statsApi } from '../api/stats';
import Standings from '../components/Standings';
import JoinRequests from '../components/JoinRequests';
import { useAuth } from '../hooks/useAuth';
import { teamsApi } from '../api/teams';
import { useState } from 'react';

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>();
  const leagueId = Number(id);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [teamIdInput, setTeamIdInput] = useState('');
  const [tab, setTab] = useState<'overview' | 'stats' | 'requests'>('overview');

  const { data: league, isLoading } = useQuery({ queryKey: ['league', leagueId], queryFn: () => leaguesApi.getById(leagueId) });
  const { data: standings = [] } = useQuery({ queryKey: ['standings', leagueId], queryFn: () => leaguesApi.standings(leagueId) });
  const { data: topBat = [] } = useQuery({ queryKey: ['topBat', leagueId], queryFn: () => statsApi.topBatsmen(leagueId), enabled: tab === 'stats' });
  const { data: topBowl = [] } = useQuery({ queryKey: ['topBowl', leagueId], queryFn: () => statsApi.topBowlers(leagueId), enabled: tab === 'stats' });
  const { data: joinReqs = [] } = useQuery({ queryKey: ['leagueJoinReqs', leagueId], queryFn: () => leaguesApi.getJoinRequests(leagueId), enabled: tab === 'requests' && league?.creator?.id === user?.id });

  const joinReq = useMutation({
    mutationFn: () => leaguesApi.sendJoinRequest(leagueId, Number(teamIdInput)),
    onSuccess: () => setTeamIdInput(''),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--blue-400)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!league) return <p className="text-center text-red-400 py-16">League not found</p>;

  const isCreator = league.creator?.id === user?.id;

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-[var(--blue-800)] to-[var(--blue-900)] border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-white">{league.name}</h1>
            {league.description && <p className="text-blue-300/60 text-sm mt-1">{league.description}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {league.format && <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-blue-300">{league.format}</span>}
              {league.location_name && <span className="text-xs text-blue-300/50">📍 {league.location_name}</span>}
            </div>
          </div>
          <span className="text-4xl">🏆</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
        {(['overview', 'stats', ...(isCreator ? ['requests'] : [])] as const).map(t => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-[var(--blue-400)] text-white' : 'text-blue-300/60 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <Standings standings={standings} />
          {/* Teams */}
          {league.teams && league.teams.length > 0 && (
            <div>
              <h2 className="font-display text-white text-lg mb-3">Teams</h2>
              <div className="space-y-2">
                {league.teams.map(t => (
                  <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white text-sm font-display">
                      {t.name.charAt(0)}
                    </div>
                    <span className="text-white font-medium">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Join request form */}
          {user && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="font-display text-white mb-3">Request to Join</h3>
              <div className="flex gap-2">
                <input
                  type="number" placeholder="Your Team ID" value={teamIdInput}
                  onChange={e => setTeamIdInput(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/30 focus:outline-none focus:border-[var(--blue-400)]/60 text-sm"
                />
                <button onClick={() => joinReq.mutate()} disabled={!teamIdInput || joinReq.isPending}
                  className="px-4 py-2.5 rounded-xl bg-[var(--blue-400)] text-white text-sm font-medium hover:bg-[var(--blue-600)] transition-all disabled:opacity-50">
                  {joinReq.isPending ? '…' : 'Request'}
                </button>
              </div>
              {joinReq.isError && <p className="text-red-400 text-xs mt-2">{(joinReq.error as any)?.response?.data?.detail}</p>}
              {joinReq.isSuccess && <p className="text-green-400 text-xs mt-2">Request sent!</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-white text-lg mb-3">Top Batsmen</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="text-blue-300/40 text-xs border-b border-white/5">
                  <th className="text-left px-5 py-3">Player</th>
                  <th className="px-3 py-3 text-right">Runs</th>
                  <th className="px-3 py-3 text-right">HS</th>
                  <th className="px-3 py-3 text-right">Avg</th>
                  <th className="px-3 py-3 text-right">SR</th>
                </tr></thead>
                <tbody>{topBat.map((b, i) => (
                  <tr key={b.player_id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-5 py-3"><p className="text-white font-medium">{b.player_name}</p><p className="text-blue-300/40 text-xs">{b.team_name}</p></td>
                    <td className="px-3 py-3 text-right font-display text-[var(--blue-400)]">{b.total_runs}</td>
                    <td className="px-3 py-3 text-right text-blue-300/60">{b.highest_score}</td>
                    <td className="px-3 py-3 text-right text-blue-300/60">{b.batting_average ?? '—'}</td>
                    <td className="px-3 py-3 text-right text-blue-300/60">{b.strike_rate ?? '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
              {topBat.length === 0 && <p className="text-center text-blue-300/40 py-6 text-sm">No data yet</p>}
            </div>
          </div>
          <div>
            <h2 className="font-display text-white text-lg mb-3">Top Bowlers</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="text-blue-300/40 text-xs border-b border-white/5">
                  <th className="text-left px-5 py-3">Player</th>
                  <th className="px-3 py-3 text-right">Wkts</th>
                  <th className="px-3 py-3 text-right">Runs</th>
                  <th className="px-3 py-3 text-right">Avg</th>
                  <th className="px-3 py-3 text-right">Eco</th>
                </tr></thead>
                <tbody>{topBowl.map((b) => (
                  <tr key={b.player_id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-5 py-3"><p className="text-white font-medium">{b.player_name}</p><p className="text-blue-300/40 text-xs">{b.team_name}</p></td>
                    <td className="px-3 py-3 text-right font-display text-[var(--blue-400)]">{b.total_wickets}</td>
                    <td className="px-3 py-3 text-right text-blue-300/60">{b.total_runs_given}</td>
                    <td className="px-3 py-3 text-right text-blue-300/60">{b.bowling_average ?? '—'}</td>
                    <td className="px-3 py-3 text-right text-blue-300/60">{b.economy_rate ?? '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
              {topBowl.length === 0 && <p className="text-center text-blue-300/40 py-6 text-sm">No data yet</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'requests' && isCreator && (
        <div>
          <h2 className="font-display text-white text-lg mb-3">Join Requests</h2>
          <JoinRequests
            requests={joinReqs} type="league" entityId={leagueId}
            onHandle={(rid, status) => leaguesApi.handleJoinRequest(leagueId, rid, status)}
            queryKey={['leagueJoinReqs', leagueId]}
          />
        </div>
      )}
    </div>
  );
}