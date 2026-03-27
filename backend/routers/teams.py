"""
routers/teams.py
---------------
Endpoints:
  ✔️ POST /teams   — create a team
  ✔️ GET /teams/{team_id} — Get team details
  ✔️ PUT /teams/{team_id} — Edit team (captain only)
  ✔️ DELETE /teams/{team_id} — Delete team (captain only)
  ✔️ POST /teams/{team_id}/join-request — Player requests to join
  ✔️ GET /teams/{team_id}/join-requests — See all pending requests (captain only)
  ✔️ PATCH /teams/{team_id}/join-requests/{request_id} — Accept or deny (captain only)
  ✔️ DELETE /teams/{team_id}/leave — Player leaves a team
"""

from routers.auth import get_current_user
from fastapi import APIRouter, HTTPException, Depends
from db import fetch_all, fetch_one, execute, get_db
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


# -------------------------------------------------------
# Helper — reused in many routes
# -------------------------------------------------------
def assert_is_captain(team_id: int, user_id: int):
    team = fetch_one("SELECT captain_id FROM teams WHERE id = %s", (team_id,))
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team["captain_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the captain can do this")
    return team


# -------------------------------------------------------
# Pydantic schemas
# -------------------------------------------------------
class RegisterTeamRequest(BaseModel):
    name: str
    logo_url: Optional[str] = None

class EditTeamRequest(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None

class Captain(BaseModel):
    id: int
    name: str

class Player(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str] = None

class Team_info(BaseModel):
    id: int
    name: str
    logo_url: Optional[str] = None
    captain: Captain
    players: list[Player]

class JoinRequestAction(BaseModel):
    status: str     # "accepted" or "denied"


# -------------------------------------------------------
# POST / — Create a team
# -------------------------------------------------------
@router.post("/", status_code=201)
def post_team(body: RegisterTeamRequest, current_user = Depends(get_current_user)):
    result = execute(
        """
        INSERT INTO teams (name, captain_id, logo_url)
        VALUES (%s, %s, %s)
        RETURNING id, name, captain_id, created_at, logo_url
        """,
        (body.name, current_user["id"], body.logo_url)
    )
    if not result:
        raise HTTPException(status_code=500, detail="DB error, try again")

    # creator automatically becomes first team member
    execute(
        "INSERT INTO team_members (team_id, player_id) VALUES (%s, %s)",
        (result["id"], current_user["id"])
    )
    return result


# -------------------------------------------------------
# GET /{team_id} — Get team details
# -------------------------------------------------------
@router.get("/{team_id}", response_model=Team_info)
def get_team(team_id: int):
    result_teams = fetch_one(
        "SELECT id, name, logo_url, captain_id FROM teams WHERE id = %s",
        (team_id,)
    )
    if not result_teams:
        raise HTTPException(status_code=404, detail="Team not found")

    result_captain = fetch_one(
        "SELECT name FROM users WHERE id = %s",
        (result_teams["captain_id"],)
    )
    result_players = fetch_all(
        """
        SELECT u.id, u.name, u.avatar_url
        FROM users u
        JOIN team_members tm ON u.id = tm.player_id
        WHERE tm.team_id = %s
        """,
        (team_id,)
    )
    return {
        "id": result_teams["id"],
        "name": result_teams["name"],
        "logo_url": result_teams["logo_url"],
        "captain": {
            "id": result_teams["captain_id"],
            "name": result_captain["name"]
        },
        "players": result_players
    }


# -------------------------------------------------------
# PUT /{team_id} — Edit team (captain only)
# -------------------------------------------------------
@router.put("/{team_id}")
def edit_team(team_id: int, body: EditTeamRequest, current_user = Depends(get_current_user)):
    assert_is_captain(team_id, current_user["id"])

    # Only update fields the user actually sent
    # Build the SET clause dynamically based on what was provided
    fields = {}
    if body.name is not None:
        fields["name"] = body.name
    if body.logo_url is not None:
        fields["logo_url"] = body.logo_url

    if not fields:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    set_clause = ", ".join(f"{key} = %s" for key in fields)
    values = list(fields.values()) + [team_id]

    result = execute(
        f"UPDATE teams SET {set_clause} WHERE id = %s RETURNING id, name, logo_url",
        tuple(values)
    )
    return result


# -------------------------------------------------------
# DELETE /{team_id} — Delete team (captain only)
# -------------------------------------------------------
@router.delete("/{team_id}")
def delete_team(team_id: int, current_user = Depends(get_current_user)):
    assert_is_captain(team_id, current_user["id"])

    # ON DELETE CASCADE in schema handles team_members,
    # team_join_requests, league_teams cleanup automatically
    execute("DELETE FROM teams WHERE id = %s", (team_id,))
    return {"message": "Team deleted"}


# -------------------------------------------------------
# POST /{team_id}/join-request — Player requests to join
# -------------------------------------------------------
@router.post("/{team_id}/join-request", status_code=201)
def send_join_request(team_id: int, current_user = Depends(get_current_user)):
    # Check team exists
    team = fetch_one("SELECT id FROM teams WHERE id = %s", (team_id,))
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check player isn't already a member
    already_member = fetch_one(
        "SELECT id FROM team_members WHERE team_id = %s AND player_id = %s",
        (team_id, current_user["id"])
    )
    if already_member:
        raise HTTPException(status_code=400, detail="You are already a member of this team")

    # Check player doesn't already have a pending request
    existing_request = fetch_one(
        "SELECT id, status FROM team_join_requests WHERE team_id = %s AND player_id = %s",
        (team_id, current_user["id"])
    )
    if existing_request:
        if existing_request["status"] == "pending":
            raise HTTPException(status_code=400, detail="You already have a pending request for this team")
        if existing_request["status"] == "denied":
            raise HTTPException(status_code=400, detail="Your request was previously denied")

    result = execute(
        """
        INSERT INTO team_join_requests (team_id, player_id)
        VALUES (%s, %s)
        RETURNING id
        """,
        (team_id, current_user["id"])
    )
    return {"message": "Request sent", "request_id": result["id"]}


# -------------------------------------------------------
# GET /{team_id}/join-requests — See pending requests (captain only)
# -------------------------------------------------------
@router.get("/{team_id}/join-requests")
def get_join_requests(team_id: int, current_user = Depends(get_current_user)):
    assert_is_captain(team_id, current_user["id"])

    requests = fetch_all(
        """
        SELECT
            tjr.id          AS request_id,
            tjr.status,
            tjr.created_at,
            u.id            AS player_id,
            u.name          AS player_name,
            u.avatar_url    AS player_avatar
        FROM team_join_requests tjr
        JOIN users u ON u.id = tjr.player_id
        WHERE tjr.team_id = %s AND tjr.status = 'pending'
        ORDER BY tjr.created_at ASC
        """,
        (team_id,)
    )

    # Shape the response into nested objects
    return [
        {
            "request_id": r["request_id"],
            "status": r["status"],
            "created_at": r["created_at"],
            "player": {
                "id": r["player_id"],
                "name": r["player_name"],
                "avatar_url": r["player_avatar"]
            }
        }
        for r in requests
    ]


# -------------------------------------------------------
# PATCH /{team_id}/join-requests/{request_id} — Accept or deny
# -------------------------------------------------------

@router.patch("/{team_id}/join-requests/{request_id}")
def handle_join_request(
    team_id: int,
    request_id: int,
    body: JoinRequestAction,
    current_user = Depends(get_current_user)
):
    assert_is_captain(team_id, current_user["id"])

    # Validate the status value
    if body.status not in ("accepted", "denied"):
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'denied'")

    # Check the request exists and belongs to this team
    request = fetch_one(
        "SELECT id, player_id, status FROM team_join_requests WHERE id = %s AND team_id = %s",
        (request_id, team_id)
    )
    if not request:
        raise HTTPException(status_code=404, detail="Join request not found")
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="This request has already been handled")

    # Use get_db() directly so both queries run in ONE transaction.
    # If inserting into team_members fails, the status update is also rolled back.
    with get_db() as cursor:
        # Update the request status
        cursor.execute(
            "UPDATE team_join_requests SET status = %s, updated_at = NOW() WHERE id = %s",
            (body.status, request_id)
        )
        # If accepted, add the player to the team
        if body.status == "accepted":
            cursor.execute(
                "INSERT INTO team_members (team_id, player_id) VALUES (%s, %s)",
                (team_id, request["player_id"])
            )

    return {"message": f"Request {body.status}"}


# -------------------------------------------------------
# DELETE /{team_id}/leave — Player leaves a team
# -------------------------------------------------------
@router.delete("/{team_id}/leave")
def leave_team(team_id: int, current_user = Depends(get_current_user)):
    # Check team exists
    team = fetch_one("SELECT captain_id FROM teams WHERE id = %s", (team_id,))
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Captain cannot leave — they must delete the team
    if team["captain_id"] == current_user["id"]:
        raise HTTPException(
            status_code=400,
            detail="You are the captain. Delete the team instead, or transfer captaincy first"
        )

    # Check the user is actually a member
    member = fetch_one(
        "SELECT id FROM team_members WHERE team_id = %s AND player_id = %s",
        (team_id, current_user["id"])
    )
    if not member:
        raise HTTPException(status_code=400, detail="You are not a member of this team")

    execute(
        "DELETE FROM team_members WHERE team_id = %s AND player_id = %s",
        (team_id, current_user["id"])
    )
    return {"message": "Left team successfully"}