"""
routers/leagues.py
------------------
Endpoints:
  POST   /leagues                            — create a league
  GET    /leagues                            — list all leagues
  GET    /leagues/nearby                     — find leagues near a location
  GET    /leagues/{league_id}                — get league details
  PUT    /leagues/{league_id}                — edit league (creator only)
  DELETE /leagues/{league_id}               — delete league (creator only)
  POST   /leagues/{league_id}/join-request  — captain requests team to join
  GET    /leagues/{league_id}/join-requests — creator sees pending requests
  PATCH  /leagues/{league_id}/join-requests/{request_id} — accept or deny
  GET    /leagues/{league_id}/standings      — points table
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from db import fetch_one, fetch_all, execute, get_db

router = APIRouter()


# -------------------------------------------------------
# Helper
# -------------------------------------------------------
def assert_is_creator(league_id: int, user_id: int):
    league = fetch_one("SELECT creator_id FROM leagues WHERE id = %s", (league_id,))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league["creator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the league creator can do this")
    return league


# -------------------------------------------------------
# Pydantic schemas
# -------------------------------------------------------
class CreateLeagueRequest(BaseModel):
    name: str
    description: Optional[str] = None
    format: Optional[str] = None        # T20 | ODI | Test | Custom
    max_overs: Optional[int] = None
    location_name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class EditLeagueRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    format: Optional[str] = None
    max_overs: Optional[int] = None
    location_name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_active: Optional[bool] = None

class JoinRequestAction(BaseModel):
    status: str     # "accepted" or "denied"


# -------------------------------------------------------
# POST / — Create a league
# -------------------------------------------------------
@router.post("/", status_code=201)
def create_league(body: CreateLeagueRequest, current_user = Depends(get_current_user)):
    if body.format and body.format not in ("T20", "ODI", "Test", "Custom"):
        raise HTTPException(status_code=400, detail="format must be T20, ODI, Test, or Custom")

    result = execute(
        """
        INSERT INTO leagues (name, creator_id, description, format, max_overs, location_name, lat, lng)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, name, creator_id, description, format, max_overs, location_name, lat, lng, is_active, created_at
        """,
        (body.name, current_user["id"], body.description, body.format,
         body.max_overs, body.location_name, body.lat, body.lng)
    )
    if not result:
        raise HTTPException(status_code=500, detail="DB error, try again")
    return result


# -------------------------------------------------------
# GET / — List all active leagues
# -------------------------------------------------------
@router.get("/")
def list_leagues():
    leagues = fetch_all(
        """
        SELECT
            l.id, l.name, l.description, l.format, l.max_overs,
            l.location_name, l.lat, l.lng, l.is_active, l.created_at,
            u.id   AS creator_id,
            u.name AS creator_name
        FROM leagues l
        JOIN users u ON u.id = l.creator_id
        WHERE l.is_active = TRUE
        ORDER BY l.created_at DESC
        """,
        ()
    )
    return leagues


# -------------------------------------------------------
# GET /nearby — Find leagues near a location (PostGIS)
# -------------------------------------------------------
@router.get("/nearby")
def get_nearby_leagues(
    lat: float = Query(..., description="Your latitude"),
    lng: float = Query(..., description="Your longitude"),
    km: float  = Query(10,  description="Search radius in kilometres")
):
    leagues = fetch_all(
        """
        SELECT
            l.id, l.name, l.description, l.format, l.max_overs,
            l.location_name, l.lat, l.lng, l.is_active,
            u.name AS creator_name,
            ROUND(
                (ST_Distance(
                    ST_MakePoint(l.lng, l.lat)::geography,
                    ST_MakePoint(%s, %s)::geography
                ) / 1000)::numeric, 2
            ) AS distance_km
        FROM leagues l
        JOIN users u ON u.id = l.creator_id
        WHERE
            l.is_active = TRUE
            AND l.lat IS NOT NULL
            AND l.lng IS NOT NULL
            AND ST_DWithin(
                ST_MakePoint(l.lng, l.lat)::geography,
                ST_MakePoint(%s, %s)::geography,
                %s
            )
        ORDER BY distance_km ASC
        """,
        (lng, lat, lng, lat, km * 1000)     # ST_DWithin takes metres
    )
    return leagues


# -------------------------------------------------------
# GET /{league_id} — Get league details + teams
# -------------------------------------------------------
@router.get("/{league_id}")
def get_league(league_id: int):
    league = fetch_one(
        """
        SELECT
            l.id, l.name, l.description, l.format, l.max_overs,
            l.location_name, l.lat, l.lng, l.is_active, l.created_at,
            u.id   AS creator_id,
            u.name AS creator_name
        FROM leagues l
        JOIN users u ON u.id = l.creator_id
        WHERE l.id = %s
        """,
        (league_id,)
    )
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    teams = fetch_all(
        """
        SELECT t.id, t.name, t.logo_url,
               u.name AS captain_name
        FROM teams t
        JOIN league_teams lt ON lt.team_id = t.id
        JOIN users u ON u.id = t.captain_id
        WHERE lt.league_id = %s
        """,
        (league_id,)
    )

    return {
        "id": league["id"],
        "name": league["name"],
        "description": league["description"],
        "format": league["format"],
        "max_overs": league["max_overs"],
        "location_name": league["location_name"],
        "lat": league["lat"],
        "lng": league["lng"],
        "is_active": league["is_active"],
        "created_at": league["created_at"],
        "creator": {
            "id": league["creator_id"],
            "name": league["creator_name"]
        },
        "teams": teams
    }


# -------------------------------------------------------
# PUT /{league_id} — Edit league (creator only)
# -------------------------------------------------------
@router.put("/{league_id}")
def edit_league(league_id: int, body: EditLeagueRequest, current_user = Depends(get_current_user)):
    assert_is_creator(league_id, current_user["id"])

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    if "format" in fields and fields["format"] not in ("T20", "ODI", "Test", "Custom"):
        raise HTTPException(status_code=400, detail="format must be T20, ODI, Test, or Custom")

    set_clause = ", ".join(f"{key} = %s" for key in fields)
    values = list(fields.values()) + [league_id]

    result = execute(
        f"UPDATE leagues SET {set_clause} WHERE id = %s RETURNING id, name, format, is_active",
        tuple(values)
    )
    return result


# -------------------------------------------------------
# DELETE /{league_id} — Delete league (creator only)
# -------------------------------------------------------
@router.delete("/{league_id}")
def delete_league(league_id: int, current_user = Depends(get_current_user)):
    assert_is_creator(league_id, current_user["id"])
    execute("DELETE FROM leagues WHERE id = %s", (league_id,))
    return {"message": "League deleted"}


# -------------------------------------------------------
# POST /{league_id}/join-request — Captain requests to join
# -------------------------------------------------------
@router.post("/{league_id}/join-request", status_code=201)
def send_join_request(league_id: int, team_id: int, current_user = Depends(get_current_user)):
    # Check league exists
    league = fetch_one("SELECT id FROM leagues WHERE id = %s", (league_id,))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    # Check the requester is actually the captain of that team
    team = fetch_one("SELECT captain_id FROM teams WHERE id = %s", (team_id,))
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team["captain_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team captain can request to join a league")

    # Check team isn't already in the league
    already_in = fetch_one(
        "SELECT id FROM league_teams WHERE league_id = %s AND team_id = %s",
        (league_id, team_id)
    )
    if already_in:
        raise HTTPException(status_code=400, detail="Team is already in this league")

    # Check no existing pending request
    existing = fetch_one(
        "SELECT id, status FROM league_join_requests WHERE league_id = %s AND team_id = %s",
        (league_id, team_id)
    )
    if existing:
        if existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="A pending request already exists")
        if existing["status"] == "denied":
            raise HTTPException(status_code=400, detail="This team's request was previously denied")

    result = execute(
        """
        INSERT INTO league_join_requests (league_id, team_id, captain_id)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (league_id, team_id, current_user["id"])
    )
    return {"message": "Request sent", "request_id": result["id"]}


# -------------------------------------------------------
# GET /{league_id}/join-requests — Creator sees pending requests
# -------------------------------------------------------
@router.get("/{league_id}/join-requests")
def get_join_requests(league_id: int, current_user = Depends(get_current_user)):
    assert_is_creator(league_id, current_user["id"])

    requests = fetch_all(
        """
        SELECT
            ljr.id          AS request_id,
            ljr.status,
            ljr.created_at,
            t.id            AS team_id,
            t.name          AS team_name,
            t.logo_url      AS team_logo,
            u.id            AS captain_id,
            u.name          AS captain_name
        FROM league_join_requests ljr
        JOIN teams t ON t.id = ljr.team_id
        JOIN users u ON u.id = ljr.captain_id
        WHERE ljr.league_id = %s AND ljr.status = 'pending'
        ORDER BY ljr.created_at ASC
        """,
        (league_id,)
    )

    return [
        {
            "request_id": r["request_id"],
            "status": r["status"],
            "created_at": r["created_at"],
            "team": {
                "id": r["team_id"],
                "name": r["team_name"],
                "logo_url": r["team_logo"]
            },
            "captain": {
                "id": r["captain_id"],
                "name": r["captain_name"]
            }
        }
        for r in requests
    ]


# -------------------------------------------------------
# PATCH /{league_id}/join-requests/{request_id} — Accept or deny
# -------------------------------------------------------
@router.patch("/{league_id}/join-requests/{request_id}")
def handle_join_request(
    league_id: int,
    request_id: int,
    body: JoinRequestAction,
    current_user = Depends(get_current_user)
):
    assert_is_creator(league_id, current_user["id"])

    if body.status not in ("accepted", "denied"):
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'denied'")

    request = fetch_one(
        "SELECT id, team_id, status FROM league_join_requests WHERE id = %s AND league_id = %s",
        (request_id, league_id)
    )
    if not request:
        raise HTTPException(status_code=404, detail="Join request not found")
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="This request has already been handled")

    # Both updates in one transaction
    with get_db() as cursor:
        cursor.execute(
            "UPDATE league_join_requests SET status = %s, updated_at = NOW() WHERE id = %s",
            (body.status, request_id)
        )
        if body.status == "accepted":
            cursor.execute(
                "INSERT INTO league_teams (league_id, team_id) VALUES (%s, %s)",
                (league_id, request["team_id"])
            )

    return {"message": f"Request {body.status}"}


# -------------------------------------------------------
# GET /{league_id}/standings — Points table
# -------------------------------------------------------
@router.get("/{league_id}/standings")
def get_standings(league_id: int):
    # Check league exists
    league = fetch_one("SELECT id FROM leagues WHERE id = %s", (league_id,))
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    standings = fetch_all(
        """
        SELECT
            t.id            AS team_id,
            t.name          AS team_name,
            t.logo_url,
            COUNT(m.id)                                             AS played,
            COUNT(CASE WHEN m.winner_id = t.id THEN 1 END)         AS won,
            COUNT(CASE WHEN m.winner_id IS NOT NULL
                       AND m.winner_id != t.id THEN 1 END)         AS lost,
            COUNT(CASE WHEN m.winner_id IS NULL
                       AND m.status = 'completed' THEN 1 END)      AS tied,
            -- Points: win=2, tie=1, loss=0
            (COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) * 2)
            + COUNT(CASE WHEN m.winner_id IS NULL
                         AND m.status = 'completed' THEN 1 END)    AS points
        FROM league_teams lt
        JOIN teams t ON t.id = lt.team_id
        LEFT JOIN matches m ON m.league_id = %s
            AND (m.team_a_id = t.id OR m.team_b_id = t.id)
            AND m.status = 'completed'
        WHERE lt.league_id = %s
        GROUP BY t.id, t.name, t.logo_url
        ORDER BY points DESC, won DESC
        """,
        (league_id, league_id)
    )
    return standings