import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api/teams';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import JoinRequests from '../components/JoinRequests';

export default function MyTeam() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [teamId, setTeamId] = useState<number | null>(null);
  const [joinId, setJoinId] = useState('');
  const [createName, setCreateName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsApi.getById(teamId!),
    enabled: !!teamId,
  });

  const { data: joinReqs = [] } = useQuery({
    queryKey: ['teamJoinReqs', teamId],
    queryFn: () => teamsApi.getJoinRequests(teamId!),
    enabled: !!teamId && team?.captain.id === user?.id,
  });

  const create = useMutation({
    mutationFn: () => teamsApi.create(createName),
    onSuccess: (data) => { setTeamId(data.id); setShowCreate(false); qc.invalidateQueries({ queryKey: ['team'] }); },
  });

  const join = useMutation({
    mutationFn: () => teamsApi.sendJoinRequest(Number(joinId)),
    onSuccess: () => { setJoinId(''); },
  });

  if (!user) return (
    <div className="flex items-center justify-center h-64 px-4">
      <div className="text-center">
        <p className="text-blue-300/60 mb-4">Sign in to manage your team</p>
        <Link to="/login" className="px-5 py-2.5 rounded-xl bg-[var(--blue-400)] text-white font-medium">Sign in</Link>
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl text-white mb-6">My Team</h1>

      {!teamId && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-display text-white mb-3">Look up a team</h2>
            <div className="flex gap-2">
              <input type="number" placeholder="Team ID" value={teamId ?? ''} onChange={e => setTeamId(Number(e.target.value))}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/30 focus:outline-none focus:border-[var(--blue-400)]/60 text-sm" />
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-display text-white mb-3">Request to join a team</h2>
            <div className="flex gap-2">
              <input type="number" placeholder="Team ID" value={joinId} onChange={e => setJoinId(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/30 focus:outline-none focus:border-[var(--blue-400)]/60 text-sm" />
              <button onClick={() => join.mutate()} disabled={!joinId || join.isPending}
                className="px-4 py-2.5 rounded-xl bg-[var(--blue-400)] text-white text-sm font-medium disabled:opacity-50">
                Request
              </button>
            </div>
            {join.isSuccess && <p className="text-green-400 text-xs mt-2">Request sent!</p>}
          </div>
          <button onClick={() => setShowCreate(v => !v)} className="w-full py-3 rounded-xl border border-[var(--blue-400)]/40 text-[var(--blue-400)] font-medium hover:bg-[var(--blue-400)]/10 transition-all">
            + Create a team
          </button>
          {showCreate && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <input placeholder="Team name" value={createName} onChange={e => setCreateName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/30 focus:outline-none focus:border-[var(--blue-400)]/60 text-sm" />
              <button onClick={() => create.mutate()} disabled={!createName || create.isPending}
                className="w-full py-2.5 rounded-xl bg-[var(--blue-400)] text-white text-sm font-medium disabled:opacity-50">
                {create.isPending ? 'Creating…' : 'Create Team'}
              </button>
            </div>
          )}
        </div>
      )}

      {teamId && isLoading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--blue-400)] border-t-transparent rounded-full animate-spin" /></div>}

      {team && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[var(--blue-800)] to-[var(--blue-900)] border border-white/10 rounded-2xl p-6">
            <h2 className="font-display text-2xl text-white">{team.name}</h2>
            <p className="text-blue-300/60 text-sm mt-1">Captain: {team.captain.name}</p>
          </div>
          <div>
            <h3 className="font-display text-white text-lg mb-3">Squad ({team.players.length})</h3>
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
          {team.captain.id === user.id && joinReqs.length > 0 && (
            <div>
              <h3 className="font-display text-white text-lg mb-3">Join Requests</h3>
              <JoinRequests
                requests={joinReqs} type="team" entityId={teamId}
                onHandle={(rid, status) => teamsApi.handleJoinRequest(teamId, rid, status)}
                queryKey={['teamJoinReqs', teamId]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}