# Technical Requirement Document (TRD): Time-Off Microservice

# Technical Requirement Document (TRD): Time-Off Microservice
**GitHub Repository:** https://github.com/YaHyA-MaTeeN/example-hr-time-off-service.git

## 1. Introduction & Product Context
[cite_start]ExampleHR features a module that serves as the primary interface for employees to request time off[cite: 3]. [cite_start]However, the external Human Capital Management (HCM) system remains the absolute "Source of Truth" for all employment data, including leave balances[cite: 4]. 

[cite_start]**The Core Problem:** We must keep balances synchronized between ExampleHR and the HCM[cite: 5]. [cite_start]The system must account for independent balance changes in the HCM (such as a work anniversary bonus or start-of-year refresh) [cite: 6, 13, 14, 15] [cite_start]while ensuring that ExampleHR provides instant, accurate feedback to the Employee and valid data for Manager approvals[cite: 8, 9].

## 2. Architecture & Synchronization Strategy
[cite_start]To balance the employee's need for instant feedback [cite: 8] [cite_start]with the system's need for absolute data integrity [cite: 11][cite_start], this microservice will implement a **Hybrid Synchronization Architecture** using NestJS and SQLite[cite: 34].

### Proposed Solution: Local Cache with Real-Time Verification
* [cite_start]**Read Operations (Instant Feedback):** We will maintain a local cache of time-off balances (partitioned per-employee, per-location) [cite: 35] within the SQLite database. Dashboard queries will read directly from this local cache, ensuring sub-millisecond response times.
* [cite_start]**Write Operations (Real-Time Verification):** When a time-off request is submitted, the microservice will pause, query the HCM's real-time API [cite: 16] to verify the balance is still sufficient, and only then deduct the balance locally and commit the request.
* [cite_start]**Batch Reconciliation:** The microservice will expose a webhook/endpoint to ingest the HCM's batch corpus of balances[cite: 17, 18]. A nightly CRON job will process this batch, reconciling the local SQLite cache against the HCM's source of truth to capture out-of-band updates like work anniversaries.

### Alternatives Considered
* **Strict Real-Time Passthrough:** Fetching the balance from the HCM on every dashboard load. *Rejected* because it introduces high latency and creates a single point of failure; if the HCM API experiences downtime, ExampleHR becomes unusable.
* **Pure Batch Synchronization:** Relying entirely on the nightly batch update. *Rejected* because if an employee receives a bonus day at noon, ExampleHR would block them from using it until the following day, violating the user need for accurate, up-to-date feedback.

## 3. API & System Design
The NestJS backend will expose the following REST endpoints:

* **`GET /api/v1/balances/:locationId/:employeeId`**
  * **Purpose:** Retrieves the current balance from the local SQLite cache.
* **`POST /api/v1/requests`**
  * **Purpose:** Submits a time-off request.
  * **Flow:** Validates local balance -> Locks database row -> Verifies with HCM Real-Time API -> Updates HCM -> Updates SQLite -> Releases lock.
* **`POST /api/v1/hcm-sync/batch`**
  * **Purpose:** Ingests the batch payload from the HCM to overwrite and reconcile local SQLite balances.

## 4. Challenges & Defensive Programming
[cite_start]The system must be highly defensive against external failures and internal race conditions[cite: 20].

* **Challenge 1: HCM Silent Failures**
  * [cite_start]*Context:* The HCM is not guaranteed to return an error if a request is filed against an insufficient balance[cite: 19].
  * *Mitigation:* We will implement strict pre-validation. The microservice will calculate the required deduction locally. If the local cache indicates insufficient funds, the request is actively blocked by ExampleHR and a `400 Bad Request` is returned before any call is made to the HCM.
* **Challenge 2: Concurrency and Race Conditions**
  * *Context:* An employee could attempt to submit multiple requests simultaneously across different tabs, potentially bypassing balance limits before the external HCM updates.
  * *Mitigation:* We will utilize TypeORM's transaction management and Row-Level Locking (Pessimistic Read/Write locks). When a leave request is initiated, the specific employee's balance row in SQLite is locked until the transaction successfully commits or rolls back.

## 5. Testing Strategy
[cite_start]Given the use of Agentic Development, the robustness of the test suite is paramount to guard against regressions[cite: 25, 26]. 

* **Unit Testing (Jest):** Focus on pure business logic. We will test the balance deduction algorithms, ensuring edge cases (like negative balances or zero-day requests) throw appropriate internal exceptions.
* [cite_start]**Integration Testing:** We will develop a mock HCM Node.js server [cite: 33] that simulates the real-time API and batch endpoints. Integration tests will verify the entire lifecycle: testing that our NestJS service correctly calls the mock HCM, handles simulated 500 errors gracefully, and accurately updates the SQLite cache.