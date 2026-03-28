import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaguesApi } from '../api/leagues';
import LeagueCard from '../components/LeagueCard';
import { useAuth } from '../hooks/useAuth';

export default function Leagues() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', format: '', max_overs: '', location_name: '' });

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: leaguesApi.list,
  });

  const create = useMutation({
    mutationFn: () => leaguesApi.create({
      name: form.name,
      description: form.description || undefined,
      format: (form.format as any) || undefined,
      max_overs: form.max_overs ? parseInt(form.max_overs) : undefined,
      location_name: form.location_name || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leagues'] }); setShowCreate(false); },
  });

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-white">Leagues</h1>
        {user && (
          <button onClick={() => setShowCreate(true)} className="text-xs px-4 py-2 rounded-full bg-[var(--blue-400)] text-white hover:bg-[var(--blue-600)] transition-all">
            + Create
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="font-display text-white">New League</h2>
          {[
            { key: 'name', placeholder: 'League name', required: true },
            { key: 'description', placeholder: 'Description (optional)' },
            { key: 'location_name', placeholder: 'Location (optional)' },
            { key: 'max_overs', placeholder: 'Max overs (optional)', type: 'number' },
          ].map(f => (
            <input
              key={f.key} placeholder={f.placeholder} type={f.type || 'text'}
              value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/30 focus:outline-none focus:border-[var(--blue-400)]/60 text-sm"
            />
          ))}
          <select value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value }))}
            className="w-full bg-[#042C53] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[var(--blue-400)]/60 text-sm">
            <option value="">Format (optional)</option>
            {['T20','ODI','Test','Custom'].map(f => <option key={f}>{f}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={!form.name || create.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[var(--blue-400)] text-white text-sm font-medium hover:bg-[var(--blue-600)] transition-all disabled:opacity-50">
              {create.isPending ? 'Creating…' : 'Create League'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-blue-300/60 text-sm hover:bg-white/5 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : leagues.length === 0 ? (
        <p className="text-center text-blue-300/40 py-16">No leagues yet. Be the first to create one!</p>
      ) : (
        <div className="space-y-3">{leagues.map(l => <LeagueCard key={l.id} league={l} />)}</div>
      )}
    </div>
  );
}