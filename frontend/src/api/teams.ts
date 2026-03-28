import api from './axios';
import type { TeamDetail } from '../types';

export const teamsApi = {
  create: async (name: string, logo_url?: string) => {
    const { data } = await api.post('/teams/', { name, logo_url });
    return data;
  },

  getById: async (id: number): Promise<TeamDetail> => {
    const { data } = await api.get(`/teams/${id}`);
    return data;
  },

  edit: async (id: number, fields: { name?: string; logo_url?: string }) => {
    const { data } = await api.put(`/teams/${id}`, fields);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await api.delete(`/teams/${id}`);
    return data;
  },

  sendJoinRequest: async (teamId: number) => {
    const { data } = await api.post(`/teams/${teamId}/join-request`);
    return data;
  },

  getJoinRequests: async (teamId: number) => {
    const { data } = await api.get(`/teams/${teamId}/join-requests`);
    return data;
  },

  handleJoinRequest: async (teamId: number, requestId: number, status: 'accepted' | 'denied') => {
    const { data } = await api.patch(`/teams/${teamId}/join-requests/${requestId}`, { status });
    return data;
  },

  leave: async (teamId: number) => {
    const { data } = await api.delete(`/teams/${teamId}/leave`);
    return data;
  },
};