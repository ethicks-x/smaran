## 2023-10-27 - Clerk API N+1 Optimization
**Learning:** Resolving external APIs (like Clerk) inside lists (e.g., getting avatars/names for a feed of events) causes massive N+1 network requests latency.
**Action:** Always wrap single-item external identity lookups with a short-lived in-memory LRU cache to drastically speed up list/feed generation endpoints.

## 2024-05-18 - Dashboard Summary DB Aggregation
**Learning:** Fetching all objects (like SessionEvent rows) strictly to do sums or averages in application memory for aggregate dashboard screens can be a critical bottleneck for users with a large history.
**Action:** Use database aggregations like `func.count`, `func.sum`, and `func.max` directly in SQLAlchemy to move expensive computation to the database level, ensuring O(1) performance instead of O(N) fetch complexity.
