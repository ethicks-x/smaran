## 2023-10-27 - Clerk API N+1 Optimization
**Learning:** Resolving external APIs (like Clerk) inside lists (e.g., getting avatars/names for a feed of events) causes massive N+1 network requests latency.
**Action:** Always wrap single-item external identity lookups with a short-lived in-memory LRU cache to drastically speed up list/feed generation endpoints.
## 2024-05-19 - N+1 Memory Inefficiency on Dashboard Overview
**Learning:** The caregiver dashboard calculates accuracy and session statistics by querying `SessionEvent` and `QuestionEvent` models. It previously did this by fully loading all objects for a patient into application memory using `(await session.scalars(...)).all()` and iterating over them in Python. For a patient with many daily interactions, this leads to an O(N) memory leak and significant database transfer overhead when calculating summary cards for multiple patients.
**Action:** When aggregating metrics (like count, sum, avg) on historical events, push the calculation to the database layer using `select(func.count(), func.sum(), ...)` instead of fetching objects to Python.
## 2024-05-19 - Pagination Before Memory
**Learning:** Fetching all rows for a feed before applying pagination in Python causes O(N) memory usage and massive database transfer overhead.
**Action:** Always push `limit` down to the SQL query when building paginated endpoints. Use `SELECT COUNT(*)` to calculate the total if needed.
## 2024-11-20 - Dashboard Batching Optimization
**Learning:** `_compute_patient_card` executed 3 SQL aggregates per patient. When a caregiver had 10 patients, rendering the dashboard caused 30 sequential N+1 queries due to the loop over patients and the `AsyncSession` lock on `.gather`.
**Action:** Introduced `_compute_patient_cards` which pre-fetches all stats for the given patients via `GROUP BY patient_id` across the `SessionEvent`, `GameSession`, and `QuestionEvent` tables, reducing dashboard loading to O(1) database queries (approx 4 total queries).
