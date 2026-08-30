import uvicorn
from fastapi import FastAPI

from features.auth.router import router as auth_router
from features.dashboard.router import router as dashboard_router
from features.database.db import init_db
from features.user.router import router as user_router


app = FastAPI(
    title="Hackathon API",
    description="Backend API for the hackathon project",
    version="0.1.0",
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


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
