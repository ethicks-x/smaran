## 2023-10-27 - Clerk API N+1 Optimization
**Learning:** Resolving external APIs (like Clerk) inside lists (e.g., getting avatars/names for a feed of events) causes massive N+1 network requests latency.
**Action:** Always wrap single-item external identity lookups with a short-lived in-memory LRU cache to drastically speed up list/feed generation endpoints.
## 2024-05-19 - N+1 Memory Inefficiency on Dashboard Overview
**Learning:** The caregiver dashboard calculates accuracy and session statistics by querying `SessionEvent` and `QuestionEvent` models. It previously did this by fully loading all objects for a patient into application memory using `(await session.scalars(...)).all()` and iterating over them in Python. For a patient with many daily interactions, this leads to an O(N) memory leak and significant database transfer overhead when calculating summary cards for multiple patients.
**Action:** When aggregating metrics (like count, sum, avg) on historical events, push the calculation to the database layer using `select(func.count(), func.sum(), ...)` instead of fetching objects to Python.
