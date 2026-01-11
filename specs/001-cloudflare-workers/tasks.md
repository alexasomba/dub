# Tasks: Cloudflare Workers Hosting

**Input**: Design documents from `specs/001-cloudflare-workers/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), plus `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required for this feature (see `spec.md` SC-004/SC-005 and Constitution Principle VI). Tasks include Workers-focused automated validation plus the existing “Independent Test” manual checks.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

**Terminology**: “Workspace” in product docs maps to the Prisma `Project` model; D1 schema uses `projects` + `project_id` and all queries MUST enforce tenant isolation via `project_id`.

## Format: `[ID] [P?] [Story] Description with file path`

- **`[P]`**: Can run in parallel (different files, no dependencies)
- **`[Story]`**: User story label for traceability (`[US1]`, `[US2]`, `[US3]`)
- All tasks include exact file paths in the description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the Workers/OpenNext build+deploy scaffolding to the existing Next.js app.

- [ ] T001 Add OpenNext + Wrangler dependencies in apps/web/package.json
- [ ] T002 [P] Add OpenNext config in apps/web/open-next.config.ts
- [ ] T003 [P] Add Workers deployment config in apps/web/wrangler.toml (bindings placeholders)
- [ ] T004 Update apps/web/package.json scripts for Workers build/preview/deploy (add `workers:build`, `workers:preview`, `workers:deploy` using opennextjs-cloudflare + wrangler)
- [ ] T005 [P] Add Cloudflare binding type generation script and output file path apps/web/cloudflare-env.d.ts
- [ ] T006 [P] Ignore Workers build artifacts in .gitignore (e.g., apps/web/.open-next/, apps/web/.wrangler/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared runtime abstractions + operational endpoints required by all user stories.

- [ ] T007 Create Workers env validation helper in apps/web/lib/workers/env.ts (Zod-validated bindings/secrets)
- [ ] T008 [P] Add Workers runtime helpers (geo/ip/waitUntil) in apps/web/lib/workers/runtime.ts
- [ ] T009 Implement D1 client wrapper in apps/web/lib/d1/client.ts
- [ ] T010 [P] Add D1 migration folder and README in apps/web/d1/migrations/README.md (conventions: snake_case tables; ISO-8601 `TEXT` timestamps; `updated_at` triggers; JSON stored as `TEXT`)
- [ ] T011 Add initial D1 schema migration for core redirect flow in apps/web/d1/migrations/0001_core.sql (create `projects`, `domains`, `links` with: `projects(id, slug UNIQUE, name, plan, created_at, updated_at)`; `domains(id, slug UNIQUE, project_id, verified, archived, primary, not_found_url, expired_url, created_at, updated_at, FOREIGN KEY(project_id)->projects.id)`; `links(id, domain, key, url, short_link UNIQUE, project_id, archived, expires_at, expired_url, disabled_at, password, track_conversion, proxy, clicks, last_clicked, created_at, updated_at, UNIQUE(domain,key), FOREIGN KEY(domain)->domains.slug, FOREIGN KEY(project_id)->projects.id)`; add indexes `links(domain,key)`, `links(project_id)`, `domains(project_id)`)
- [ ] T012 Wire D1 migrations_dir + DB binding in apps/web/wrangler.toml
- [ ] T013 Implement Analytics Engine writer wrapper in apps/web/lib/analytics/wae/write.ts
- [ ] T014 [P] Define Analytics Engine event mapping for clicks in apps/web/lib/analytics/wae/click-event.ts
- [ ] T015 Implement Durable Object for rate limiting in apps/web/lib/workers/durable-objects/rate-limit-do.ts
- [ ] T016 Implement Durable Object for click-id cache/dedupe in apps/web/lib/workers/durable-objects/click-cache-do.ts
- [ ] T017 Wire Durable Object bindings in apps/web/wrangler.toml (RATE_LIMITER, CLICK_CACHE)
- [ ] T018 Implement /api/health endpoint in apps/web/app/api/health/route.ts (matches contracts/workers-hosting.openapi.yaml)
- [ ] T019 Implement /api/_internal/compat endpoint in apps/web/app/api/_internal/compat/route.ts (matches contracts/workers-hosting.openapi.yaml)
- [ ] T020 [P] Add compatibility matrix data + types in apps/web/lib/workers/compatibility.ts

**Checkpoint**: OpenNext build + wrangler preview runs, and operational endpoints respond in Workers preview.

---

## Phase 3: User Story 1 — Deploy and run public redirects (Priority: P1) 🎯 MVP

**Goal**: Deploy Dub to Workers such that public redirects work and click tracking is recorded under Workers constraints.

**Independent Test**:
- `pnpm --filter web workers:preview` starts a local Workers preview (added in T004).
- GET a known short link returns correct 301/302 and headers.
- A click event is written to Analytics Engine (observable via logs or a temporary debug counter).

### Tests (required)

- [ ] T021 [P] [US1] Add Workers smoke harness in apps/web/tests/utils/workers-harness.ts to start/stop a local preview and expose a base URL (used by Workers-only tests)
- [ ] T022 [P] [US1] Add redirect smoke test for Workers preview in apps/web/tests/redirects/workers-preview.test.ts (hits `/api/health` and a seeded short link)

### Implementation

- [ ] T023 [P] [US1] Add D1 query for link resolution in apps/web/lib/d1/queries/get-link-by-domain-key.ts (parameterized SQL; MUST enforce tenant isolation by joining `domains.project_id` to `links.project_id`)
- [ ] T024 [P] [US1] Add D1 query for workspace lookup needed by redirects in apps/web/lib/d1/queries/get-workspace-by-id.ts (parameterized SQL; returns `projects.id/slug/plan` at minimum)
- [ ] T025 [US1] Update redirect lookup to use D1 instead of PlanetScale in apps/web/lib/middleware/link.ts
- [ ] T026 [US1] Replace Vercel geo/ip usage with Workers runtime helper in apps/web/lib/middleware/link.ts
- [ ] T027 [P] [US1] Add D1 update for Link click counters in apps/web/lib/d1/queries/increment-link-clicks.ts (parameterized SQL; transactionally increment `links.clicks` + set `links.last_clicked`; optionally increment `projects.total_clicks`)
- [ ] T028 [US1] Replace Tinybird click ingestion with Analytics Engine writer in apps/web/lib/tinybird/record-click.ts
- [ ] T029 [US1] Replace Redis clickId cache usage with Durable Object cache in apps/web/lib/tinybird/record-click.ts
- [ ] T030 [US1] Replace Redis recordClickCache dedupe with Durable Object dedupe in apps/web/lib/tinybird/record-click.ts
- [ ] T031 [US1] Update click-id retrieval path to use Durable Object in apps/web/lib/middleware/link.ts
- [ ] T032 [US1] Remove PlanetScale fallback writes in apps/web/lib/tinybird/record-click.ts (use D1 updates instead)
- [ ] T033 [US1] Add Workers-only env vars to apps/web/.env.example (D1/Analytics/DO bindings; keep existing vars documented)

**Checkpoint**: Redirects work end-to-end in Workers preview with click ingestion enabled.

---

## Phase 4: User Story 2 — Use the dashboard and API in Workers (Priority: P2)

**Goal**: Dashboard sign-in and minimal link CRUD work when hosted in Workers.

**Independent Test**:
- Sign in works in Workers preview.
- Create a link via API or dashboard.
- The new link resolves via redirect immediately.

### Implementation

- [ ] T034 [US2] Identify and remove/replace `export const runtime = "edge"` where incompatible with OpenNext on Workers (start with apps/web/app/api/providers/route.ts)
- [ ] T035 [US2] Add D1 schema migration for auth + workspace membership in apps/web/d1/migrations/0002_auth.sql (create `users`, `accounts`, `sessions`, `verification_tokens`, `email_verification_tokens`, `password_reset_tokens`, `project_users`, `project_invites`, `tokens`, `restricted_tokens` mirroring Prisma fields minimally: `users(id, email UNIQUE, name, image, password_hash, email_verified, invalid_login_attempts, locked_at, default_workspace, created_at, updated_at)`; `accounts(user_id, provider, provider_account_id, type, access_token, refresh_token, expires_at, id_token, UNIQUE(provider,provider_account_id))`; `sessions(session_token UNIQUE, user_id, expires)`; token tables include `hashed_key UNIQUE`, `partial_key`, `user_id`, optional `project_id` and `scopes`; membership tables enforce UNIQUE(user_id,project_id) and UNIQUE(email,project_id))
- [ ] T036 [US2] Add D1 schema migration for link management tables/indexes in apps/web/d1/migrations/0003_links.sql (expand `links`/`domains` to support dashboard/API fields used in `Link`/`Domain` Prisma models: OG fields, UTM fields, device targeting (`ios`,`android`,`geo`), `rewrite`, `public_stats`, counters (`leads`,`conversions`,`sales`,`sale_amount`), `folder_id`,`tenant_id`,`external_id`; add indexes needed by common list queries: `links(project_id, folder_id, archived, created_at DESC)`, `links(project_id, tenant_id)`, `links(project_id, url)` and keep UNIQUE(domain,key) + UNIQUE(short_link))
- [ ] T037 [P] [US2] Implement D1-backed workspace membership query in apps/web/lib/d1/queries/get-workspace-membership.ts (parameterized SQL; MUST return role + enforce UNIQUE(user_id,project_id))
- [ ] T038 [P] [US2] Implement D1-backed token lookup (hashed key) in apps/web/lib/d1/queries/get-api-token.ts (parameterized SQL; support `restricted_tokens.project_id` scoping when applicable)
- [ ] T039 [US2] Add Workers-compatible rate limiting adapter in apps/web/lib/auth/rate-limit-request.ts (swap Upstash for Durable Object)
- [ ] T040 [US2] Add Workers-compatible ratelimit helper used by public endpoints in apps/web/lib/api/utils.ts (swap Upstash for Durable Object)
- [ ] T041 [US2] Add Workers/D1-backed implementations for link CRUD used by apps/web/app/api/links/route.ts
- [ ] T042 [US2] Ensure withWorkspace()/withSession() paths remain workspace-isolated under D1 in apps/web/lib/auth/workspace.ts

**Checkpoint**: Minimal dashboard/API flows work in Workers preview without PlanetScale/Prisma/Upstash.

---

## Phase 5: User Story 3 — Replace non-compatible dependencies safely (Priority: P3)

**Goal**: Remove remaining runtime-incompatible dependencies and provide clear operator guidance for what is supported.

**Independent Test**:
- Build + preview runs without requiring PlanetScale/Tinybird/Upstash in runtime paths.
- `/api/_internal/compat` reports supported/replaced/disabled integrations.

### Implementation

- [ ] T043 [P] [US3] Replace remaining PlanetScale edge reads with D1 equivalents in apps/web/lib/planetscale/* (start with apps/web/lib/planetscale/get-link-via-edge.ts)
- [ ] T044 [US3] Replace remaining Tinybird reads/writes used by core app flows with Analytics Engine equivalents (start with apps/web/app/api/analytics/route.ts)
- [ ] T045 [P] [US3] Replace remaining Upstash Redis caches used in core flows with Durable Objects or Cache API (start with apps/web/lib/api/links/cache.ts)
- [ ] T046 [US3] Replace Vercel-specific helpers (`@vercel/functions`) with Workers-compatible implementations across apps/web/lib/**
- [ ] T047 [US3] Implement operator-facing compatibility matrix response in apps/web/app/api/_internal/compat/route.ts using apps/web/lib/workers/compatibility.ts
- [ ] T048 [US3] Document Workers-only deployment steps + bindings in specs/001-cloudflare-workers/quickstart.md (finalize exact commands and file paths)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tighten docs, reduce risk, and make the deployment repeatable.

- [ ] T049 [P] Add a “Workers-only” section to README.md covering preview/deploy commands and required bindings
- [ ] T050 [P] Add a small troubleshooting section to specs/001-cloudflare-workers/research.md (common runtime gotchas found during implementation)
- [ ] T051 [P] Ensure enterprise-only routes remain correctly gated in apps/web/app/(ee)/ (no leakage)
- [ ] T052 Run the operator quickstart end-to-end and update specs/001-cloudflare-workers/quickstart.md with any missing steps

- [ ] T053 [P] Add automated isolation regression test for Workers hosting in apps/web/tests/workspaces/workers-isolation.test.ts (ensures cross-workspace access fails; maps to SC-005)
- [ ] T054 [P] Add automated Workers build + smoke validation workflow in .github/workflows/workers-smoke.yaml (validate OpenAPI contract in specs/001-cloudflare-workers/contracts/workers-hosting.openapi.yaml; build Workers artifact + run local smoke; maps to SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup) → blocks Phase 2+
- Phase 2 (Foundational) → blocks all user stories
- Phase 3 (US1) is the MVP and should be delivered first
- Phase 4 (US2) builds on D1/auth/rate limiting foundations
- Phase 5 (US3) is cleanup/replacement work after a functional MVP

### User Story Dependencies

- US1 depends on Phase 1–2 only.
- US2 depends on Phase 1–2, and benefits from US1’s D1 redirect path.
- US3 depends on Phase 1–2 and should be sequenced after US1/US2 to avoid “big bang” risk.

## Parallel Execution Examples

### Phase 1 (Setup)

- [P] T002 apps/web/open-next.config.ts
- [P] T003 apps/web/wrangler.toml
- [P] T005 apps/web/cloudflare-env.d.ts generation script
- [P] T006 .gitignore

### Phase 2 (Foundational)

- [P] T008 apps/web/lib/workers/runtime.ts
- [P] T010 apps/web/d1/migrations/README.md
- [P] T014 apps/web/lib/analytics/wae/click-event.ts
- [P] T020 apps/web/lib/workers/compatibility.ts

### User Story 1 (US1)

- [P] T023 apps/web/lib/d1/queries/get-link-by-domain-key.ts
- [P] T027 apps/web/lib/d1/queries/increment-link-clicks.ts

### User Story 2 (US2)

- [P] T037 apps/web/lib/d1/queries/get-workspace-membership.ts
- [P] T038 apps/web/lib/d1/queries/get-api-token.ts

### User Story 3 (US3)

- [P] T043 apps/web/lib/planetscale/get-link-via-edge.ts
- [P] T045 apps/web/lib/api/links/cache.ts

## Implementation Strategy

### MVP First (US1)

1. Phase 1: get OpenNext + Wrangler preview working
2. Phase 2: introduce Workers-native bindings + minimal D1 schema + operational endpoints
3. Phase 3: switch redirect + click tracking runtime paths to D1 + Analytics Engine + DO caches
4. Validate via Workers preview and a real deploy

### Incremental Delivery

- Keep replacements behind small abstractions (`apps/web/lib/workers/*`, `apps/web/lib/d1/*`, `apps/web/lib/analytics/wae/*`) so you can migrate call sites gradually.
- Prefer shipping a working redirect path early, then expanding D1 coverage for dashboard/API.
