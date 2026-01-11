# Feature Specification: Cloudflare Workers Hosting

**Feature Branch**: `001-cloudflare-workers`  
**Created**: 2026-01-11  
**Status**: Draft  
**Input**: User description: "Host Dub on Cloudflare Workers and use Cloudflare Workers recommended alternative tools and services as replacement for any part of this codebase relying on tools or services not compatible with Cloudflare Workers."

## Clarifications

### Session 2026-01-11

- Q: Should hosting split across Cloudflare products (e.g., Pages + Workers), or be Workers-only? → A: Workers-only (no Pages).
- Q: Should the Workers deployment replace non-compatible external services with Cloudflare-native services? → A: Yes — prefer Cloudflare-native services where feasible.
- Q: What should be the authoritative primary database for Workers-only hosting? → A: Cloudflare D1.
- Q: Where should click + conversion analytics events be recorded and queried (Tinybird replacement)? → A: Cloudflare Workers Analytics Engine.
- Q: Where should cache/rate-limit state live (Upstash/Redis replacement)? → A: Durable Objects.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Deploy and run public redirects (Priority: P1)

As an operator, I want to deploy Dub to a Cloudflare Workers environment so that public short-link redirects work reliably and fast under the Workers runtime constraints.

**Why this priority**: Redirects are Dub’s core value; without them, nothing else matters.

**Independent Test**: Can be tested end-to-end by deploying a minimal instance, creating or importing a single short link, and verifying redirects + click tracking without relying on any non-compatible runtime features.

**Acceptance Scenarios**:

1. **Given** an operator has configured required runtime secrets and configuration, **When** the deployment is published to the Workers environment, **Then** the instance starts successfully and serves requests.
2. **Given** a valid short link exists, **When** a visitor requests the short link, **Then** the instance returns the expected redirect status and destination with correct headers.
3. **Given** a redirect is served, **When** click tracking is enabled, **Then** the click event is recorded and can be observed in the product’s analytics views.

---

### User Story 2 - Use the dashboard and API in Workers (Priority: P2)

As a workspace member, I want the dashboard and API to work correctly when hosted in the Workers environment so I can create and manage links, domains, and workspaces.

**Why this priority**: Self-hosters need the management UI and API to be functional to operate Dub day-to-day.

**Independent Test**: Can be tested by logging in, performing a minimal set of CRUD actions (create link, update destination, list links), and validating expected responses and UI behavior.

**Acceptance Scenarios**:

1. **Given** a user with valid credentials, **When** they sign in, **Then** they can access the dashboard and the session persists across navigation.
2. **Given** a user has access to a workspace, **When** they create a new short link via dashboard or API, **Then** it is persisted and immediately resolves via the public redirect.
3. **Given** an API consumer calls an authenticated endpoint, **When** the request is authorized, **Then** the response matches the documented contract and does not expose data from other workspaces.

---

### User Story 3 - Replace non-compatible dependencies safely (Priority: P3)

As an operator, I want any non-compatible dependencies or integrations to be replaced with Cloudflare-recommended alternatives (or equivalent compatible approaches) so the deployed instance is stable and maintainable.

**Why this priority**: Reliability and maintainability depend on removing runtime-incompatible code paths and reducing operational surprises.

**Independent Test**: Can be tested by building and deploying the Workers artifact and verifying (a) no prohibited runtime APIs are required at runtime and (b) required functionality works through compatible integrations.

**Acceptance Scenarios**:

1. **Given** the Workers build is produced, **When** the artifact is analyzed or executed, **Then** it does not require prohibited runtime capabilities (e.g., unsupported Node-only APIs).
2. **Given** the system relies on external integrations, **When** running in the Workers environment, **Then** integrations function through compatible mechanisms or are explicitly disabled with clear operator-facing guidance.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Missing or invalid configuration/secrets at startup (must fail fast with clear error messages).
- Database/primary storage temporarily unavailable (must degrade gracefully where possible and surface actionable errors).
- Requests that exceed platform limits (payload size, execution time, concurrent requests).
- Rate limiting or abuse scenarios on public redirect endpoints.
- Regional consistency issues (eventual consistency or propagation delays) impacting reads after writes.
- Unexpected third-party integration outages (must not break redirects; should isolate failures).

## Operational Requirements

### Operational Endpoints

- The system MUST expose `/api/health` as a stable health check endpoint.
  - **Minimum response shape** on success: `{ "status": "ok", "runtime": "workers" }`.
  - The endpoint MUST be safe to call frequently and MUST NOT require access to external dependencies to return a healthy response (process-level health).
- The system MUST expose `/api/_internal/compat` as an operator-facing compatibility report endpoint.
  - The endpoint MUST include a compatibility matrix snapshot (see “Compatibility Matrix”).
  - The endpoint MUST be treated as operator-only in production.
  - The endpoint MUST be disabled by default unless an operator secret is configured.
  - When enabled, the endpoint MUST require an operator secret, supplied as `X-Operator-Token: <token>`.
  - When disabled or when the operator token is invalid/missing, the endpoint MUST respond `404`.

### Compatibility Matrix

- The system MUST provide an operator-facing compatibility matrix (via `/api/_internal/compat` and documented in the Workers quickstart) covering major integrations.
- The matrix MUST include (at minimum): PlanetScale/Prisma, Tinybird, Upstash Redis.
- For each integration, the matrix MUST include:
  - `status`: one of `supported`, `replaced`, `disabled`
  - `replacement` (if `replaced`): the Cloudflare-native substitute (D1, Analytics Engine, Durable Objects)
  - `notes`: operator-facing guidance (what works, what does not, and why)
- The `/api/_internal/compat` response MUST include:
  - `runtime`: `workers`
  - `contractVersion`: the OpenAPI version from `specs/001-cloudflare-workers/contracts/workers-hosting.openapi.yaml`
  - `integrations`: a map keyed by integration identifier (e.g., `planetscalePrisma`, `tinybird`, `upstashRedis`)

### Automated Deployment Validation Evidence (SC-004)

- “Automated deployment validation” MUST include an automated smoke check that:
  - Builds the Workers artifact.
  - Starts a Workers preview environment.
  - Verifies `/api/health` responds `200` with the minimum response shape.
  - Verifies `/api/_internal/compat` responds `200` (when enabled) and reports `replaced/disabled/supported` statuses.
  - Fails with actionable diagnostics if runtime-incompatible capabilities are required.
- Automated validation MUST also validate the OpenAPI contract file (`specs/001-cloudflare-workers/contracts/workers-hosting.openapi.yaml`) for syntactic correctness.

## Redirect Behavior Requirements

The system MUST preserve the current Dub redirect semantics as closely as possible, and MUST meet the minimum behaviors below.

### Common Redirect Requirements

- For a standard, valid short link, the system MUST respond with an HTTP redirect and a `Location` header.
- Default redirect status MUST be `302` unless a link is explicitly configured as permanent, in which case it MUST be `301`.
- Redirect responses SHOULD be `Cache-Control: no-store` by default unless the link/domain explicitly enables caching.

### Redirect Variants (Minimum Behaviors)

- **Not found** (unknown key/domain):
  - If the domain has a configured `not_found_url`, respond `302` redirecting to it.
  - Otherwise respond `404` with a minimal, non-sensitive response.
- **Disabled link** (archived or disabled):
  - Treat as not found (same behavior as above). The response MUST NOT reveal whether the link exists in another workspace.
- **Expired link**:
  - If the link has `expired_url`, redirect (`302`) to it.
  - Else if the domain has `expired_url`, redirect (`302`) to it.
  - Otherwise treat as not found.
- **Password-protected link**:
  - Must not redirect until the correct password is provided.
  - If the current UI flow is supported, the system MUST render the existing password prompt experience.
  - Otherwise, respond `401` with a minimal response that does not disclose link ownership.
- **Proxy/cloaked mode**:
  - Workers-only hosting MUST support normal redirect mode.
  - If proxy/cloaked mode is not supported in Workers for a given link, the system MUST fall back to normal redirect mode and MUST log a single warning-level event.

## Security Requirements

### Tenant Isolation

- **Terminology**: In this repository, a “workspace” maps to the Prisma `Project` model and is represented by `project_id` in D1.
- “Workspace isolation” MUST be enforced as an explicit, testable invariant:
  - No request (public redirect or authenticated API) may read, infer, or modify data belonging to a different `project_id`.
  - All tenant-owned D1 tables MUST include a `project_id` column.
  - All D1 queries for tenant-owned data MUST include `project_id` in the predicate (no implicit scoping).
- Tenant isolation MUST cover:
  - Redirect resolution (`domain` + `key`)
  - Click recording and counters
  - Authenticated link CRUD operations
  - Analytics event ingest and analytics visibility

### Authentication & Authorization

- The Workers-hosted deployment MUST support authenticated access for the dashboard and API.
- **Session (dashboard)**:
  - Authentication MUST use a server-issued session.
  - The session MUST persist across navigation.
  - Session cookies MUST be `HttpOnly` and `Secure` in production, and MUST use `SameSite=Lax` (or stricter).
- **API tokens (API consumers)**:
  - Authentication MUST support `Authorization: Bearer <token>`.
  - Tokens MUST be stored as hashes at rest (no plaintext token storage).
  - Token lookup MUST be workspace-scoped when applicable (e.g., restricted tokens).
- Token lifecycle requirements:
  - Tokens MUST be revocable and revocation MUST take effect immediately.
  - Restricted tokens MUST support explicit scopes, and scopes MUST be enforced.
- **Authorization policy**:
  - Authorization MUST be based on membership (`project_users`) and role/permissions.
  - Requests MUST distinguish unauthenticated (`401`) from unauthorized (`403`) for authenticated routes.
  - Cross-workspace access MUST respond as `404` for resource reads to avoid leaking existence.

### Secrets and Sensitive Data

- Secrets MUST NOT be embedded in build artifacts.
- Logs and telemetry MUST redact secrets and tokens and SHOULD avoid storing raw IP addresses or other PII.
- `/api/_internal/compat` MUST be operator-only in production; by default it MUST be disabled unless an operator secret is configured.

### Brute-force and Lockout

- The system MUST provide brute-force protection for sign-in.
  - Default behavior: after 10 consecutive invalid sign-in attempts, lock the account for 15 minutes.
  - Lockout MUST be observable in logs (without leaking credentials).

### Abuse Prevention

- Public redirect endpoints MUST be rate limited.
  - Default actor key: client IP.
  - Default policy: 120 requests/minute per IP per hostname.
- Security-sensitive endpoints (auth/token related) MUST be rate limited more aggressively.
  - Default policy: 10 requests/minute per IP.
- Rate-limited responses MUST return `429` and SHOULD include `Retry-After`.
- Rate limiting MUST emit an operator-visible signal (logs at warn level).

## Observability Requirements

- Operators MUST be able to observe operational signals via Workers logs.
- Logs MUST be structured enough to include at minimum: `event`, `level`, `request_id`, and a redacted error message.
- The system MUST produce operator-actionable diagnostics for:
  - startup/config validation failures
  - D1 read/write failures
  - Durable Object failures (rate limit and dedupe)
  - analytics ingest failures
- The redirect path MUST log, at minimum:
  - startup success (once)
  - redirect served (sampled or debug-level)
  - redirect failed (error-level)
  - storage unavailable (error-level)
- Logs MUST NOT include secrets/tokens and SHOULD avoid raw IP addresses.

### Request IDs and Error Shape

- All API error responses (authenticated and operational endpoints) MUST include a `requestId` that correlates to logs.
- Authenticated JSON API error responses MUST use a consistent shape:
  - `{ "error": { "code": string, "message": string, "requestId": string } }`
- For public redirect paths, user-visible error bodies MUST be minimal and MUST NOT leak tenant/resource existence.

### Retention

- Click/conversion analytics event retention MUST be at least 30 days (or the Workers quickstart MUST document a shorter retention limit if imposed by the platform).

## Performance Requirements

- **Redirect latency targets** (client-observed TTFB for `GET /{key}` on a warm deployment):
  - p95  <= 200ms
  - p99  <= 500ms
- **Cold start expectation**: p99  <= 1500ms for the first request after deploy.
- Click tracking MUST NOT materially degrade redirect latency:
  - Click event ingestion MUST be asynchronous (using `waitUntil` or equivalent).
  - Redirect response MUST NOT be blocked on analytics writes.
- Performance MUST be measured in two stages:
  - Preview smoke (functional correctness only).
  - Deployed soak test (24 hours) where SC-002 is evaluated.

### Observability Overhead

- Logging and click/conversion tracking MUST be implemented so that redirect latency targets remain achievable (no blocking I/O on the redirect response path).

## Data & Migration Requirements

- D1 MUST be the authoritative primary database for Workers-only hosting.
- Minimum required entities for US1 MUST exist in D1: `projects`, `domains`, `links`.
- Schema migrations MUST be applied via Wrangler D1 migrations.
  - Local preview MUST apply migrations using `wrangler d1 migrations apply --local`.
  - Production deploy MUST apply migrations using `wrangler d1 migrations apply` before switching traffic.
- Migration failure handling:
  - Automatic rollback is not required.
  - The operator MUST be able to recover by applying a forward-fix migration or restoring the D1 database from an operator-managed backup.
- Backup/restore expectations:
  - Backup/restore is operator-managed; the Workers quickstart MUST document a recommended approach.
- Read-after-write expectations:
  - After creating or updating a link, the redirect path MUST reflect the change within 5 seconds.

### Data Durability and Recovery

- The Workers quickstart MUST document an operator procedure for restoring D1 from backup.
- If D1 is temporarily unavailable, redirects MUST either:
  - fall back to a safe cached response (if available), or
  - return a minimal error response while preserving tenant confidentiality.

## API Contracts

- Operational endpoints MUST conform to the OpenAPI contract in `specs/001-cloudflare-workers/contracts/workers-hosting.openapi.yaml`.
- For existing Dub API endpoints used in US2 (link CRUD), the Workers-hosted deployment MUST preserve the current contract and behavior as documented in `apps/web/guides/rest-api.md` (or successor docs) and validated by integration tests.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The system MUST provide a documented deployment path targeting Cloudflare Workers for self-hosting.
- **FR-002**: The system MUST serve public short-link redirects correctly under Workers runtime constraints.
- **FR-003**: The system MUST support click/conversion tracking in the Workers-hosted deployment.
- **FR-004**: The system MUST support authenticated access to the dashboard and API in the Workers-hosted deployment.
- **FR-005**: The system MUST enforce workspace isolation for all reads/writes and MUST NOT leak data across workspaces.
- **FR-006**: The system MUST validate all external inputs and MUST reject invalid requests with consistent, user-friendly errors.
- **FR-007**: The system MUST replace or refactor any runtime-incompatible dependencies so that the Workers deployment does not depend on unsupported runtime capabilities.
- **FR-008**: The system MUST prefer Cloudflare-native replacements (where feasible) for runtime-incompatible dependencies and external services.
- **FR-009**: The system MUST provide an operator-facing compatibility matrix for major integrations, including whether each is supported, replaced, or intentionally disabled in Workers hosting.
- **FR-010**: The system MUST use Cloudflare D1 as the authoritative primary database for Workers-only hosting.
- **FR-011**: The system MUST use Cloudflare Workers Analytics Engine for click/conversion event ingest and querying in Workers-only hosting.
- **FR-012**: The system MUST use Durable Objects for cache and rate-limiting state where strong consistency is required.
- **FR-013**: The system MUST support secure configuration and secrets management suitable for a Workers environment (no secrets embedded in build artifacts).
- **FR-014**: The system MUST preserve licensing boundaries by ensuring enterprise-only features remain gated and are not unintentionally distributed in the core build.

*Note*: FR numbering is intentionally stable within this spec; renumber only if requirements are removed.

### Key Entities *(include if feature involves data)*

- **Deployment Target**: Represents the hosting environment constraints, configuration, and operational expectations for the Workers-hosted instance.
- **Runtime Configuration**: Represents secrets, environment variables, and operator-controlled settings required to run the service.
- **Compatibility Matrix**: Represents a maintained list of integrations/dependencies and their Workers-hosting status (supported/replaced/disabled) with operator guidance.
- **Primary Database**: Represents the authoritative data store for the Workers-hosted deployment (Cloudflare D1).
- **Analytics Store**: Represents the event analytics system used for click/conversion tracking (Cloudflare Workers Analytics Engine).
- **Cache/Rate-Limit Store**: Represents state required for caching and/or rate limiting (Durable Objects).

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: A new self-hoster can complete a first successful deployment to Cloudflare Workers in under 30 minutes following documented steps, including verifying `/api/health` and (when enabled) `/api/_internal/compat`.
- **SC-002**: Public redirects succeed for at least 99.9% of requests over a 24-hour soak test in a Workers-hosted environment, and meet the redirect latency targets (p95 <= 200ms, p99 <= 500ms).
- **SC-003**: Workspace members can complete the primary management flow (sign in → create a link → verify redirect) with a first-attempt completion rate of at least 90%.
- **SC-004**: The Workers-hosted build has zero runtime failures caused by unsupported runtime capabilities during automated deployment validation, and failures (if any) include actionable diagnostics.
- **SC-005**: Multi-tenant isolation is verified by automated tests: zero cross-workspace data access across representative operations including (at minimum) link creation, link listing, link updates, and redirect resolution.

## Assumptions

- The target hosting environment is Cloudflare Workers (including its standard limitations around runtime APIs and long-lived connections).
- All user-facing surfaces (redirects, API, dashboard UI) are hosted on Cloudflare Workers only (no Cloudflare Pages split-deployment).
- The authoritative primary database for the Workers-hosted deployment is Cloudflare D1.
- Click/conversion analytics event ingest and querying uses Cloudflare Workers Analytics Engine.
- Cache and rate limiting state uses Durable Objects where strong consistency is required.
- Some optional integrations may be supported only when they have a compatible interface in the Workers environment; unsupported integrations must be clearly documented and safely disabled.
- The feature prioritizes production-grade redirect performance and correctness over feature-complete parity for rarely used integrations.

## Out of Scope

- Rebuilding the product UI/UX.
- Changing product pricing, plans, or licensing.
- Re-architecting enterprise-only functionality beyond ensuring correct gating.
- Deploying the dashboard UI via Cloudflare Pages.
