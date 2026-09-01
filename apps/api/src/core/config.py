from __future__ import annotations

from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(..., description="Supabase/Postgres connection URL")
    db_echo: bool = False
    # Alembic owns the schema (`alembic/`). This puts the old startup `create_all` back for
    # a throwaway database, and is off everywhere the data matters — `create_all` adds
    # missing tables but never a missing column, so it leaves a schema that looks built and
    # is not.
    db_auto_create: bool = Field(
        False, description="Create tables from the models on startup instead of migrating"
    )

    # S3-compatible storage. One set of credentials serves every bucket below — the CA
    # certificate the database connection verifies against, and the memory media bucket.
    s3_cert_bucket: str | None = Field(None, description="S3 bucket containing the CA certificate")
    s3_cert_key: str | None = Field(None, description="S3 object key/path for the CA certificate")
    s3_endpoint_url: str | None = Field(
        None,
        description="Custom endpoint URL for S3-compatible storage (e.g. MinIO, Cloudflare R2, Supabase Storage)",
    )
    s3_region_name: str | None = Field(None, description="AWS/S3 region name")
    s3_access_key_id: str | None = Field(None, description="S3 Access Key ID")
    s3_secret_access_key: str | None = Field(None, description="S3 Secret Access Key")

    # Memory media. The dashboard uploads a photo straight at this bucket with a presigned
    # URL and the phone reads it back the same way, so the bytes never cross this API.
    s3_memories_bucket: str | None = Field(
        None, description="S3 bucket holding memory photos, audio and stories"
    )
    s3_memories_prefix: str = Field(
        "memories/",
        description="Key prefix every memory object is written under, inside the bucket",
    )
    # Set only when the bucket is fronted by a CDN or is public. Left unset, the API signs
    # a short-lived GET per object instead — which is the right default for photographs of
    # a named person with dementia, since a public object URL is an unauthenticated one.
    s3_memories_public_base_url: str | None = Field(
        None,
        description="Public/CDN base URL for the memory bucket. Unset means presigned reads",
    )
    # Long enough for a slow NER connection to finish a photo, short enough that a URL
    # copied out of a browser log is useless by the time anyone reads it.
    s3_presign_expiry_seconds: int = Field(
        3600, description="Lifetime of a presigned upload or download URL, in seconds"
    )
    s3_max_upload_bytes: int = Field(
        26_214_400, description="Largest memory upload accepted, in bytes (default 25 MiB)"
    )

    # Uvicorn settings
    UVICORN_HOST: str = Field("0.0.0.0", description="Uvicorn host")
    UVICORN_PORT: int = Field(8080, description="Uvicorn port")
    UVICORN_RELOAD: bool = Field(True, description="Uvicorn reload")

    # Clerk settings.
    clerk_secret_key: str = Field(
        "sk_test_placeholder", description="Clerk secret key (sk_test_… / sk_live_…)"
    )
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
    # The dashboard is a separate origin calling this API from a browser, so the browser
    # preflights every authenticated request. Same NoDecode reasoning as above.
    cors_allow_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        description="Comma-separated browser origins allowed to call this API",
    )

    # Not a Clerk setting: roles are granted in the `roles` table and Clerk knows nothing
    # about them. This is only the string those rows are expected to hold.
    caregiver_role: str = Field(
        "caregiver",
        description="Value of roles.role that marks a caregiver",
    )
    patient_role: str = Field(
        "patient",
        description="Value of roles.role that marks a patient",
    )

    # Google Gemini AI settings for clinical and routine caregiver insights
    gemini_api_key: str | None = Field(
        None,
        description="Google Gemini API key for generating AI patient insights",
    )
    gemini_model: str = Field(
        "gemini-3.1-flash-lite",
        description="Gemini model identifier (e.g. gemini-3.1-flash-lite, gemini-3.6-flash)",
    )

    @field_validator("clerk_authorized_parties", "cors_allow_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
