## 2023-10-27 - Clerk API N+1 Optimization
**Learning:** Resolving external APIs (like Clerk) inside lists (e.g., getting avatars/names for a feed of events) causes massive N+1 network requests latency.
**Action:** Always wrap single-item external identity lookups with a short-lived in-memory LRU cache to drastically speed up list/feed generation endpoints.

## 2024-05-18 - AsyncSession Concurrency Anti-Pattern
**Learning:** `asyncio.gather` on the same `AsyncSession` object will raise "asynchronous operation is already in progress".
**Action:** Do not try to parallelize database queries on a single SQLAlchemy session object in this architecture. Execute queries sequentially, or obtain multiple sessions for parallel work.
