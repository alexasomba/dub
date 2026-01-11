# Dub Engineering Constitution

## Core Principles

### I. Multi-Tenant Isolation & Data Safety (NON-NEGOTIABLE)
All data queries MUST filter by `workspace.id` or `projectId`. Every database access—Prisma queries, edge reads, analytics lookups—is a potential security boundary. Workspace isolation is non-negotiable; violations compromise customer data integrity across our 2M+ links monthly. Code review MUST verify isolation before merge.

### II. Monorepo with Shared Libraries
Features are built using the `packages/` shared library approach: `ui/` (React components), `utils/` (helpers, constants, types), `prisma/` (database client), `email/`, `embeds/`, `cli/`. Each library must be independently testable and documented. Root `turbo.json` orchestrates builds across `apps/web/` and all packages via `pnpm` workspaces. Clear boundaries between app logic and library code.

### III. Validated Input & Type Safety (MUST)
All API inputs MUST be validated with Zod schemas in `lib/zod/schemas/`. Route handlers (`apps/web/app/api/`) wrap requests with `parseRequestBody(req)` before handler logic. TypeScript strict mode required (`strictNullChecks: true`). No unchecked string-to-database flows.

### IV. Auth Middleware Enforcement
API routes MUST wrap handlers with `withWorkspace()` or `withSession()` auth middleware. Middleware resolves user identity via `getUserViaToken()` (lib/auth/). Workspace access checked via `projectUsers` join table. Role-based permissions (e.g., `"links.read"`, `"folders.write"`, `"tokens.manage"`) configured in `withWorkspace()` + `requiredPermissions` array. Plan-based restrictions (business, enterprise) enforced for premium features.

### V. Runtime Compatibility & Platform-Optimized Data Access
Dub optimizes for edge performance and must remain portable across runtimes.

- Prefer Web Platform APIs for edge/runtime-critical paths.
- Avoid database clients that require native Node binaries in edge runtimes.

**Current default deployment** uses PlanetScale (primary DB), Tinybird (analytics), and Upstash Redis (cache/rate limiting), with edge reads via `lib/planetscale/` (not full Prisma).

**Workers-only deployments** MUST use Workers-compatible storage and clients (e.g., D1 for primary DB, Workers Analytics Engine for analytics, Durable Objects for strong-consistency state) and MUST NOT depend on Prisma in the Workers runtime.

### VI. Testing Discipline
Unit tests via Vitest (`apps/web/vitest.config.ts`). E2E tests in `.github/workflows/e2e.yaml`. New API endpoints require contract tests; mutations require integration tests. Coverage expectations: critical paths (auth, payments, workspace isolation) ≥80%. Tests unblock features; untested = unreviewable.

### VII. Error Handling Standardization
Use `DubApiError` custom error class with standardized error codes. All responses return `NextResponse.json()` with CORS/caching headers. Errors logged with structured format (timestamp, workspace ID, user ID, error code, message). Client SDKs depend on predictable error shapes.

## Architecture & Patterns

### API Design
- Route handlers in `apps/web/app/api/[resource]/route.ts` export GET, POST, PATCH, DELETE handlers
- All requests validated with Zod before handler execution
- Responses wrapped with headers for CORS, caching, and security
- Error responses use standardized `DubApiError` codes

### Middleware & Routing
Entry point: `middleware.ts` routes based on hostnames and paths:
- `APP_HOSTNAMES` → `AppMiddleware` (dashboard UI)
- `API_HOSTNAMES` → `ApiMiddleware` (API requests)
- `ADMIN_HOSTNAMES` → `AdminMiddleware` (internal admin tools)
- `PARTNERS_HOSTNAMES` → `PartnersMiddleware` (partner portal)
- Redirect links → `LinkMiddleware` (resolves short links, analytics tracking)

### Enterprise Edition Compliance
EE features (SSO/SAML via BoxyHQ, fraud detection, affiliate programs, custom domains) are in `apps/web/app/(ee)/` under commercial license. Core (AGPLv3) and EE licensing must be documented in affected files. No EE feature leakage into core paths.

## Development Workflow

### Local Setup Requirements
- Node: v23.11.0
- pnpm: 9.15.9+
- Environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `STRIPE_API_KEY`, etc. in `apps/web/.env`
- Commands: `pnpm install`, `pnpm prisma:generate`, `pnpm dev`, `pnpm test`, `pnpm format`

### Adding New Features
1. Define Zod schema in `lib/zod/schemas/[feature].ts`
2. Create API route(s) in `apps/web/app/api/[resource]/route.ts`
3. Wrap handlers with auth middleware (`withWorkspace()` or `withSession()`)
4. Add unit + integration tests
5. Update `AGENTS.md` or relevant documentation if patterns change
6. PR must verify: isolation filters, input validation, auth checks, test coverage

### Database Changes
- Push schema changes via `pnpm prisma:push` (no migration files) for the default PlanetScale/Prisma deployment.
- Inspect with `pnpm prisma:studio` on localhost:5555.
- All writes via Prisma in `apps/web/app/api/`; reads on edge use `lib/planetscale/`.
- For Workers-only hosting, use D1 migrations and Workers-compatible SQL access; do not use Prisma in the Workers runtime.

## Governance

**This Constitution supersedes all other development practices.** All PRs must verify compliance with each Core Principle before merge. Complexity additions (new dependencies, architectural changes) require justification against principles.

**Amendments** are tracked by version number (MAJOR.MINOR.PATCH):
- MAJOR: Principle removal, backward-incompatible isolation/auth changes
- MINOR: New principle or significantly expanded guidance
- PATCH: Clarifications, non-semantic refinements

**Runtime guidance** is maintained in `AGENTS.md` (detailed architecture patterns, examples, anti-patterns). Constitution defines non-negotiable rules; `AGENTS.md` provides implementation reference.

**Compliance verification**: Code reviews check for `workspace` filters, auth middleware, Zod validation, and test coverage before approval. Violations of I, III, or IV are release blockers.

**Version**: 1.1.0 | **Ratified**: 2026-01-11 | **Last Amended**: 2026-01-11
