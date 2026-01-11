# dub Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-11

## Active Technologies

- TypeScript / Next.js 15 (Workers runtime with `nodejs_compat`) (001-cloudflare-workers)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript / Next.js 15 (Workers runtime with `nodejs_compat`): Follow standard conventions

## Recent Changes
- 001-cloudflare-workers: Added TypeScript / Next.js 15 (Workers runtime with `nodejs_compat`)

- 001-cloudflare-workers: Added TypeScript / Next.js 15 (Workers runtime with `nodejs_compat`)

<!-- MANUAL ADDITIONS START -->
## Dub Monorepo (Manual)

Prefer `pnpm` + Turborepo commands from repo root:

- `pnpm dev` (starts dev across workspaces)
- `pnpm test` (runs tests via turbo)
- `pnpm lint` (runs lint via turbo)
- `pnpm format` (prettier)

Common app-level commands:

- `pnpm --filter web dev`
- `pnpm --filter web test`

Actual project structure:

```text
apps/
	web/            # Next.js app (dashboard, API routes, redirects)
packages/         # shared libs (ui, utils, prisma schema, etc.)
specs/            # feature specs/plans
```

<!-- MANUAL ADDITIONS END -->
