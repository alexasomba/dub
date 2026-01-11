# Observability & Ops Requirements Quality Checklist: Cloudflare Workers Hosting

**Purpose**: Unit tests for the written requirements around observability, operations, and troubleshooting for Workers-only hosting.
**Created**: 2026-01-11
**Feature**: [spec.md](../spec.md)

**Scope Note**: This checklist treats requirements in `spec.md`, `plan.md`, `tasks.md`, and `contracts/` as normative sources (per Q2=B).

## Requirement Completeness

- [x] CHK001 Are operator-facing operational endpoints explicitly required (health + compatibility), including intended audience and whether authentication is required in production? [Completeness, Contracts §/api/health, Contracts §/api/_internal/compat, Tasks §T018, Tasks §T019]
- [x] CHK002 Are minimum log events required for the redirect path defined (startup, redirect served, redirect failure, storage unavailable), rather than implied? [Gap, Spec §US1, Spec §Edge Cases]
- [x] CHK003 Are requirements defined for surfacing “unsupported runtime capability” failures with actionable diagnostics (what to log, how to detect automatically)? [Completeness, Spec §SC-004, Plan §Gate 4]
- [x] CHK004 Are requirements defined for environment/config validation behavior on boot (what is validated, error format, whether the process should refuse to serve traffic)? [Completeness, Spec §Edge Cases, Tasks §T007]
- [x] CHK005 Are requirements defined for operational visibility into Analytics Engine ingest (success/failure counters, sampling, dead-letter behavior if any)? [Gap, Spec §FR-003, Spec §FR-011]
- [x] CHK006 Are requirements defined for Durable Objects operational signals (rate limit triggers, dedupe/cache health, storage errors)? [Gap, Spec §FR-012]
- [x] CHK007 Are required runtime bindings and secrets enumerated with required/optional classification and minimum safe defaults? [Completeness, Spec §FR-013, Tasks §T003, Tasks §T012, Tasks §T017]

## Requirement Clarity

- [x] CHK008 Is “must fail fast with clear error messages” quantified into a concrete operator-facing contract (where the message appears, minimum fields, redaction requirements)? [Ambiguity, Spec §Edge Cases]
- [x] CHK009 Are log level expectations specified (e.g., debug/info/warn/error) and mapped to scenarios (boot, request handling, dependency failure)? [Gap]
- [x] CHK010 Are requirements clear about where operational signals live in Workers (logs vs Analytics Engine datasets vs other), to avoid ambiguity for operators? [Clarity, Spec §FR-001, Spec §FR-011]
- [x] CHK011 Is “actionable errors” defined with examples of required context (request id, workspace/project id redaction rules, dependency name, remediation hint)? [Ambiguity, Spec §Edge Cases]
- [x] CHK012 Are requirements clear about health endpoint semantics: what “healthy” means (e.g., process alive only vs dependency checks) and expected stability? [Clarity, Contracts §/api/health]

## Requirement Consistency

- [x] CHK013 Do the operational endpoint contracts align with the spec’s success criteria and edge-case requirements (e.g., SC-004 automated validation depends on endpoints being stable and reliable)? [Consistency, Spec §SC-004, Contracts §/api/health, Contracts §/api/_internal/compat]
- [x] CHK014 Are requirements consistent about “Workers-only” deployment surfaces (no Pages), including where operators should look for logs/metrics and how to access them? [Consistency, Spec §Clarifications, Spec §Assumptions]
- [x] CHK015 Do requirements for compatibility matrix content align across spec and plan/tasks (what integrations must appear, what statuses are allowed, and minimum operator guidance)? [Consistency, Spec §FR-009, Tasks §T020]

## Acceptance Criteria Quality

- [x] CHK016 Do acceptance scenarios explicitly include an operator troubleshooting path for failed startup due to missing/invalid config (expected error surface and next action)? [Gap, Spec §US1, Spec §Edge Cases]
- [x] CHK017 Does SC-004 define the observable evidence of “zero runtime failures caused by unsupported capabilities” (log signature, endpoint response, or validation report), not just the outcome? [Measurability, Spec §SC-004]
- [x] CHK018 Does SC-001 require that the “under 30 minutes” deployment path includes verification steps that prove observability is in place (e.g., health endpoint reachable, compat endpoint accessible, logs visible)? [Gap, Spec §SC-001, Spec §FR-001]

## Scenario Coverage

- [x] CHK019 Are requirements specified for normal operation monitoring: what operators should watch during steady state (redirect error rate, D1 errors, DO rate limit triggers)? [Gap]
- [x] CHK020 Are requirements specified for incident scenarios: D1 outage, Analytics Engine ingest failure, Durable Object unavailability, and partial degradation, including what operators should observe and what the system should surface? [Coverage, Spec §Edge Cases, Spec §FR-010, Spec §FR-011, Spec §FR-012]
- [x] CHK021 Are requirements specified for regression detection when replacing dependencies (compatibility matrix changes, alerts on accidental Prisma/Upstash/Tinybird runtime usage)? [Gap, Spec §FR-007, Spec §FR-009]

## Edge Case Coverage

- [x] CHK022 Are requirements defined for rate limiting observability (how operators know limits are triggering, minimum headers or log markers, and whether user messaging is standardized)? [Gap, Spec §Edge Cases]
- [x] CHK023 Are requirements defined for platform limit breaches (execution time, payload, concurrency) that include both user-facing responses and operator-facing diagnostics? [Completeness, Spec §Edge Cases]
- [x] CHK024 Are requirements defined for regional consistency anomalies that include operator guidance (how to identify, how to mitigate, expected eventual consistency bounds)? [Ambiguity, Spec §Edge Cases]

## Non-Functional Requirements

- [x] CHK025 Are security requirements defined for logs/telemetry (PII redaction, token/secret scrubbing, and safe defaults)? [Gap, Spec §FR-013]
- [x] CHK026 Are retention requirements specified for operational signals (how long logs/analytics should be kept, what is required vs recommended)? [Gap]
- [x] CHK027 Are performance/overhead requirements specified for observability (e.g., click tracking/logging must not materially degrade redirect latency), with measurable thresholds? [Gap, Spec §US1, Spec §SC-002]

## Dependencies & Assumptions

- [x] CHK028 Are dependencies required for observability explicitly listed (Cloudflare logging availability, Analytics Engine dataset access) and tied to the operator workflow? [Dependency, Spec §FR-001, Spec §FR-011]

## Ambiguities & Conflicts

- [x] CHK029 Is there a traceable mapping from operational endpoint contracts → success criteria → tasks (e.g., /api/health and /api/_internal/compat support SC-004 validation), or is traceability missing? [Traceability, Spec §SC-004, Contracts §/api/health, Contracts §/api/_internal/compat, Tasks §T018, Tasks §T019]

## Notes

- Check items off as completed: `[x]`
- Add findings inline under each item
- This checklist tests the *requirements writing* (not implementation correctness)
