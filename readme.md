Take your cricket team to new heights using Yorker.   
Join a local team or make your own.
Join a league or make your own.
Player stats and match records
team stats
follow leagues or matches near u

## Tech Stack

```
Backend:      FastAPI (Python)
Database:     PostgreSQL --Supabase 
Driver:       psycopg2 
Cache:        Redis (Upstash )
Realtime:     WebSockets (FastAPI native)
Frontend:     React + TypeScript
Styling:      Tailwind CSS
Hosting:      Render (backend) + Vercel (frontend)
Auth:         JWT (python-jose)
Geolocation:  PostGIS (already on Supabase)
```

## API Endpoints

### Auth
```
POST   /auth/register
POST   /auth/login
GET    /auth/me
```

### Users
```
GET    /users/{id}
PUT    /users/{id}
```

### Teams
```
POST   /teams                          -- create team (you become captain)
GET    /teams/{id}
GET    /teams/{id}/players
POST   /teams/{id}/join-request        -- player requests to join
GET    /teams/{id}/join-requests       -- captain sees pending requests
PATCH  /teams/{id}/join-requests/{rid} -- captain accepts/denies
DELETE /teams/{id}/leave               -- player leaves team
```

### Leagues
```
POST   /leagues                        -- create league (you become admin)
GET    /leagues
GET    /leagues/nearby?lat=&lng=&km=   -- PostGIS query
GET    /leagues/{id}
GET    /leagues/{id}/standings         -- points table from Redis
POST   /leagues/{id}/join-request      -- captain requests team to join
GET    /leagues/{id}/join-requests     -- league creator sees pending
PATCH  /leagues/{id}/join-requests/{rid} -- creator accepts/denies
```

### Matches
```
POST   /matches                        -- create match (standalone or in league)
GET    /matches/{id}
GET    /matches/{id}/scorecard         -- full scorecard
PATCH  /matches/{id}/status            -- update to live/completed
```

### Innings & Scoring
```
POST   /matches/{id}/innings                          -- start an innings
POST   /innings/{id}/batting                          -- add batting scorecard entry
PUT    /innings/{id}/batting/{player_id}              -- update batting
POST   /innings/{id}/bowling                          -- add bowling scorecard entry
PUT    /innings/{id}/bowling/{player_id}              -- update bowling
POST   /innings/{id}/wickets                          -- record a wicket
```

### Stats
```
GET    /players/{id}/stats             -- career batting + bowling averages
GET    /leagues/{id}/top-batsmen
GET    /leagues/{id}/top-bowlers
```

### WebSocket
```
WS     /ws/matches/{id}               -- live score updates
```

---

## Request / Approval Flow

```
PLAYER JOINS TEAM:
Player → POST /teams/{id}/join-request
Captain → GET /teams/{id}/join-requests       (sees pending)
Captain → PATCH /teams/{id}/join-requests/{rid}  { status: "accepted" }
→ Row inserted into team_members

TEAM JOINS LEAGUE:
Captain → POST /leagues/{id}/join-request
Creator → GET /leagues/{id}/join-requests     (sees pending)
Creator → PATCH /leagues/{id}/join-requests/{rid}  { status: "accepted" }
→ Row inserted into league_teams
```

---

## Redis Usage

```
Leaderboard per league:
  Key:  leaderboard:{league_id}
  Type: Sorted Set
  Score: points (wins×2, ties×1)
  Member: team_id

Live match score:
  Key:  match:{match_id}:score
  Type: Hash
  Fields: team_a_runs, team_a_wickets, team_b_runs, team_b_wickets
  TTL: 24hrs after match ends
```

---

## Folder Structure

```
cricket-leagues/
├── backend/
│   ├── main.py
│   ├── db.py                  ← psycopg2 connection helper
│   ├── auth.py                ← JWT logic
│   ├── redis_client.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── teams.py
│   │   ├── leagues.py
│   │   ├── matches.py
│   │   ├── innings.py
│   │   └── stats.py
│   ├── services/
│   │   ├── leaderboard.py     ← Redis sorted set logic
│   │   ├── nrr.py             ← Net Run Rate calculation
│   │   └── websocket.py       ← live score broadcasting
│   └── sql/
│       └── schema.sql         ← all CREATE TABLE statements
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── League.tsx
│   │   │   ├── Match.tsx      ← live scorecard
│   │   │   └── Player.tsx
│   │   ├── components/
│   │   │   ├── Scorecard.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   └── JoinRequests.tsx
│   │   └── hooks/
│   │       └── useWebSocket.ts
└── docker-compose.yml         ← local Postgres + Redis for dev
```

---

## FUTURE:

- Push notifications when join request is accepted
- Match commentary (ball by ball text log)
- Export scorecard as PDF
- Player of the match voting
- Head to head team records