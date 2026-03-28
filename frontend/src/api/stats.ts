import api from './axios';
import type { PlayerStats, TopBatsman, TopBowler } from '../types';

export const statsApi = {
  playerStats: async (playerId: number): Promise<PlayerStats> => {
    const { data } = await api.get(`/stats/players/${playerId}`);
    return data;
  },

  topBatsmen: async (leagueId: number, limit = 10): Promise<TopBatsman[]> => {
    const { data } = await api.get(`/stats/leagues/${leagueId}/top-batsmen`, {
      params: { limit },
    });
    return data;
  },

  topBowlers: async (leagueId: number, limit = 10): Promise<TopBowler[]> => {
    const { data } = await api.get(`/stats/leagues/${leagueId}/top-bowlers`, {
      params: { limit },
    });
    return data;
  },

  matchTopPerformers: async (matchId: number) => {
    const { data } = await api.get(`/stats/matches/${matchId}/top-performers`);
    return data;
  },
};