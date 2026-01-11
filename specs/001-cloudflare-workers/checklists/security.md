# Security & Tenant Isolation Requirements Quality Checklist: Cloudflare Workers Hosting

**Purpose**: Unit tests for the written requirements around authentication/authorization, tenant isolation, secrets, and security operations for Workers-only hosting.
**Created**: 2026-01-11
**Feature**: [spec.md](../spec.md)

**Scope Note**: This checklist treats requirements in `spec.md`, `plan.md`, `tasks.md`, and `contracts/` as normative sources.

## Requirement Completeness

- [ ] CHK001 Are authentication requirements explicitly specified for Workers-hosted dashboard + API (supported auth methods, session mechanism, token auth), rather than assumed from current architecture? [Gap, Spec §FR-004, Spec §US2]
- [ ] CHK002 Are authorization requirements explicit about the policy source of truth (roles/permissions/scopes), including how they apply to API tokens and session users? [Gap, Spec §FR-004, Spec §FR-005]
- [ ] CHK003 Are tenant isolation requirements complete across all read/write paths (redirect resolution, click recording, link CRUD, analytics queries), not only “API operations”? [Completeness, Spec §FR-005, Spec §SC-005]
- [ ] CHK004 Are security requirements specified for request input validation (schemas, rejection behavior, error shape consistency) across both public and authenticated endpoints? [Completeness, Spec §FR-006, Plan §Gate 2]
- [ ] CHK005 Are requirements defined for secure secrets/config handling on Workers (where secrets live, rotation expectations, prohibited placements like build artifacts)? [Completeness, Spec §FR-013]
- [ ] CHK006 Are requirements defined for handling sensitive data in logs/telemetry (PII redaction, token/secret scrubbing, correlation IDs)? [Gap, Spec §FR-013]
- [ ] CHK007 Are security requirements defined for operational endpoints access control (who can call `/api/_internal/compat`, whether it must be protected, how)? [Gap, Contracts §/api/_internal/compat, Tasks §T019]
- [ ] CHK008 Are requirements defined for rate limiting and abuse prevention at the edge (limits, actor keys, responses), including security goals (protect redirects and auth endpoints)? [Gap, Spec §Edge Cases, Spec §FR-012]

## Requirement Clarity

- [ ] CHK009 Is “workspace isolation” defined precisely enough to be testable (what constitutes cross-workspace leakage; what identifiers must be used for filtering; what is prohibited)? [Ambiguity, Spec §FR-005]
- [ ] CHK010 Is the “workspace vs project” terminology mapping explicit and consistent across all security-relevant requirements and acceptance criteria? [Ambiguity, Tasks §Terminology, Spec §FR-005]
- [ ] CHK011 Are “user-friendly errors” requirements clear about what can/cannot be revealed (e.g., avoid account enumeration, avoid leaking existence of resources across workspaces)? [Ambiguity, Spec §FR-006]
- [ ] CHK012 Are “secure configuration” requirements explicit about minimum required bindings and validation behavior (fail-fast criteria, redaction, operator remediation guidance)? [Clarity, Spec §FR-013, Tasks §T007]

## Requirement Consistency

- [ ] CHK013 Do security requirements align with success criteria SC-005 (automated isolation verification), without leaving gaps where isolation is required but untested/undefined? [Consistency, Spec §SC-005, Spec §FR-005]
- [ ] CHK014 Are the Cloudflare-native replacements used consistently in security-sensitive flows (rate limiting via Durable Objects rather than Redis/Upstash), with no contradictory requirements elsewhere? [Consistency, Spec §FR-012, Plan §Summary, Tasks §T015, Tasks §T039, Tasks §T040]
- [ ] CHK015 Are operational endpoint requirements consistent between contracts and spec assumptions (e.g., compat endpoint “may be protected” vs “must be protected”)? [Conflict, Contracts §/api/_internal/compat]

## Acceptance Criteria Quality

- [ ] CHK016 Do US2 acceptance scenarios specify the minimum evidence that authorization is correct (e.g., forbidden access across workspaces) without relying on implicit code knowledge? [Measurability, Spec §US2]
- [ ] CHK017 Does SC-005 specify a representative set of operations/identities and what “zero cross-workspace access” means (read vs write vs inference), enabling objective verification? [Completeness, Spec §SC-005]
- [ ] CHK018 Do acceptance criteria explicitly define expected responses for unauthorized vs unauthenticated requests (status codes, error shapes), and are they consistent across endpoints? [Gap, Spec §FR-004, Spec §FR-006]

## Scenario Coverage

- [ ] CHK019 Are requirements specified for public redirect security scenarios (password-protected links, cloaked/proxy mode, open redirect protections), including what’s allowed and what’s blocked? [Gap, Spec §FR-002, Spec §Edge Cases]
- [ ] CHK020 Are requirements specified for token lifecycle security (creation, revocation, scope restrictions, storage format like hashed keys) suitable for Workers hosting? [Gap, Tasks §T038, Tasks §T035]
- [ ] CHK021 Are requirements specified for session security (cookie attributes, expiration, rotation) and how it behaves under Workers-only hosting constraints? [Gap, Spec §US2]
- [ ] CHK022 Are requirements specified for analytics access control (who can query click/conversion analytics; tenant scoping rules for analytics datasets)? [Gap, Spec §FR-003, Spec §FR-011, Spec §FR-005]

## Edge Case Coverage

- [ ] CHK023 Are requirements defined for brute-force/credential-stuffing defense signals and lockout behavior (and how operators observe it), rather than implied? [Gap, Tasks §T035]
- [ ] CHK024 Are requirements defined for partial failure and retry safety in rate limiting and dedupe Durable Objects (no bypass on errors; safe fallback behavior)? [Gap, Spec §FR-012, Spec §Edge Cases]
- [ ] CHK025 Are requirements defined for preventing information leaks in not-found/expired/disabled flows (do not reveal workspace membership or link existence beyond what’s intended)? [Gap, Spec §Edge Cases]

## Non-Functional Requirements

- [ ] CHK026 Are security requirements measurable (e.g., specific headers/cookie attributes, explicit redaction rules, explicit isolation invariants), rather than high-level “secure”? [Measurability, Spec §FR-013, Spec §FR-005]
- [ ] CHK027 Are compliance or audit expectations explicitly in/out of scope (audit logs, access logs retention), so operators know what they must implement externally? [Gap]

## Dependencies & Assumptions

- [ ] CHK028 Are security dependencies explicitly stated (e.g., Workers secrets, environment variable availability, Cloudflare Access as optional) and tied to the deployment path? [Dependency, Spec §FR-001, Spec §FR-013]

## Ambiguities & Conflicts

- [ ] CHK029 Is there a traceable mapping from security requirements → implementation tasks (e.g., Durable Object rate limiting tasks, D1 token queries) to avoid “requirements without delivery”? [Traceability, Tasks §T015, Tasks §T038, Tasks §T039, Tasks §T040]

## Notes

- Check items off as completed: `[x]`
- Add findings inline under each item
- This checklist tests the *requirements writing* (not implementation correctness)
