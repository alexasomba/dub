# Quickstart: Cloudflare Workers Hosting (Dub)

**Feature**: Cloudflare Workers Hosting
**Branch**: 001-cloudflare-workers
**Date**: 2026-01-11

This quickstart describes the target operator experience for deploying Dub to **Cloudflare Workers only**, using Cloudflare-native services:

- **D1** for the primary database
- **Workers Analytics Engine** for click/conversion analytics
- **Durable Objects** for rate limiting and strong-consistency caches

> This is a deployment guide. Exact file paths and scripts are finalized in the implementation phase.

## Prerequisites

- Node + pnpm (per repo README)
- Cloudflare account with Workers enabled
- `wrangler` installed (`pnpm -g wrangler` or devDependency)

## 1) Create Cloudflare resources

### 1.1 D1 database
- Create a D1 database (name example: `dub-db`).
- Create a migrations directory and apply migrations to local and remote.

### 1.2 Workers Analytics Engine dataset
- Create a dataset for analytics events (name example: `dub-analytics`).

### 1.3 Durable Objects
- Define a DO class for rate limiting/caching (name example: `RateLimitDO`).

## 2) Configure Wrangler bindings

Add required bindings to `wrangler.jsonc` at the deploy root:

- D1 binding (example): `DB`
- Analytics Engine binding (example): `ANALYTICS`
- Durable Objects binding (example): `RATE_LIMITER`
- Assets binding (if using Workers Assets for Next/OpenNext output): `ASSETS`

Also set required secrets:

- `NEXTAUTH_SECRET`
- Any OAuth provider secrets in use
- Stripe and email provider secrets (if enabled)

## 3) Build and preview locally in Workers runtime

- Use the Workers runtime preview (workerd) to validate compatibility (Node polyfills, bindings, etc.).
- Run minimal smoke tests:
  - GET a known short link and validate redirect
  - Sign in to dashboard and create a link

## 4) Deploy

- Deploy via Wrangler or Workers Builds.
- Run health checks (recommended endpoints and checks are defined in the contracts folder).

## 5) Validate success criteria

- Redirect p95 latency and correctness
- Click event ingestion observed in Analytics Engine
- Workspace isolation tests pass

## Known limitations (to validate during implementation)

- Node-only SDKs (Stripe/Resend/etc.) may require fetch-based adapters.
- Next.js middleware and image optimization need Workers-compatible configuration.
