# API, Contracts & Compatibility Matrix Requirements Quality Checklist: Cloudflare Workers Hosting

**Purpose**: Unit tests for the written requirements around API contracts, error shapes, versioning/compatibility signaling, and the operator-facing compatibility matrix for Workers-only hosting.
**Created**: 2026-01-11
**Feature**: [spec.md](../spec.md)

**Scope Note**: This checklist treats requirements in `spec.md`, `plan.md`, `tasks.md`, and `contracts/` as normative sources.

## Requirement Completeness

- [ ] CHK001 Are the minimum API surfaces required for the Workers deployment explicitly enumerated (operational endpoints + minimum authenticated link CRUD endpoints for US2)? [Completeness, Spec §US2, Tasks §T018, Tasks §T019, Tasks §T041]
- [ ] CHK002 Are the operational endpoints required for automated validation explicitly specified as requirements (not only as tasks), including when they must be available (preview vs deployed)? [Gap, Spec §SC-004, Contracts §/api/health, Contracts §/api/_internal/compat]
- [ ] CHK003 Are request/response schemas specified (or referenced) for the key endpoints required by acceptance scenarios (sign-in, create link, list links, redirect behavior)? [Gap, Spec §US1, Spec §US2]
- [ ] CHK004 Are error response format requirements defined for both public and authenticated endpoints (shape, codes, localization expectations, correlation ids)? [Gap, Spec §FR-006]
- [ ] CHK005 Are requirements specified for API authentication mechanisms (session cookie vs bearer token) and where each is allowed/required? [Completeness, Spec §FR-004]
- [ ] CHK006 Are requirements specified for authorization semantics (workspace scoping, permissions/scopes) in the API contract itself (not only implementation middleware)? [Gap, Spec §FR-005]
- [ ] CHK007 Are requirements complete for the operator-facing compatibility matrix content (which integrations must appear; what fields are required; how status is represented)? [Completeness, Spec §FR-009, Tasks §T020]

## Requirement Clarity

- [ ] CHK008 Is the phrase “response matches the documented contract” backed by an explicit contract source (OpenAPI location, versioning), or is the contract location ambiguous? [Ambiguity, Spec §US2, Contracts §workers-hosting.openapi.yaml]
- [ ] CHK009 Are requirements clear about whether `/api/_internal/compat` is public, authenticated, or operator-only, and how it should be protected? [Ambiguity, Contracts §/api/_internal/compat]
- [ ] CHK010 Are requirements clear about what the health endpoint represents (process health only vs dependency checks) and whether it may include runtime metadata? [Clarity, Contracts §/api/health]
- [ ] CHK011 Are “user-friendly errors” requirements clear about what can/cannot be returned to prevent information leakage (resource existence, workspace membership)? [Clarity, Spec §FR-006]

## Requirement Consistency

- [ ] CHK012 Are API requirements consistent with Workers-only constraints (no Node-only APIs, bindings-based configuration) without implying platform-incompatible behaviors? [Consistency, Spec §FR-007, Plan §Gate 4]
- [ ] CHK013 Are requirements consistent about multi-tenant isolation for “representative API operations” (SC-005) and the API surfaces used by US2 acceptance scenarios? [Consistency, Spec §SC-005, Spec §US2]
- [ ] CHK014 Are compatibility matrix requirements consistent with the declared replacements (D1/WAE/DO) and do they avoid conflicting support claims? [Consistency, Spec §FR-008, Spec §FR-010, Spec §FR-011, Spec §FR-012]

## Acceptance Criteria Quality

- [ ] CHK015 Do acceptance scenarios define measurable criteria for contract correctness (specific fields/status codes), rather than only “matches contract”? [Gap, Spec §US2]
- [ ] CHK016 Does SC-004 define what automated deployment validation asserts via APIs (e.g., health + compat reachable; compat reports no unsupported runtime usage), enabling objective verification? [Measurability, Spec §SC-004, Contracts §/api/health, Contracts §/api/_internal/compat]

## Scenario Coverage

- [ ] CHK017 Are requirements specified for unauthorized/unauthenticated API requests (status codes, error shapes) for the endpoints in US2 and in SC-005 tests? [Coverage, Spec §FR-004, Spec §FR-006]
- [ ] CHK018 Are requirements specified for rate limiting semantics and how they are communicated at the API level (headers, error codes, consistency across endpoints)? [Gap, Spec §Edge Cases]
- [ ] CHK019 Are requirements specified for versioning/backwards compatibility signaling for contracts (OpenAPI versioning strategy; compatibility matrix versioning)? [Gap, Spec §FR-009]

## Edge Case Coverage

- [ ] CHK020 Are requirements specified for partial failure cases that impact API responses (D1 unavailable, analytics ingestion failure) including whether errors should be surfaced or suppressed per endpoint? [Coverage, Spec §Edge Cases]
- [ ] CHK021 Are requirements specified for payload/platform limit exceedance behaviors for API endpoints (payload too large, timeouts), including response semantics and operator diagnostics? [Completeness, Spec §Edge Cases]

## Non-Functional Requirements

- [ ] CHK022 Are security requirements specified for API transport and cookies (secure flags, same-site policy) and any required security headers? [Gap, Spec §FR-013]
- [ ] CHK023 Are observability requirements specified for API request tracing (request IDs, correlation across redirect→event) that make operational debugging feasible? [Gap, Spec §FR-001]

## Dependencies & Assumptions

- [ ] CHK024 Are dependencies for contract validation explicitly defined (e.g., tests/workflows that validate OpenAPI conformance), or is conformance assumed without a gate? [Gap, Tasks §T054]

## Ambiguities & Conflicts

- [ ] CHK025 Is there traceability from contract requirements → contract artifact(s) → implementation tasks, especially for operational endpoints required for validation? [Traceability, Contracts §workers-hosting.openapi.yaml, Tasks §T018, Tasks §T019]

## Notes

- Check items off as completed: `[x]`
- Add findings inline under each item
- This checklist tests the *requirements writing* (not implementation correctness)
