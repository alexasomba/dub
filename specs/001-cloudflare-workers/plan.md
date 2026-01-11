# Implementation Plan: Cloudflare Workers Hosting

**Branch**: `001-cloudflare-workers` | **Date**: 2026-01-11 | **Spec**: `specs/001-cloudflare-workers/spec.md`
**Input**: Feature specification from `specs/001-cloudflare-workers/spec.md`

**Note**: This plan is derived from the project constitution in `.specify/memory/constitution.md` and the research in `specs/001-cloudflare-workers/research.md`.

## Summary

Deploy the existing Next.js 15 app (Dub) to **Cloudflare Workers-only** using Cloudflare’s recommended approach: **OpenNext adapter** (`@opennextjs/cloudflare`) + **Wrangler** + **Workers Assets**.

Replace non-Workers-compatible infrastructure with Cloudflare-native services:

- PlanetScale/MySQL + Prisma → **Cloudflare D1** (authoritative database) using Workers-compatible SQL access.
- Tinybird → **Workers Analytics Engine** (click/conversion analytics).
- Upstash Redis → **Durable Objects** (rate limiting + strongly consistent cache state).

Phase-0 research and concrete build/deploy notes live in [specs/001-cloudflare-workers/research.md](specs/001-cloudflare-workers/research.md).

## Technical Context

**Language/Version**: TypeScript / Next.js 15 (Workers runtime with `nodejs_compat`)  \
**Primary Dependencies**:
- Next.js 15 (existing)
- `@opennextjs/cloudflare` (OpenNext adapter)
- `wrangler` (deploy/preview/typegen)
- Zod + existing request parsing utilities
- Workers-compatible SQL layer for D1 (Drizzle preferred; raw D1 acceptable)

**Storage**:
- Cloudflare D1 (authoritative relational database)
- Workers Analytics Engine (click/conversion events)
- Durable Objects (rate limiting + atomic counters + hot caches)

**Testing**:
- Vitest (existing)
- Workers-runtime preview via `opennextjs-cloudflare preview`
- Integration tests using Wrangler/workerd harness (target: redirects + auth + workspace isolation)

**Target Platform**: Cloudflare Workers + Workers Assets (no Pages)
**Project Type**: Next.js monorepo (`apps/web/`)
**Performance Goals**: Preserve redirect performance; minimize cold starts and bundle size
**Constraints**: Workers runtime limitations; Next middleware/image optimization constraints; Worker size limits
**Scale/Scope**: Whole Dub web app (redirects + dashboard + API)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate 1 — Multi-tenant isolation & data safety (Principle I)
- D1 tables that store tenant-owned data include `workspace_id` / `project_id`.
- Every query path filters by `workspace_id` / `project_id`.

### Gate 2 — Validated input & type safety (Principle III)
- All external inputs validated with Zod before use.
- All SQL parameterized (no string interpolation).

### Gate 3 — Auth middleware enforcement (Principle IV)
- API routes remain protected via `withWorkspace()` / `withSession()`.

### Gate 4 — Edge/runtime compatibility (Principle V)
- No Prisma client usage in Workers runtime.
- Prefer Web APIs and Cloudflare bindings (D1, Analytics Engine, DO).

### Gate 5 — Testing discipline (Principle VI)
- Add Workers-runtime integration tests for core redirect flow and workspace isolation.

### Gate 6 — Standardized error handling (Principle VII)
- Keep `DubApiError` shapes/codes consistent.

Status: PASS (no planned violations; see Complexity Tracking if implementation uncovers exceptions).

## Project Structure

### Documentation (this feature)

```text
specs/001-cloudflare-workers/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
└── web/                         # Next.js 15 app (dashboard, API routes, redirect handling)
  ├── app/
  ├── middleware.ts
  ├── vitest.config.ts
  ├── open-next.config.ts      # (planned) OpenNext Cloudflare adapter config
  ├── wrangler.jsonc            # (planned) Workers deployment config + bindings
  └── worker-configuration.d.ts      # (planned) generated binding types

packages/
├── prisma/                      # Existing Prisma schema reference (source-of-truth model)
├── utils/
├── ui/
└── ...

.specify/
specs/
```

**Structure Decision**: Keep the existing monorepo layout; add Workers deployment artifacts/configuration to `apps/web/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No constitution violations are planned for this feature. | N/A |
