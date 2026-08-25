from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ItemCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    description: str | None = None
    price: float = Field(..., gt=0)


class ItemResponse(ItemCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
