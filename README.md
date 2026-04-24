# ExampleHR: Time-Off Microservice

This repository contains the backend implementation for the ExampleHR Time-Off Microservice. The system is designed to manage employee leave requests while maintaining strict eventual consistency with a simulated external Human Capital Management (HCM) system serving as the Source of Truth.

## Engineering & Architectural Decisions

Drawing heavily from enterprise application development principles (specifically strict MVC patterns) and parallel computing concepts, this microservice was architected with the following priorities:

* **Strict Separation of Concerns:** Built using NestJS, the architecture isolates routing (Controllers), business logic (Services), and data access (TypeORM Repositories).
* **Defensive Programming & Validation:** Incoming HTTP requests are intercepted by global validation pipes and Data Transfer Objects (DTOs). This ensures no malformed data or negative balance requests ever reach the database or the external HCM network layer.
* **Concurrency & Race Condition Mitigation:** To prevent users from bypassing balance limits through rapid parallel requests, the system utilizes TypeORM QueryRunner to execute strict database transactions. Read/write locks ensure balance integrity is maintained even under simulated concurrent loads.

## System Components
1. **Time-Off Service:** The core API serving instantaneous dashboard reads from a local SQLite cache, processing transactional leave requests, and ingesting nightly batch synchronizations.
2. **Mock HCM Module:** A fully integrated simulated external API (/external-hcm-api/verify-time-off) to accurately test network communication and failure states without relying on third-party uptime.

## Setup & Execution

### Prerequisites
* Node.js (v20+ recommended)
* npm

### Installation
1. Clone the repository: `git clone https://github.com/YaHyA-MaTeeN/example-hr-time-off-service.git`
2. Navigate to the project root: `cd example-hr-time-off-service`
3. Install dependencies: `npm install`

### Running the Application
To start the microservice with SQLite auto-configured:
`npm run start:dev`
*The server will initialize on http://localhost:3000.*

### Running the Test Suite
The value of this implementation lies in its rigorous defensive testing. To execute the Unit Tests and view the coverage matrix:
`npm run test:cov`

## Test Cases & Proof of Coverage

The value of this microservice lies in its defensive programming. The test suite (time-off.service.spec.ts) rigorously tests the following scenarios:

1. **Insufficient Balance Prevention:** Validates that requests exceeding the available balance are immediately rejected with a 400 Bad Request before any external network calls are made.
2. **Successful Verification & Deduction:** Ensures that valid requests successfully hit the mock HCM, deduct the exact mathematical balance, and safely commit the database transaction.
3. **External HCM Rejection / Network Failure:** Simulates a scenario where the user has enough days, but the external Source of Truth (HCM) rejects the payload. Proves that the system catches the failure and rolls back the entire database transaction to prevent corrupted balances.
4. **Concurrent Race Conditions:** Fires multiple leave requests at the exact same millisecond (simulating a user spam-clicking the submit button across multiple tabs). Proves that the service explicitly requests separate, isolated transaction locks for each request, making it mathematically impossible to bypass balance limits.

### Coverage Report
Below is the generated Jest coverage summary:

| File                          | % Stmts | % Branch | % Funcs | % Lines |
|-------------------------------|---------|----------|---------|---------|
| **All files** | **62.16**| **70.58**| **44.44**| **61.76**|
| mock-hcm/mock-hcm.controller.ts| 100     | 100      | 100     | 100     |
| time-off/time-off.controller.ts| 100     | 100      | 100     | 100     |
| time-off/time-off.service.ts   | 95      | 75       | 100     | 93.75   |

*Test Suites: 4 passed, 4 total*
*Tests: 8 passed, 8 total*