"""
Presigned access to the S3 memory bucket.

The bytes of a memory never pass through this API. A caregiver's browser is handed a
short-lived URL and talks to the bucket directly, so a photo on a slow NER connection
occupies their browser for the length of the upload rather than an API worker
(`decisions.md` D-32).

Signing is local — it is an HMAC over the request, not a call to S3 — so the presign
helpers here are safe to call straight from an async route. `head_object` is not: it is a
real network round trip and runs on a worker thread.
"""

from __future__ import annotations

import contextlib
from functools import lru_cache
from typing import TYPE_CHECKING

import anyio.to_thread
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from core.config import settings


if TYPE_CHECKING:
    from uuid import UUID


# What a caregiver is allowed to put in the bucket, and the extension each one is stored
# under. The map is the allowlist: a type that is not a key here is refused. The extension
# comes from the content type rather than the uploaded filename because the filename is
# the caregiver's and can claim anything.
ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    # iPhones in the field still hand out HEIC by default, and refusing it would look to a
    # caregiver like the app rejecting their camera roll for no reason.
    "image/heic": ".heic",
    "image/heif": ".heif",
}


@lru_cache(maxsize=1)
def _client():  # noqa: ANN202 — boto3 ships no usable return type without mypy-boto3.
    """The bucket client, built once. Credentials may be absent — that is an IAM role."""
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        region_name=settings.s3_region_name,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        # R2 and MinIO reject anything older, and it is what AWS signs with anyway. Left to
        # the default, a provider-specific fallback would only show up as a signature error
        # at upload time, in the browser, where it is hardest to read.
        config=Config(signature_version="s3v4"),
    )


def memories_bucket() -> str:
    """The configured memory bucket, or a 503 explaining that it is not set up."""
    if not settings.s3_memories_bucket:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Photo storage is not set up yet. Ask whoever runs the server.",
        )
    return settings.s3_memories_bucket


def check_content_type(content_type: str) -> str:
    """Validate an upload's content type and return the extension it is stored under."""
    extension = ALLOWED_CONTENT_TYPES.get(content_type.lower().strip())
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="That file is not a photo we can use. Try a JPEG, PNG or HEIC picture.",
        )
    return extension


def build_object_key(patient_id: UUID, asset_id: UUID, extension: str) -> str:
    """
    Where an object lives in the bucket.

    Built from ids and a validated extension, never from the uploaded filename: a caregiver's
    filename collides across patients, usually carries the patient's own name — which would
    then travel in every URL and log line naming the object (`AGENTS.md` §2.5) — and can hold
    characters that need escaping forever after. The caregiver's name for the picture is kept
    on the row instead, in `file_name`.
    """
    prefix = settings.s3_memories_prefix.strip("/")
    leader = f"{prefix}/" if prefix else ""
    return f"{leader}{patient_id}/{asset_id}{extension}"


def presign_put(object_key: str, content_type: str) -> str:
    """A short-lived URL the browser may PUT one object to."""
    return _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": memories_bucket(),
            "Key": object_key,
            # Signed in, so the browser must send exactly this header back. That is the
            # point: it stops a URL minted for a photo being reused to store something else.
            "ContentType": content_type,
        },
        ExpiresIn=settings.s3_presign_expiry_seconds,
    )


def view_url(object_key: str) -> str:
    """
    A URL that renders the object.

    A public base is used when one is configured; otherwise the URL is signed and expires.
    Signed is the default deliberately — these are photographs of a named person living with
    dementia, and a public object URL is an unauthenticated one that never expires.
    """
    if settings.s3_memories_public_base_url:
        base = settings.s3_memories_public_base_url.rstrip("/")
        return f"{base}/{object_key}"

    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": memories_bucket(), "Key": object_key},
        ExpiresIn=settings.s3_presign_expiry_seconds,
    )


async def head_object(object_key: str) -> tuple[str | None, int | None] | None:
    """
    The object's ETag and size, or `None` when it is not there.

    A real round trip to the bucket, so it runs on a worker thread rather than holding the
    event loop for the length of someone else's network.
    """

    def _head() -> tuple[str | None, int | None] | None:
        try:
            response = _client().head_object(Bucket=memories_bucket(), Key=object_key)
        except ClientError:
            # 404 and 403 both mean "we cannot confirm this landed", and the caller treats
            # them the same way. Nothing here distinguishes them for the caregiver.
            return None
        return response.get("ETag", "").strip('"') or None, response.get("ContentLength")

    return await anyio.to_thread.run_sync(_head)


async def delete_object(object_key: str) -> None:
    """Remove an object. Used to clean up an upload that turned out to be unacceptable."""

    def _delete() -> None:
        # Best effort. A leftover object is litter, not a failure worth showing anyone.
        with contextlib.suppress(ClientError):
            _client().delete_object(Bucket=memories_bucket(), Key=object_key)

    await anyio.to_thread.run_sync(_delete)


__all__ = [
    "ALLOWED_CONTENT_TYPES",
    "build_object_key",
    "check_content_type",
    "delete_object",
    "head_object",
    "memories_bucket",
    "presign_put",
    "view_url",
]
