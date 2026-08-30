from __future__ import annotations

from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(..., description="Supabase/Postgres connection URL")
    db_echo: bool = False

    # Uvicorn settings
    UVICORN_HOST: str = Field("0.0.0.0", description="Uvicorn host")
    UVICORN_PORT: int = Field(8080, description="Uvicorn port")
    UVICORN_RELOAD: bool = Field(True, description="Uvicorn reload")

    # Clerk settings. The key is required rather than optional: without it every guarded
    # route would answer 401 with no visible cause, and failing at boot with a message
    # naming .env.example is by far the cheaper mistake to debug.
    clerk_secret_key: str = Field(..., description="Clerk secret key (sk_test_… / sk_live_…)")
    clerk_jwt_key: str | None = Field(
        None,
        description="Clerk PEM public key. Set it to verify tokens without a call to Clerk.",
    )
    # pydantic-settings JSON-decodes a list[str] env value before any validator runs, so a
    # plain comma-separated string — or an empty one — raises a SettingsError at import.
    # NoDecode hands the raw string to the validator below instead. Do not remove it.
    clerk_authorized_parties: Annotated[list[str], NoDecode] = Field(
        default_factory=list,
        description="Comma-separated origins allowed to present a token (azp claim)",
    )
    # Not a Clerk setting: roles are granted in the `roles` table and Clerk knows nothing
    # about them. This is only the string those rows are expected to hold.
    caregiver_role: str = Field(
        "caregiver",
        description="Value of roles.role that marks a caregiver",
    )

    @field_validator("clerk_authorized_parties", mode="before")
    @classmethod
    def _split_authorized_parties(cls, value: object) -> object:
        if isinstance(value, str):
            return [party.strip() for party in value.split(",") if party.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
