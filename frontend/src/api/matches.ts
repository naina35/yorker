import api from './axios';
import type { Match, Scorecard } from '../types';

export const matchesApi = {
  create: async (body: {
    team_a_id: number;
    team_b_id: number;
    max_overs: number;
    league_id?: number;
    venue?: string;
    match_date?: string;
    toss_winner_id?: number;
    toss_decision?: 'bat' | 'bowl';
  }) => {
    const { data } = await api.post('/matches/', body);
    return data;
  },

  getById: async (id: number): Promise<Match> => {
    const { data } = await api.get(`/matches/${id}`);
    return data;
  },

  updateStatus: async (id: number, status: string) => {
    const { data } = await api.patch(`/matches/${id}/status`, { status });
    return data;
  },

  scorecard: async (id: number): Promise<Scorecard> => {
    const { data } = await api.get(`/matches/${id}/scorecard`);
    return data;
  },

  // Innings
  createInnings: async (body: {
    match_id: number;
    batting_team_id: number;
    bowling_team_id: number;
    innings_number: number;
  }) => {
    const { data } = await api.post('/innings/', body);
    return data;
  },

  addBatting: async (inningsId: number, body: {
    player_id: number;
    runs_scored?: number;
    balls_faced?: number;
    fours?: number;
    sixes?: number;
    is_out?: boolean;
    batting_order: number;
  }) => {
    const { data } = await api.post(`/innings/${inningsId}/batting`, body);
    return data;
  },

  addBowling: async (inningsId: number, body: {
    player_id: number;
    overs_bowled?: number;
    runs_given?: number;
    wickets_taken?: number;
    wides?: number;
    no_balls?: number;
    boundaries_conceded?: number;
  }) => {
    const { data } = await api.post(`/innings/${inningsId}/bowling`, body);
    return data;
  },

  addWicket: async (inningsId: number, body: {
    batsman_id: number;
    bowler_id?: number;
    dismissal_type: string;
    responsible_player_id?: number;
    fall_of_wicket_runs?: number;
  }) => {
    const { data } = await api.post(`/innings/${inningsId}/wickets`, body);
    return data;
  },

  completeInnings: async (inningsId: number) => {
    const { data } = await api.patch(`/innings/${inningsId}/complete`);
    return data;
  },

  setResult: async (matchId: number, body: {
    winner_id?: number;
    team_a_runs: number;
    team_a_wickets: number;
    team_a_overs: number;
    team_b_runs: number;
    team_b_wickets: number;
    team_b_overs: number;
  }) => {
    const { data } = await api.put(`/innings/matches/${matchId}/result`, body);
    return data;
  },
};