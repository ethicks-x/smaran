## 2026-09-11 - Cached Clerk Backend API Client User Resolution
**Learning:** The Python API was making sequential external HTTP requests to the Clerk backend API for resolving user profiles (names and avatars) multiple times for the same user per dashboard view, creating a significant latency bottleneck.
**Action:** Add in-memory TTL caching with bounded dictionary eviction and negative-cache avoidance to external API resolution methods.
