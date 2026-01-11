# Data Model: Cloudflare Workers Hosting

**Feature**: Cloudflare Workers Hosting
**Branch**: 001-cloudflare-workers
**Date**: 2026-01-11

This feature primarily changes *infrastructure/runtime* rather than adding new business entities. The data model work here defines how Dub’s existing multi-tenant entities map onto **Cloudflare D1** (authoritative DB), and introduces Workers-native supporting stores:

- **Cloudflare D1**: authoritative relational data (users/workspaces/links/domains/tokens…)
- **Workers Analytics Engine**: append-only click/conversion event stream for analytics queries
- **Durable Objects**: strongly-consistent state for rate limiting and hot caches

## Core Entities (authoritative in D1)

> Source of truth for existing fields/relations remains the Prisma schema under `packages/prisma/schema/*.prisma`. The Workers deployment ports the relevant subset to D1 using SQLite-compatible schema + indexes.

### User
- **Represents**: a human or machine identity
- **Key fields**: `id`, `email`, `name`, `is_machine`, `created_at`
- **Relationships**:
  - has many **WorkspaceMembership** (join to Workspace)
  - has many **Session** (if using DB-backed sessions)
  - has many **Token**

### Workspace
- **Represents**: the primary tenant boundary
- **Key fields**: `id`, `slug`, `name`, `created_at`, `plan`
- **Relationships**:
  - has many **WorkspaceMembership**
  - has many **Link**
  - has many **Domain**

### WorkspaceMembership (join)
- **Represents**: user access to a workspace (multi-tenant isolation boundary)
- **Key fields**: `workspace_id`, `user_id`, `role`, `created_at`
- **Validation rules**:
  - `workspace_id` + `user_id` unique

### Link
- **Represents**: a short link and its redirect configuration
- **Key fields**: `id`, `workspace_id`, `domain`, `key`, `url`, `created_at`, `updated_at`, `archived_at`, `expires_at`
- **Validation rules**:
  - Uniqueness scoped to tenant and domain: unique(`workspace_id`, `domain`, `key`)
  - All queries MUST filter by `workspace_id`
- **State transitions**:
  - `active` → `archived`
  - `active` → `expired` (via time)

### Domain
- **Represents**: a custom domain attached to a workspace
- **Key fields**: `id`, `workspace_id`, `slug`/`domain`, `verified_at`, `created_at`
- **Validation rules**:
  - unique(`workspace_id`, `domain`)

### Token
- **Represents**: API tokens and scoped permissions
- **Key fields**: `id`, `workspace_id`, `user_id`, `hashed_token`, `prefix`, `permissions_json`, `created_at`, `expires_at`
- **Validation rules**:
  - Never store plaintext tokens
  - Queries MUST filter by `workspace_id`

## Supporting Stores

### Analytics Store (Workers Analytics Engine)
- **Represents**: click/conversion events for aggregated analytics
- **Canonical identifiers**:
  - `workspace_id`
  - `link_id`
  - `domain`
  - `event_type` (click, lead, sale, etc.)
  - `ts` (event timestamp)
- **Notes**:
  - This is not the authoritative store for link definitions; it is an analytics/event store.

### Cache/Rate-Limit Store (Durable Objects)
- **Represents**: strongly-consistent counters and hot caches that must be atomic
- **Keying strategy**:
  - Partition DO instances by a natural shard key (e.g., workspace id, link id, token prefix)
  - Avoid a global singleton DO

## Cross-cutting Rules (derived from constitution)

- **Tenant isolation**: D1 schema includes `workspace_id` (or `project_id`) on all tenant-scoped tables.
- **Validation**: all external inputs validated with Zod before DB writes.
- **Auth**: API routes wrapped with `withWorkspace()` / `withSession()`.
- **No Prisma in Workers runtime**: D1 access uses Workers-compatible SQL layer.
