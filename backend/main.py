from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# router importsS
from routers import auth,teams,leagues,matches,innings,stats


app = FastAPI(
    title="Yorker API",
    description="Backend for the Yorker app",
    version="1.0.0"
)
# CORS enable (so my frontend can call)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTERS:
app.include_router(auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(teams.router,   prefix="/teams",   tags=["Teams"])
app.include_router(leagues.router, prefix="/leagues", tags=["Leagues"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(innings.router, prefix="/innings", tags=["Innings"])
app.include_router(stats.router,   prefix="/stats",   tags=["Stats"])


@app.get("/")
def root():
    return {"message": "Yorker API is running 🏏"}


@app.get("/health")
def health():
    return {"status": "ok"}