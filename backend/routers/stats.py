"""
routers/stats.py
----------------
Endpoints:
  GET /stats/players/{player_id}        — career stats for a player
  GET /stats/leagues/{league_id}/top-batsmen  — top run scorers in a league
  GET /stats/leagues/{league_id}/top-bowlers  — top wicket takers in a league
  GET /stats/matches/{match_id}/top-performers — best bat + bowl in a match
"""

from fastapi import APIRouter, HTTPException
from db import fetch_one, fetch_all

router = APIRouter()


# -------------------------------------------------------
# GET /players/{player_id} — Career stats
# -------------------------------------------------------
@router.get("/players/{player_id}")
def get_player_stats(player_id: int):
    player = fetch_one(
        "SELECT id, name, avatar_url FROM users WHERE id = %s",
        (player_id,)
    )
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    batting = fetch_one(
        """
        SELECT
            COUNT(*)                                                AS innings_played,
            COALESCE(SUM(runs_scored), 0)                          AS total_runs,
            COALESCE(MAX(runs_scored), 0)                          AS highest_score,
            COALESCE(SUM(balls_faced), 0)                          AS total_balls,
            COALESCE(SUM(fours), 0)                                AS total_fours,
            COALESCE(SUM(sixes), 0)                                AS total_sixes,
            COUNT(CASE WHEN is_out = FALSE THEN 1 END)             AS not_outs,
            -- Batting average = runs / (innings - not outs)
            CASE
                WHEN (COUNT(*) - COUNT(CASE WHEN is_out = FALSE THEN 1 END)) = 0 THEN NULL
                ELSE ROUND(
                    SUM(runs_scored)::numeric /
                    NULLIF(COUNT(*) - COUNT(CASE WHEN is_out = FALSE THEN 1 END), 0),
                    2
                )
            END                                                     AS batting_average,
            -- Strike rate = (runs / balls) * 100
            ROUND(
                SUM(runs_scored)::numeric / NULLIF(SUM(balls_faced), 0) * 100,
                2
            )                                                       AS strike_rate,
            COUNT(CASE WHEN runs_scored >= 50 AND runs_scored < 100 THEN 1 END) AS fifties,
            COUNT(CASE WHEN runs_scored >= 100 THEN 1 END)         AS hundreds
        FROM batting_scorecards
        WHERE player_id = %s
        """,
        (player_id,)
    )

    bowling = fetch_one(
        """
        SELECT
            COUNT(*)                                        AS innings_bowled,
            COALESCE(SUM(wickets_taken), 0)                AS total_wickets,
            COALESCE(SUM(runs_given), 0)                   AS total_runs_given,
            COALESCE(SUM(overs_bowled), 0)                 AS total_overs,
            COALESCE(SUM(wides), 0)                        AS total_wides,
            COALESCE(SUM(no_balls), 0)                     AS total_no_balls,
            -- Economy = runs given / overs bowled
            ROUND(
                SUM(runs_given)::numeric / NULLIF(SUM(overs_bowled), 0),
                2
            )                                               AS economy_rate,
            -- Bowling average = runs given / wickets taken
            ROUND(
                SUM(runs_given)::numeric / NULLIF(SUM(wickets_taken), 0),
                2
            )                                               AS bowling_average,
            -- Best bowling: most wickets, then fewest runs
            MAX(wickets_taken)                              AS best_wickets
        FROM bowling_scorecards
        WHERE player_id = %s
        """,
        (player_id,)
    )

    return {
        "player": {
            "id": player["id"],
            "name": player["name"],
            "avatar_url": player["avatar_url"]
        },
        "batting": batting,
        "bowling": bowling
    }


# -------------------------------------------------------
# GET /leagues/{league_id}/top-batsmen
# -------------------------------------------------------
@router.get("/leagues/{league_id}/top-batsmen")
def top_batsmen(league_id: int, limit: int = 10):
    league = fetch_one("SELECT id FROM leagues WHERE id = %s", (league_id,))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    results = fetch_all(
        """
        SELECT
            u.id            AS player_id,
            u.name          AS player_name,
            t.name          AS team_name,
            SUM(bs.runs_scored)                                         AS total_runs,
            MAX(bs.runs_scored)                                         AS highest_score,
            SUM(bs.balls_faced)                                         AS total_balls,
            SUM(bs.fours)                                               AS total_fours,
            SUM(bs.sixes)                                               AS total_sixes,
            ROUND(
                SUM(bs.runs_scored)::numeric / NULLIF(SUM(bs.balls_faced), 0) * 100,
                2
            )                                                           AS strike_rate,
            ROUND(
                SUM(bs.runs_scored)::numeric /
                NULLIF(COUNT(*) - COUNT(CASE WHEN bs.is_out = FALSE THEN 1 END), 0),
                2
            )                                                           AS batting_average
        FROM batting_scorecards bs
        JOIN innings i       ON i.id = bs.innings_id
        JOIN matches m       ON m.id = i.match_id
        JOIN users u         ON u.id = bs.player_id
        -- find which team this player belongs to in this league
        JOIN team_members tm ON tm.player_id = u.id
        JOIN league_teams lt ON lt.team_id = tm.team_id AND lt.league_id = m.league_id
        JOIN teams t         ON t.id = tm.team_id
        WHERE m.league_id = %s AND m.status = 'completed'
        GROUP BY u.id, u.name, t.name
        ORDER BY total_runs DESC
        LIMIT %s
        """,
        (league_id, limit)
    )
    return results


# -------------------------------------------------------
# GET /leagues/{league_id}/top-bowlers
# -------------------------------------------------------
@router.get("/leagues/{league_id}/top-bowlers")
def top_bowlers(league_id: int, limit: int = 10):
    league = fetch_one("SELECT id FROM leagues WHERE id = %s", (league_id,))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    results = fetch_all(
        """
        SELECT
            u.id            AS player_id,
            u.name          AS player_name,
            t.name          AS team_name,
            SUM(bw.wickets_taken)                                       AS total_wickets,
            SUM(bw.runs_given)                                          AS total_runs_given,
            SUM(bw.overs_bowled)                                        AS total_overs,
            SUM(bw.wides)                                               AS total_wides,
            SUM(bw.no_balls)                                            AS total_no_balls,
            ROUND(
                SUM(bw.runs_given)::numeric / NULLIF(SUM(bw.overs_bowled), 0),
                2
            )                                                           AS economy_rate,
            ROUND(
                SUM(bw.runs_given)::numeric / NULLIF(SUM(bw.wickets_taken), 0),
                2
            )                                                           AS bowling_average
        FROM bowling_scorecards bw
        JOIN innings i       ON i.id = bw.innings_id
        JOIN matches m       ON m.id = i.match_id
        JOIN users u         ON u.id = bw.player_id
        JOIN team_members tm ON tm.player_id = u.id
        JOIN league_teams lt ON lt.team_id = tm.team_id AND lt.league_id = m.league_id
        JOIN teams t         ON t.id = tm.team_id
        WHERE m.league_id = %s AND m.status = 'completed'
        GROUP BY u.id, u.name, t.name
        ORDER BY total_wickets DESC, economy_rate ASC
        LIMIT %s
        """,
        (league_id, limit)
    )
    return results


# -------------------------------------------------------
# GET /matches/{match_id}/top-performers
# -------------------------------------------------------
@router.get("/matches/{match_id}/top-performers")
def match_top_performers(match_id: int):
    match = fetch_one("SELECT id FROM matches WHERE id = %s", (match_id,))
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    top_bat = fetch_one(
        """
        SELECT u.name AS player_name, t.name AS team_name,
               bs.runs_scored, bs.balls_faced, bs.fours, bs.sixes
        FROM batting_scorecards bs
        JOIN innings i  ON i.id = bs.innings_id
        JOIN users u    ON u.id = bs.player_id
        JOIN team_members tm ON tm.player_id = u.id AND tm.team_id = i.batting_team_id
        JOIN teams t    ON t.id = i.batting_team_id
        WHERE i.match_id = %s
        ORDER BY bs.runs_scored DESC
        LIMIT 1
        """,
        (match_id,)
    )

    top_bowl = fetch_one(
        """
        SELECT u.name AS player_name, t.name AS team_name,
               bw.wickets_taken, bw.runs_given, bw.overs_bowled
        FROM bowling_scorecards bw
        JOIN innings i  ON i.id = bw.innings_id
        JOIN users u    ON u.id = bw.player_id
        JOIN team_members tm ON tm.player_id = u.id AND tm.team_id = i.bowling_team_id
        JOIN teams t    ON t.id = i.bowling_team_id
        WHERE i.match_id = %s
        ORDER BY bw.wickets_taken DESC, bw.runs_given ASC
        LIMIT 1
        """,
        (match_id,)
    )

    return {
        "top_batsman": top_bat,
        "top_bowler": top_bowl
    }