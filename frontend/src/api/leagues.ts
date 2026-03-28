import api from './axios';
import type { League, Standing } from '../types';

export const leaguesApi = {
  create: async (body: {
    name: string;
    description?: string;
    format?: string;
    max_overs?: number;
    location_name?: string;
    lat?: number;
    lng?: number;
  }) => {
    const { data } = await api.post('/leagues/', body);
    return data;
  },

  list: async (): Promise<League[]> => {
    const { data } = await api.get('/leagues/');
    return data;
  },

  nearby: async (lat: number, lng: number, km = 20): Promise<League[]> => {
    const { data } = await api.get('/leagues/nearby', { params: { lat, lng, km } });
    return data;
  },

  getById: async (id: number): Promise<League> => {
    const { data } = await api.get(`/leagues/${id}`);
    return data;
  },

  edit: async (id: number, body: Partial<League>) => {
    const { data } = await api.put(`/leagues/${id}`, body);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await api.delete(`/leagues/${id}`);
    return data;
  },

  sendJoinRequest: async (leagueId: number, teamId: number) => {
    const { data } = await api.post(`/leagues/${leagueId}/join-request`, null, {
      params: { team_id: teamId },
    });
    return data;
  },

  getJoinRequests: async (leagueId: number) => {
    const { data } = await api.get(`/leagues/${leagueId}/join-requests`);
    return data;
  },

  handleJoinRequest: async (leagueId: number, requestId: number, status: 'accepted' | 'denied') => {
    const { data } = await api.patch(`/leagues/${leagueId}/join-requests/${requestId}`, { status });
    return data;
  },

  standings: async (leagueId: number): Promise<Standing[]> => {
    const { data } = await api.get(`/leagues/${leagueId}/standings`);
    return data;
  },
};