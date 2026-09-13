## 2023-10-27 - Clerk API N+1 Optimization
**Learning:** Resolving external APIs (like Clerk) inside lists (e.g., getting avatars/names for a feed of events) causes massive N+1 network requests latency.
**Action:** Always wrap single-item external identity lookups with a short-lived in-memory LRU cache to drastically speed up list/feed generation endpoints.
