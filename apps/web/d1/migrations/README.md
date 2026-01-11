# D1 Migrations (Workers)

This folder contains **Wrangler-managed D1 migrations** for the Workers-only deployment.

## Conventions

- Table names: `snake_case`.
- IDs: `TEXT` (use Dub-style string IDs, e.g. `link_...`, `proj_...`).
- Timestamps: ISO-8601 strings in UTC stored as `TEXT`.
  - Use `strftime('%Y-%m-%dT%H:%M:%fZ','now')` for `created_at` / `updated_at`.
- Prefer `NOT NULL` defaults for booleans: `0/1`.
- Use foreign keys where it improves tenant safety and correctness.

## Running migrations

From `apps/web/`:

- Local: `pnpm wrangler d1 migrations apply <db_name> --local`
- Remote: `pnpm wrangler d1 migrations apply <db_name> --remote`

`wrangler.jsonc` sets `migrations_dir = "d1/migrations"` so Wrangler will pick up this folder.
