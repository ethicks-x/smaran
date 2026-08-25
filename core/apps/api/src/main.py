from datetime import datetime

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from src.schemas import HealthResponse, ItemCreate, ItemResponse


app = FastAPI(
    title="Core API",
    version="0.1.0",
    description="Backend services for Web and Mobile",
)

# Allow local frontends to call the API directly in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for quick validation
_MOCK_ITEMS: list[dict] = [
    {
        "id": 1,
        "title": "Initial Setup Item",
        "description": "Monorepo validation item",
        "price": 49.99,
        "created_at": datetime.utcnow(),
    }
]


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def check_health():
    return HealthResponse()


@app.get("/items", response_model=list[ItemResponse], tags=["Items"])
async def list_items():
    return _MOCK_ITEMS


@app.post(
    "/items",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Items"],
)
async def create_item(payload: ItemCreate):
    new_item = {
        "id": len(_MOCK_ITEMS) + 1,
        "title": payload.title,
        "description": payload.description,
        "price": payload.price,
        "created_at": datetime.utcnow(),
    }
    _MOCK_ITEMS.append(new_item)
    return new_item


@app.get("/items/{item_id}", response_model=ItemResponse, tags=["Items"])
async def get_item(item_id: int):
    item = next((i for i in _MOCK_ITEMS if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
