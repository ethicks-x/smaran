import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from features.auth.router import router as auth_router
from features.dashboard.router import router as dashboard_router
from features.database.db import init_db
from features.sync.router import router as sync_router
from features.user.router import router as user_router


app = FastAPI(
    title="Hackathon API",
    description="Backend API for the hackathon project",
    version="0.1.0",
)


# The caregiver dashboard runs on its own origin and calls this API straight from the
# browser, which preflights anything carrying an Authorization header. Origins are listed
# rather than wildcarded: `allow_credentials` with `*` is rejected by browsers, and a
# wildcard on an API serving patient data (AGENTS.md §2.5) is not what we want anyway.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    await init_db()


app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"],
)

app.include_router(
    user_router,
    prefix="/users",
    tags=["Users"],
)

app.include_router(
    dashboard_router,
    prefix="/dashboard",
    tags=["Dashboard"],
)

app.include_router(
    sync_router,
    prefix="/sync",
    tags=["Sync"],
)


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.UVICORN_HOST,
        port=settings.UVICORN_PORT,
        reload=settings.UVICORN_RELOAD,
    )
