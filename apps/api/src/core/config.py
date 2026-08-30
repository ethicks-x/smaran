from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(..., description="Supabase/Postgres connection URL")
    db_echo: bool = False

    # Uvicorn settings
    UVICORN_HOST: str = Field("0.0.0.0", description="Uvicorn host")
    UVICORN_PORT: int = Field(8080, description="Uvicorn port")
    UVICORN_RELOAD: bool = Field(True, description="Uvicorn reload")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
