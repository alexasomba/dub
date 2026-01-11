# Dub Agents Instructions

## Project Overview

Dub is an open-source link attribution platform built on a monorepo architecture. It handles 100M+ clicks and 2M+ links monthly through short links, conversion tracking, and affiliate programs.

**Key Tech Stack**: Next.js 15, TypeScript, Tailwind, Prisma ORM, PlanetScale, Upstash Redis, Tinybird (analytics), NextAuth.js

## Monorepo Structure

- **`apps/web/`** – Main Next.js 15 application (short link redirect, dashboard, API)
- **`packages/`** – Shared libraries:
  - `ui/` – React component library (Tailwind + shadcn-based)
  - `utils/` – Shared constants, helpers, type definitions
  - `prisma/` – Database client, schema, migrations
  - `email/` – Email templates (React Email + Resend)
  - `embeds/` – Client-side embed scripts (core, React wrapper)
  - `cli/` – Published npm package for CLI
  - `stripe-app/`, `hubspot-app/` – Third-party integrations

**Build/Dev Tools**: Turborepo (monorepo orchestration), pnpm (workspace manager)

## Architecture Patterns

### API Structure
- Route handlers in `apps/web/app/api/` using Next.js 13+ App Router
- Pattern: Wrap handlers with `withWorkspace()` or `withSession()` auth middleware
- Example: `/api/links/route.ts` exports `GET`, `POST`, `PATCH`, `DELETE` handlers
- Error handling: Custom `DubApiError` class with standardized error codes
- Request parsing: `parseRequestBody(req)` with Zod schema validation
- Responses wrapped with headers for CORS/caching via `NextResponse.json()`

### Middleware & Routing
- **Entry point**: `middleware.ts` routes based on hostnames and paths:
  - `APP_HOSTNAMES` → `AppMiddleware` (dashboard UI)
  - `API_HOSTNAMES` → `ApiMiddleware` (API requests)
  - `ADMIN_HOSTNAMES` → `AdminMiddleware` (internal admin tools)
  - `PARTNERS_HOSTNAMES` → `PartnersMiddleware` (partner portal)
  - Redirect links → `LinkMiddleware` (resolves short links)
- Middleware resolves user from token via `getUserViaToken()` in `lib/middleware/utils/`
- Edge runtime for performance-critical middleware

### Authentication & Authorization
- **NextAuth.js** integration in `lib/auth/index.ts` and `lib/auth/options.ts`
- API tokens: Hashed with blake2 in database, prefixed workspace ID
- Workspace access: Checked via `projectUsers` join table
- Role-based permissions: `withWorkspace()` accepts `requiredPermissions` array
- Examples: `"links.read"`, `"folders.write"`, `"tokens.manage"`
- Plan-based restrictions: `requiredPlan: ["business", "enterprise"]`

### Data Access & Queries
- **Prisma** for all database queries (PlanetScale MySQL backend)
- Edge queries via `lib/planetscale/` (read-only for performance)
- Common patterns in `lib/api/` subdirectories (links, domains, workspaces, etc.)
- `prisma/schema/` contains database models for users, workspaces, links, domains, integrations, etc.
- Always filter queries by `workspace.id` or `projectId` for multi-tenant isolation

### Analytics
- **Tinybird** for event streaming & analytics (configured in `lib/tinybird/`)
- Tracked via `@dub/analytics` package
- Dashboard queries in `lib/analytics/get-analytics.ts`
- Real-time event processing for link clicks, conversions

## Key Directories & Conventions

| Path | Purpose |
|------|---------|
| `apps/web/app/` | Next.js App Router pages & layouts |
| `apps/web/app/api/` | API route handlers |
| `apps/web/app/(ee)/` | Enterprise Edition features (SSO, fraud rules, programs) |
| `apps/web/lib/api/` | API logic, error handling, domain-specific operations |
| `apps/web/lib/auth/` | NextAuth config, session utilities, permission checks |
| `apps/web/lib/middleware/` | Route-level middleware for different hostnames |
| `apps/web/ui/` | Page-level React components |
| `packages/prisma/schema/` | Database models & migrations |

## Common Workflows

### Running Locally
```bash
# Install dependencies
pnpm install

# Set up environment (.env files in apps/web/)
# Required: DATABASE_URL, NEXTAUTH_SECRET, STRIPE_API_KEY, etc.

# Generate Prisma client
pnpm prisma:generate

# Start dev server (includes Prisma Studio on localhost:5555)
pnpm dev

# Run tests
pnpm test

# Format code
pnpm format
```

### Adding a New API Endpoint
1. Create `apps/web/app/api/[resource]/route.ts`
2. Import `withWorkspace` or `withSession` wrapper
3. Define Zod schema in `lib/zod/schemas/`
4. Implement GET/POST/PATCH/DELETE handlers
5. Use `DubApiError` for errors
6. Return `NextResponse.json()` with parsed response

### Database Changes
```bash
# Push schema changes to database (no migrations)
pnpm prisma:push

# Inspect database
pnpm prisma:studio
```

## Critical Patterns to Avoid

- **Don't query without workspace filters** – Always include `where: { projectId: workspace.id }`
- **Don't hardcode permissions** – Use `withWorkspace()` + `requiredPermissions` array
- **Don't skip validation** – Parse all inputs with Zod schemas
- **Don't use `window` in server components** – Use `"use client"` for browser APIs
- **Don't call Prisma on edge routes** – Use `lib/planetscale/` edge client instead
- **Don't merge API and UI code** – Keep `lib/api/` separate from components

## Enterprise (EE) Features

Features in `apps/web/app/(ee)/` are behind commercial license (AGPLv3 core):
- SSO/SAML (BoxyHQ integration)
- Fraud detection rules
- Affiliate programs & payouts
- Custom domains with email
- Advanced analytics

Check `LICENSE.md` for commercial usage details.

## Testing & Validation

- **Unit tests**: `vitest` config in `apps/web/vitest.config.ts`
- **E2E tests**: GitHub Actions workflow in `.github/workflows/e2e.yaml`
- **Linting**: ESLint configuration inherited from root
- **Type checking**: Strict TypeScript in workspace (strictNullChecks enabled)

## External Integrations

- **Stripe**: Payments, subscription management
- **Resend**: Email delivery
- **Upstash**: Redis (caching, rate limiting, QStash for background jobs)
- **Vercel**: Deployment, Edge Config, Analytics
- **BoxyHQ**: SSO/SAML provider
- **Tinybird**: Analytics data pipeline

## Node/pnpm Versions

- Node: v23.11.0 (or compatible)
- pnpm: 9.15.9+

**Common local setup issue**: Delete `node_modules/`, `.next/`, `.turbo/` directories and reinstall if builds fail.
