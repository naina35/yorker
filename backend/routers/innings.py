"""
routers/innings.py
------------------
Endpoints:
  POST  /innings                          — start an innings for a match
  POST  /innings/{innings_id}/batting     — add/update a batting entry
  POST  /innings/{innings_id}/bowling     — add/update a bowling entry
  POST  /innings/{innings_id}/wickets     — record a wicket
  PATCH /innings/{innings_id}/complete    — mark innings as completed
  PUT   /matches/{match_id}/result        — set final match result + winner
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from db import fetch_one, fetch_all, execute, get_db

router = APIRouter()


# -------------------------------------------------------
# Pydantic schemas
# -------------------------------------------------------
class CreateInningsRequest(BaseModel):
    match_id: int
    batting_team_id: int
    bowling_team_id: int
    innings_number: int     # 1 or 2

class BattingEntry(BaseModel):
    player_id: int
    runs_scored: int = 0
    balls_faced: int = 0
    fours: int = 0
    sixes: int = 0
    is_out: bool = False
    batting_order: int

class BowlingEntry(BaseModel):
    player_id: int
    overs_bowled: float = 0.0
    runs_given: int = 0
    wickets_taken: int = 0
    wides: int = 0
    no_balls: int = 0
    boundaries_conceded: int = 0

class WicketEntry(BaseModel):
    batsman_id: int
    bowler_id: Optional[int] = None         # nullable for run outs
    dismissal_type: str
    responsible_player_id: Optional[int] = None
    fall_of_wicket_runs: int = 0

class MatchResultRequest(BaseModel):
    winner_id: Optional[int] = None         # None = tie
    team_a_runs: int
    team_a_wickets: int
    team_a_overs: float
    team_b_runs: int
    team_b_wickets: int
    team_b_overs: float


VALID_DISMISSALS = (
    "Bowled", "Caught", "Caught Behind", "Run Out",
    "LBW", "Stumped", "Hit Wicket",
    "Handled Ball", "Obstructing Field", "Timed Out"
)


# -------------------------------------------------------
# POST / — Start a new innings
# -------------------------------------------------------
@router.post("/", status_code=201)
def create_innings(body: CreateInningsRequest, current_user = Depends(get_current_user)):
    if body.innings_number not in (1, 2):
        raise HTTPException(status_code=400, detail="innings_number must be 1 or 2")

    if body.batting_team_id == body.bowling_team_id:
        raise HTTPException(status_code=400, detail="Batting and bowling team cannot be the same")

    # Check match exists and is live
    match = fetch_one("SELECT id, status FROM matches WHERE id = %s", (body.match_id,))
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["status"] not in ("upcoming", "live"):
        raise HTTPException(status_code=400, detail="Cannot add innings to a completed or abandoned match")

    # Check innings number not already used
    existing = fetch_one(
        "SELECT id FROM innings WHERE match_id = %s AND innings_number = %s",
        (body.match_id, body.innings_number)
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Innings {body.innings_number} already exists for this match")

    result = execute(
        """
        INSERT INTO innings (match_id, batting_team_id, bowling_team_id, innings_number)
        VALUES (%s, %s, %s, %s)
        RETURNING id, match_id, batting_team_id, bowling_team_id, innings_number,
                  total_runs, total_wickets, total_overs, is_completed
        """,
        (body.match_id, body.batting_team_id, body.bowling_team_id, body.innings_number)
    )

    # Set match to live when first innings starts
    execute("UPDATE matches SET status = 'live' WHERE id = %s AND status = 'upcoming'", (body.match_id,))

    return result


# -------------------------------------------------------
# POST /{innings_id}/batting — Add or update batting entry
# -------------------------------------------------------
@router.post("/{innings_id}/batting")
def add_batting(innings_id: int, body: BattingEntry, current_user = Depends(get_current_user)):
    innings = fetch_one("SELECT id FROM innings WHERE id = %s", (innings_id,))
    if not innings:
        raise HTTPException(status_code=404, detail="Innings not found")

    # Upsert — update if player already has an entry, insert if not
    existing = fetch_one(
        "SELECT id FROM batting_scorecards WHERE innings_id = %s AND player_id = %s",
        (innings_id, body.player_id)
    )

    if existing:
        result = execute(
            """
            UPDATE batting_scorecards
            SET runs_scored  = %s,
                balls_faced  = %s,
                fours        = %s,
                sixes        = %s,
                is_out       = %s,
                batting_order = %s
            WHERE innings_id = %s AND player_id = %s
            RETURNING id, player_id, runs_scored, balls_faced, fours, sixes, is_out
            """,
            (body.runs_scored, body.balls_faced, body.fours, body.sixes,
             body.is_out, body.batting_order, innings_id, body.player_id)
        )
    else:
        result = execute(
            """
            INSERT INTO batting_scorecards
                (innings_id, player_id, runs_scored, balls_faced, fours, sixes, is_out, batting_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, player_id, runs_scored, balls_faced, fours, sixes, is_out
            """,
            (innings_id, body.player_id, body.runs_scored, body.balls_faced,
             body.fours, body.sixes, body.is_out, body.batting_order)
        )

    # Recalculate innings totals
    _recalculate_innings_totals(innings_id)
    return result


# -------------------------------------------------------
# POST /{innings_id}/bowling — Add or update bowling entry
# -------------------------------------------------------
@router.post("/{innings_id}/bowling")
def add_bowling(innings_id: int, body: BowlingEntry, current_user = Depends(get_current_user)):
    innings = fetch_one("SELECT id FROM innings WHERE id = %s", (innings_id,))
    if not innings:
        raise HTTPException(status_code=404, detail="Innings not found")

    existing = fetch_one(
        "SELECT id FROM bowling_scorecards WHERE innings_id = %s AND player_id = %s",
        (innings_id, body.player_id)
    )

    if existing:
        result = execute(
            """
            UPDATE bowling_scorecards
            SET overs_bowled        = %s,
                runs_given          = %s,
                wickets_taken       = %s,
                wides               = %s,
                no_balls            = %s,
                boundaries_conceded = %s
            WHERE innings_id = %s AND player_id = %s
            RETURNING id, player_id, overs_bowled, runs_given, wickets_taken, wides, no_balls
            """,
            (body.overs_bowled, body.runs_given, body.wickets_taken,
             body.wides, body.no_balls, body.boundaries_conceded,
             innings_id, body.player_id)
        )
    else:
        result = execute(
            """
            INSERT INTO bowling_scorecards
                (innings_id, player_id, overs_bowled, runs_given, wickets_taken,
                 wides, no_balls, boundaries_conceded)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, player_id, overs_bowled, runs_given, wickets_taken, wides, no_balls
            """,
            (innings_id, body.player_id, body.overs_bowled, body.runs_given,
             body.wickets_taken, body.wides, body.no_balls, body.boundaries_conceded)
        )

    _recalculate_innings_totals(innings_id)
    return result


# -------------------------------------------------------
# POST /{innings_id}/wickets — Record a wicket
# -------------------------------------------------------
@router.post("/{innings_id}/wickets", status_code=201)
def add_wicket(innings_id: int, body: WicketEntry, current_user = Depends(get_current_user)):
    if body.dismissal_type not in VALID_DISMISSALS:
        raise HTTPException(status_code=400, detail=f"dismissal_type must be one of {VALID_DISMISSALS}")

    innings = fetch_one("SELECT id FROM innings WHERE id = %s", (innings_id,))
    if not innings:
        raise HTTPException(status_code=404, detail="Innings not found")

    # Get the batting scorecard row for this batsman
    batting_card = fetch_one(
        "SELECT id FROM batting_scorecards WHERE innings_id = %s AND player_id = %s",
        (innings_id, body.batsman_id)
    )
    if not batting_card:
        raise HTTPException(
            status_code=400,
            detail="Batsman has no batting scorecard entry. Add batting entry first."
        )

    # Check max 10 wickets per innings
    wicket_count = fetch_one(
        "SELECT COUNT(*) AS cnt FROM wickets WHERE innings_id = %s",
        (innings_id,)
    )
    if wicket_count["cnt"] >= 10:
        raise HTTPException(status_code=400, detail="An innings cannot have more than 10 wickets")

    with get_db() as cursor:
        # Insert the wicket
        cursor.execute(
            """
            INSERT INTO wickets
                (innings_id, batting_scorecard_id, batsman_id, bowler_id,
                 dismissal_type, responsible_player_id, fall_of_wicket_runs)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, dismissal_type, fall_of_wicket_runs
            """,
            (innings_id, batting_card["id"], body.batsman_id, body.bowler_id,
             body.dismissal_type, body.responsible_player_id, body.fall_of_wicket_runs)
        )
        wicket = cursor.fetchone()

        # Mark batsman as out in batting scorecard
        cursor.execute(
            "UPDATE batting_scorecards SET is_out = TRUE WHERE id = %s",
            (batting_card["id"],)
        )

    _recalculate_innings_totals(innings_id)
    return {"message": "Wicket recorded", "wicket": wicket}


# -------------------------------------------------------
# PATCH /{innings_id}/complete — Mark innings as done
# -------------------------------------------------------
@router.patch("/{innings_id}/complete")
def complete_innings(innings_id: int, current_user = Depends(get_current_user)):
    innings = fetch_one("SELECT id, is_completed FROM innings WHERE id = %s", (innings_id,))
    if not innings:
        raise HTTPException(status_code=404, detail="Innings not found")
    if innings["is_completed"]:
        raise HTTPException(status_code=400, detail="Innings is already completed")

    execute(
        "UPDATE innings SET is_completed = TRUE WHERE id = %s",
        (innings_id,)
    )
    return {"message": "Innings completed"}


# -------------------------------------------------------
# PUT /matches/{match_id}/result — Set final match result
# -------------------------------------------------------
@router.put("/matches/{match_id}/result")
def set_match_result(
    match_id: int,
    body: MatchResultRequest,
    current_user = Depends(get_current_user)
):
    match = fetch_one(
        "SELECT id, team_a_id, team_b_id FROM matches WHERE id = %s",
        (match_id,)
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if body.winner_id and body.winner_id not in (match["team_a_id"], match["team_b_id"]):
        raise HTTPException(status_code=400, detail="winner_id must be one of the two teams in this match")

    with get_db() as cursor:
        # Update winner on match
        cursor.execute(
            "UPDATE matches SET winner_id = %s, status = 'completed' WHERE id = %s",
            (body.winner_id, match_id)
        )

        # Upsert match_results for team_a
        cursor.execute(
            """
            INSERT INTO match_results (match_id, team_id, runs, wickets, overs_played)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (match_id, team_id)
            DO UPDATE SET runs = EXCLUDED.runs,
                          wickets = EXCLUDED.wickets,
                          overs_played = EXCLUDED.overs_played
            """,
            (match_id, match["team_a_id"], body.team_a_runs, body.team_a_wickets, body.team_a_overs)
        )

        # Upsert match_results for team_b
        cursor.execute(
            """
            INSERT INTO match_results (match_id, team_id, runs, wickets, overs_played)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (match_id, team_id)
            DO UPDATE SET runs = EXCLUDED.runs,
                          wickets = EXCLUDED.wickets,
                          overs_played = EXCLUDED.overs_played
            """,
            (match_id, match["team_b_id"], body.team_b_runs, body.team_b_wickets, body.team_b_overs)
        )

    return {"message": "Match result saved", "winner_id": body.winner_id}


# -------------------------------------------------------
# Internal helper — recalculate innings totals from scorecards
# Called after every batting/bowling/wicket update
# -------------------------------------------------------
def _recalculate_innings_totals(innings_id: int):
    """
    Recomputes total_runs, total_wickets, total_overs, extras
    directly from batting/bowling/wicket rows and writes them back.
    This keeps the innings summary always in sync.
    """
    batting_totals = fetch_one(
        "SELECT COALESCE(SUM(runs_scored), 0) AS runs FROM batting_scorecards WHERE innings_id = %s",
        (innings_id,)
    )
    wicket_count = fetch_one(
        "SELECT COUNT(*) AS cnt FROM wickets WHERE innings_id = %s",
        (innings_id,)
    )
    bowling_totals = fetch_one(
        """
        SELECT
            COALESCE(SUM(overs_bowled), 0) AS overs,
            COALESCE(SUM(wides), 0) + COALESCE(SUM(no_balls), 0) AS extras
        FROM bowling_scorecards WHERE innings_id = %s
        """,
        (innings_id,)
    )

    execute(
        """
        UPDATE innings
        SET total_runs     = %s,
            total_wickets  = %s,
            total_overs    = %s,
            extras         = %s
        WHERE id = %s
        """,
        (
            batting_totals["runs"],
            wicket_count["cnt"],
            bowling_totals["overs"],
            bowling_totals["extras"],
            innings_id
        )
    )