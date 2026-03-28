import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JoinRequest } from '../types';

interface Props {
  requests: JoinRequest[];
  type: 'team' | 'league';
  entityId: number;
  onHandle: (requestId: number, status: 'accepted' | 'denied') => Promise<void>;
  queryKey: string[];
}

export default function JoinRequests({ requests, onHandle, queryKey }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: number; status: 'accepted' | 'denied' }) =>
      onHandle(requestId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (requests.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-blue-300/40 text-sm">No pending join requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const person = req.player || req.team;
        const name = req.player?.name || req.team?.name || 'Unknown';

        return (
          <div
            key={req.request_id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--blue-400)] to-[var(--blue-800)] flex items-center justify-center text-white text-sm font-display flex-shrink-0">
                {name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{name}</p>
                {req.captain && (
                  <p className="text-blue-300/50 text-xs">Cap: {req.captain.name}</p>
                )}
                <p className="text-blue-300/30 text-xs">{new Date(req.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => mutation.mutate({ requestId: req.request_id, status: 'accepted' })}
                disabled={mutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => mutation.mutate({ requestId: req.request_id, status: 'denied' })}
                disabled={mutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                Deny
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}