// ── Auth ──────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  lat?: number;
  lng?: number;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  name: string;
}

// ── Teams ─────────────────────────────────────────────
export interface Team {
  id: number;
  name: string;
  logo_url?: string;
  captain_id?: number;
  created_at?: string;
}

export interface TeamDetail {
  id: number;
  name: string;
  logo_url?: string;
  captain: { id: number; name: string };
  players: Player[];
}

export interface Player {
  id: number;
  name: string;
  avatar_url?: string;
}

export interface JoinRequest {
  request_id: number;
  status: string;
  created_at: string;
  player?: { id: number; name: string; avatar_url?: string };
  team?: { id: number; name: string; logo_url?: string };
  captain?: { id: number; name: string };
}

// ── Leagues ───────────────────────────────────────────
export interface League {
  id: number;
  name: string;
  description?: string;
  format?: 'T20' | 'ODI' | 'Test' | 'Custom';
  max_overs?: number;
  location_name?: string;
  lat?: number;
  lng?: number;
  is_active: boolean;
  created_at: string;
  creator_id?: number;
  creator_name?: string;
  creator?: { id: number; name: string };
  teams?: Team[];
  distance_km?: number;
}

export interface Standing {
  team_id: number;
  team_name: string;
  logo_url?: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
}

// ── Matches ───────────────────────────────────────────
export interface Match {
  id: number;
  status: 'upcoming' | 'live' | 'completed' | 'abandoned';
  venue?: string;
  match_date?: string;
  max_overs: number;
  toss_decision?: 'bat' | 'bowl';
  created_at?: string;
  league?: { id: number; name: string } | null;
  team_a: { id: number; name: string; logo_url?: string };
  team_b: { id: number; name: string; logo_url?: string };
  toss_winner?: { id: number; name: string } | null;
  winner?: { id: number; name: string } | null;
  results?: MatchResult[];
}

export interface MatchResult {
  team_id: number;
  runs: number;
  wickets: number;
  overs_played: number;
}

// ── Innings & Scorecard ───────────────────────────────
export interface BattingEntry {
  batting_order: number;
  player_name: string;
  runs_scored: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  dismissal_type?: string;
  bowler_name?: string;
  responsible_player_name?: string;
}

export interface BowlingEntry {
  player_name: string;
  overs_bowled: number;
  runs_given: number;
  wickets_taken: number;
  wides: number;
  no_balls: number;
  boundaries_conceded: number;
}

export interface InningsScorecard {
  innings_number: number;
  batting_team: string;
  bowling_team: string;
  total: string;
  extras: number;
  is_completed: boolean;
  batting: BattingEntry[];
  bowling: BowlingEntry[];
}

export interface Scorecard {
  match_id: number;
  status: string;
  team_a: string;
  team_b: string;
  winner?: string;
  innings: InningsScorecard[];
}

// ── Stats ─────────────────────────────────────────────
export interface BattingStats {
  innings_played: number;
  total_runs: number;
  highest_score: number;
  total_balls: number;
  total_fours: number;
  total_sixes: number;
  not_outs: number;
  batting_average?: number;
  strike_rate?: number;
  fifties: number;
  hundreds: number;
}

export interface BowlingStats {
  innings_bowled: number;
  total_wickets: number;
  total_runs_given: number;
  total_overs: number;
  total_wides: number;
  total_no_balls: number;
  economy_rate?: number;
  bowling_average?: number;
  best_wickets: number;
}

export interface PlayerStats {
  player: Player;
  batting: BattingStats;
  bowling: BowlingStats;
}

export interface TopBatsman {
  player_id: number;
  player_name: string;
  team_name: string;
  total_runs: number;
  highest_score: number;
  total_balls: number;
  strike_rate?: number;
  batting_average?: number;
}

export interface TopBowler {
  player_id: number;
  player_name: string;
  team_name: string;
  total_wickets: number;
  total_runs_given: number;
  total_overs: number;
  economy_rate?: number;
  bowling_average?: number;
}