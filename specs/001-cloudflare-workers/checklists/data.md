# Data, Migrations & Durability Requirements Quality Checklist: Cloudflare Workers Hosting

**Purpose**: Unit tests for the written requirements around D1 schema, migrations, durability/backup, and data consistency for Workers-only hosting.
**Created**: 2026-01-11
**Feature**: [spec.md](../spec.md)

**Scope Note**: This checklist treats requirements in `spec.md`, `plan.md`, `tasks.md`, and `contracts/` as normative sources.

## Requirement Completeness

- [x] CHK001 Are requirements explicit about the authoritative data store boundaries for Workers-only hosting (what MUST live in D1 vs what MUST live outside D1 like Analytics Engine / Durable Objects)? [Completeness, Spec §FR-010, Spec §FR-011, Spec §FR-012]
- [x] CHK002 Are requirements complete for the minimal data model needed to satisfy US1 redirects (required entities + required fields + uniqueness/invariants), not only “D1 is primary DB”? [Gap, Spec §US1, Spec §FR-010, Tasks §T011]
- [x] CHK003 Are requirements defined for schema evolution/migrations (how migrations are applied, ordering, environments, and operator responsibilities)? [Completeness, Tasks §T010, Tasks §T012]
- [x] CHK004 Are requirements defined for rollback/recovery when a migration fails (what “rollback” means for D1, who triggers it, and acceptable recovery procedures)? [Gap]
- [x] CHK005 Are requirements defined for backup/restore expectations for D1 (RPO/RTO targets or explicit out-of-scope statement)? [Gap, Spec §FR-010]
- [x] CHK006 Are requirements defined for data retention and deletion where relevant (sessions, tokens, analytics pointers), or explicitly out of scope? [Gap, Tasks §T035]
- [x] CHK007 Are requirements defined for unique constraints and indexing guarantees for core queries (redirect lookup, link listing) with explicit rationale? [Completeness, Tasks §T011, Tasks §T036]

## Requirement Clarity

- [x] CHK008 Are tenant isolation requirements expressed as concrete data invariants at the storage layer (e.g., “every tenant-owned row includes `project_id`; queries MUST filter by it”), not only as general policy? [Clarity, Plan §Gate 1, Spec §FR-005, Tasks §Terminology]
- [x] CHK009 Are requirements clear about identifier types and formats in D1 (IDs, slugs, timestamps, JSON-as-text), and are they consistent across migrations? [Clarity, Tasks §T010]
- [x] CHK010 Are requirements clear about read-after-write expectations and consistency bounds for D1 (especially for “create link → immediate redirect”)? [Ambiguity, Spec §US2, Spec §Edge Cases]
- [x] CHK011 Are requirements clear about how counters are maintained (atomicity, correctness under concurrency) for click counts and what level of accuracy is required? [Gap, Tasks §T027]

## Requirement Consistency

- [x] CHK012 Do the migration tasks for core tables (`projects`, `domains`, `links`) align with the terminology and tenant isolation requirements (“workspace” vs `projects`, `project_id` usage)? [Consistency, Tasks §T011, Tasks §Terminology, Spec §FR-005]
- [x] CHK013 Are requirements consistent about where “source of truth” lives for analytics-adjacent data (counters in D1 vs events in Analytics Engine) without contradictory assumptions? [Consistency, Spec §FR-003, Spec §FR-010, Spec §FR-011, Tasks §T027, Tasks §T028]
- [x] CHK014 Are requirements consistent about avoiding Prisma in Workers runtime while still using Prisma schema as reference for D1 migrations (and is that relationship documented)? [Consistency, Plan §Gate 4, Tasks §T035, Tasks §T036]

## Acceptance Criteria Quality

- [x] CHK015 Do acceptance criteria specify objective evidence that persisted state is correct in Workers hosting (e.g., link created persists and resolves; session persists with defined expiration behavior)? [Measurability, Spec §US2]
- [x] CHK016 Does SC-005 (tenant isolation) include storage-layer expectations that make isolation objectively testable (not just API behavior)? [Gap, Spec §SC-005, Spec §FR-005]

## Scenario Coverage

- [x] CHK017 Are requirements specified for “database temporarily unavailable” scenarios with explicit data consistency expectations (what operations must fail vs degrade, what’s cached, what’s retried)? [Coverage, Spec §Edge Cases]
- [x] CHK018 Are requirements specified for data migration coverage across US1→US2 expansion (core redirect tables → auth/membership/tokens → full link fields), including which are MVP blockers? [Gap, Tasks §T011, Tasks §T035, Tasks §T036]
- [x] CHK019 Are requirements specified for preventing cross-tenant data inference via unique keys (e.g., domain+key collisions, short_link uniqueness) and expected error messaging? [Gap, Tasks §T011, Spec §FR-006]

## Edge Case Coverage

- [x] CHK020 Are requirements defined for timestamp semantics (timezone, precision) and triggers (`updated_at`) such that behavior is unambiguous? [Gap, Tasks §T010]
- [x] CHK021 Are requirements defined for handling orphaned references and referential integrity expectations (foreign keys on/off; cascading behaviors)? [Gap, Tasks §T011]
- [x] CHK022 Are requirements defined for large-row fields (OG metadata, JSON targeting) and what limits/validation apply? [Gap, Tasks §T036, Spec §FR-006]

## Non-Functional Requirements

- [x] CHK023 Are performance-related data requirements specified (indexes required, query patterns allowed, max acceptable query cost) for the redirect query and core list queries? [Gap, Spec §US1, Tasks §T023, Tasks §T036]
- [x] CHK024 Are security requirements specified for data at rest and sensitive columns (password hashes, token hashes) in D1, including hashing algorithms and storage constraints? [Gap, Tasks §T035]

## Dependencies & Assumptions

- [x] CHK025 Are assumptions about D1 operational characteristics explicitly documented (limits, replication/consistency model, backup strategy), and are they tied to acceptance criteria? [Assumption, Spec §Assumptions]

## Ambiguities & Conflicts

- [x] CHK026 Is there traceability from data requirements (schema/invariants) → migration tasks → isolation/performance validations, or are there “implicit” requirements not represented in tasks? [Traceability, Tasks §T011, Tasks §T035, Tasks §T036, Tasks §T053]

## Notes

- Check items off as completed: `[x]`
- Add findings inline under each item
- This checklist tests the *requirements writing* (not implementation correctness)
