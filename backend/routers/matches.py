"""
routers/matches.py
------------------
Endpoints:
  POST  /matches                  — create a match
  GET   /matches/{match_id}       — get match details
  PATCH /matches/{match_id}/status — update match status (upcoming→live→completed)
  GET   /matches/{match_id}/scorecard — full scorecard for a match
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from db import fetch_one, fetch_all, execute

router = APIRouter()


# -------------------------------------------------------
# Pydantic schemas
# -------------------------------------------------------
class CreateMatchRequest(BaseModel):
    team_a_id: int
    team_b_id: int
    league_id: Optional[int] = None     # None = standalone match
    max_overs: int
    venue: Optional[str] = None
    match_date: Optional[str] = None    # ISO string e.g. "2026-04-01T14:00:00"
    toss_winner_id: Optional[int] = None
    toss_decision: Optional[str] = None # "bat" or "bowl"

class UpdateStatusRequest(BaseModel):
    status: str     # "upcoming" | "live" | "completed" | "abandoned"


# -------------------------------------------------------
# POST / — Create a match
# -------------------------------------------------------
@router.post("/", status_code=201)
def create_match(body: CreateMatchRequest, current_user = Depends(get_current_user)):
    if body.team_a_id == body.team_b_id:
        raise HTTPException(status_code=400, detail="A team cannot play against itself")

    if body.toss_decision and body.toss_decision not in ("bat", "bowl"):
        raise HTTPException(status_code=400, detail="toss_decision must be 'bat' or 'bowl'")

    # Verify both teams exist
    team_a = fetch_one("SELECT id FROM teams WHERE id = %s", (body.team_a_id,))
    team_b = fetch_one("SELECT id FROM teams WHERE id = %s", (body.team_b_id,))
    if not team_a or not team_b:
        raise HTTPException(status_code=404, detail="One or both teams not found")

    # If league match, verify league exists and both teams are in it
    if body.league_id:
        league = fetch_one("SELECT id FROM leagues WHERE id = %s", (body.league_id,))
        if not league:
            raise HTTPException(status_code=404, detail="League not found")

        for team_id in (body.team_a_id, body.team_b_id):
            in_league = fetch_one(
                "SELECT id FROM league_teams WHERE league_id = %s AND team_id = %s",
                (body.league_id, team_id)
            )
            if not in_league:
                raise HTTPException(
                    status_code=400,
                    detail=f"Team {team_id} is not part of this league"
                )

    result = execute(
        """
        INSERT INTO matches
            (league_id, team_a_id, team_b_id, max_overs, venue,
             match_date, toss_winner_id, toss_decision)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, league_id, team_a_id, team_b_id, max_overs,
                  venue, match_date, toss_winner_id, toss_decision, status, created_at
        """,
        (body.league_id, body.team_a_id, body.team_b_id, body.max_overs,
         body.venue, body.match_date, body.toss_winner_id, body.toss_decision)
    )
    return result


# -------------------------------------------------------
# GET /{match_id} — Match details
# -------------------------------------------------------
@router.get("/{match_id}")
def get_match(match_id: int):
    match = fetch_one(
        """
        SELECT
            m.id, m.status, m.venue, m.match_date, m.max_overs,
            m.toss_decision, m.created_at,
            ta.id   AS team_a_id,   ta.name AS team_a_name,   ta.logo_url AS team_a_logo,
            tb.id   AS team_b_id,   tb.name AS team_b_name,   tb.logo_url AS team_b_logo,
            tw.id   AS toss_winner_id, tw.name AS toss_winner_name,
            w.id    AS winner_id,   w.name  AS winner_name,
            l.id    AS league_id,   l.name  AS league_name
        FROM matches m
        JOIN teams ta ON ta.id = m.team_a_id
        JOIN teams tb ON tb.id = m.team_b_id
        LEFT JOIN teams tw ON tw.id = m.toss_winner_id
        LEFT JOIN teams w  ON w.id  = m.winner_id
        LEFT JOIN leagues l ON l.id = m.league_id
        WHERE m.id = %s
        """,
        (match_id,)
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Get per-team result summary if match is completed
    results = fetch_all(
        """
        SELECT team_id, runs, wickets, overs_played
        FROM match_results
        WHERE match_id = %s
        """,
        (match_id,)
    )

    return {
        "id": match["id"],
        "status": match["status"],
        "venue": match["venue"],
        "match_date": match["match_date"],
        "max_overs": match["max_overs"],
        "toss_decision": match["toss_decision"],
        "league": {"id": match["league_id"], "name": match["league_name"]} if match["league_id"] else None,
        "team_a": {"id": match["team_a_id"], "name": match["team_a_name"], "logo_url": match["team_a_logo"]},
        "team_b": {"id": match["team_b_id"], "name": match["team_b_name"], "logo_url": match["team_b_logo"]},
        "toss_winner": {"id": match["toss_winner_id"], "name": match["toss_winner_name"]} if match["toss_winner_id"] else None,
        "winner": {"id": match["winner_id"], "name": match["winner_name"]} if match["winner_id"] else None,
        "results": results
    }


# -------------------------------------------------------
# PATCH /{match_id}/status — Update match status
# -------------------------------------------------------
@router.patch("/{match_id}/status")
def update_match_status(
    match_id: int,
    body: UpdateStatusRequest,
    current_user = Depends(get_current_user)
):
    valid_statuses = ("upcoming", "live", "completed", "abandoned")
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"status must be one of {valid_statuses}")

    match = fetch_one("SELECT id FROM matches WHERE id = %s", (match_id,))
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    result = execute(
        "UPDATE matches SET status = %s WHERE id = %s RETURNING id, status",
        (body.status, match_id)
    )
    return result


# -------------------------------------------------------
# GET /{match_id}/scorecard — Full scorecard
# -------------------------------------------------------
@router.get("/{match_id}/scorecard")
def get_scorecard(match_id: int):
    match = fetch_one(
        """
        SELECT m.id, m.status, m.max_overs,
               ta.name AS team_a_name, tb.name AS team_b_name,
               w.name  AS winner_name
        FROM matches m
        JOIN teams ta ON ta.id = m.team_a_id
        JOIN teams tb ON tb.id = m.team_b_id
        LEFT JOIN teams w ON w.id = m.winner_id
        WHERE m.id = %s
        """,
        (match_id,)
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    innings_list = fetch_all(
        """
        SELECT i.id, i.innings_number, i.total_runs, i.total_wickets,
               i.total_overs, i.extras, i.is_completed,
               bt.name AS batting_team_name,
               bw.name AS bowling_team_name
        FROM innings i
        JOIN teams bt ON bt.id = i.batting_team_id
        JOIN teams bw ON bw.id = i.bowling_team_id
        WHERE i.match_id = %s
        ORDER BY i.innings_number ASC
        """,
        (match_id,)
    )

    full_scorecard = []
    for inn in innings_list:
        batting = fetch_all(
            """
            SELECT
                bs.batting_order, bs.runs_scored, bs.balls_faced,
                bs.fours, bs.sixes, bs.is_out,
                u.name AS player_name,
                w.dismissal_type,
                bowler.name     AS bowler_name,
                responsible.name AS responsible_player_name
            FROM batting_scorecards bs
            JOIN users u ON u.id = bs.player_id
            LEFT JOIN wickets w ON w.batting_scorecard_id = bs.id
            LEFT JOIN users bowler      ON bowler.id = w.bowler_id
            LEFT JOIN users responsible ON responsible.id = w.responsible_player_id
            WHERE bs.innings_id = %s
            ORDER BY bs.batting_order ASC
            """,
            (inn["id"],)
        )

        bowling = fetch_all(
            """
            SELECT
                u.name AS player_name,
                bw.overs_bowled, bw.runs_given, bw.wickets_taken,
                bw.wides, bw.no_balls, bw.boundaries_conceded
            FROM bowling_scorecards bw
            JOIN users u ON u.id = bw.player_id
            WHERE bw.innings_id = %s
            ORDER BY bw.wickets_taken DESC, bw.runs_given ASC
            """,
            (inn["id"],)
        )

        full_scorecard.append({
            "innings_number": inn["innings_number"],
            "batting_team": inn["batting_team_name"],
            "bowling_team": inn["bowling_team_name"],
            "total": f"{inn['total_runs']}/{inn['total_wickets']} ({inn['total_overs']} ov)",
            "extras": inn["extras"],
            "is_completed": inn["is_completed"],
            "batting": batting,
            "bowling": bowling
        })

    return {
        "match_id": match["id"],
        "status": match["status"],
        "team_a": match["team_a_name"],
        "team_b": match["team_b_name"],
        "winner": match["winner_name"],
        "innings": full_scorecard
    }