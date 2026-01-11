# Research: Deploying Next.js 15 to Cloudflare Workers (Workers-only)

**Goal**: Identify Cloudflare-recommended tooling + constraints for running a full Next.js 15 app on **Cloudflare Workers** (no Pages), with practical build/deploy steps.

## 1) Decision recommendation

**Recommend**: Use **Cloudflare’s OpenNext adapter** (`@opennextjs/cloudflare`) + **Wrangler** + **Workers Assets**.

Why this is the “Cloudflare-first” answer:
- Cloudflare’s official Next.js-on-Workers guide explicitly recommends deploying via the **OpenNext adapter**.
- The Cloudflare adapter for OpenNext is positioned as the preferred successor to older approaches (notably “Next on Pages”).
- It produces a Worker entrypoint plus static assets that `wrangler deploy` can publish as a single Workers application.

High-level architecture:
- **Worker script** handles SSR/route handlers/middleware and can access platform bindings.
- **Workers Assets** serves static assets (and can be fetched via `env.ASSETS.fetch()` when needed).

## 2) Concrete build/deploy steps

### A. Dependencies
From the app root (or repo root if deploying from monorepo root), add:
- `@opennextjs/cloudflare` (runtime adapter + build tooling)
- `wrangler` (Cloudflare CLI/deploy)

Examples (pnpm):
- `pnpm add @opennextjs/cloudflare@latest`
- `pnpm add -D wrangler@latest`

### B. Wrangler configuration (output artifacts + bindings)
Cloudflare’s guide uses an OpenNext build output layout like:
- Worker entry: `.open-next/worker.js`
- Static assets: `.open-next/assets`

Add `wrangler.toml` (or `wrangler.jsonc` latest and prefered) at the deploy root with:
- `main = ".open-next/worker.js"`
- `assets = { directory = ".open-next/assets", binding = "ASSETS" }`
- `compatibility_flags = ["nodejs_compat"]`
- `compatibility_date` **>= `2024-09-23`**

Example (toml):
```toml
name = "dub"
main = ".open-next/worker.js"
compatibility_date = "2026-01-10"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

Bindings (D1/KV/R2/DO/etc.) are declared in the same `wrangler.toml` and become available to the app via the OpenNext context APIs (see “Bindings” section below).

### C. OpenNext adapter configuration
Create `open-next.config.ts` at the deploy root:
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

This file is also where you configure caching behavior (ISR/data cache) using the adapter’s caching options.

### D. Package scripts (build/preview/deploy)
Cloudflare’s guide recommends these scripts (names can vary, but keep the same underlying commands):
- `preview`: `opennextjs-cloudflare build && opennextjs-cloudflare preview`
- `deploy`: `opennextjs-cloudflare build && opennextjs-cloudflare deploy`
- `cf-typegen`: `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts`

Notes:
- `opennextjs-cloudflare build` runs `next build` and then transforms the output into the `.open-next/` Worker+assets format.
- `opennextjs-cloudflare preview` runs the output on **workerd** (Workers runtime) locally, which is closer to production behavior than `next dev`.

### E. Local development workflow
Best-practice loop:
1. Use `next dev` for the fastest DX.
2. Regularly validate with `npm/pnpm run preview` so you catch runtime mismatches early.
3. Deploy with `npm/pnpm run deploy`.

### F. Environment variables & Workers Builds
If you deploy via **Workers Builds** (Cloudflare’s managed CI), Cloudflare notes you must configure build-time environment variables (both `NEXT_PUBLIC_*` and non-public vars) so SSG/inline build steps can run correctly.

This matters for Next specifically because build-time evaluation (SSG, config inlining, etc.) will otherwise diverge.

### G. Bindings in app code
OpenNext provides a way to access Worker bindings (D1/KV/R2/DO, plus `cf` and `ctx`) from inside route handlers/server code.

Also recommended:
- Generate binding types with `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` and include them in TS config.

### H. Output artifacts (what gets deployed)
- `.open-next/worker.js`: the Worker entry module used by `wrangler deploy`.
- `.open-next/assets/`: static asset directory uploaded/served via Workers Assets.

Operational note:
- Workers have upload size limits; `wrangler deploy` prints both uncompressed and gzip sizes. The compressed size is the one that matters for the limit.

## 3) Limitations / pitfalls (Workers constraints + Next specifics)

### A. Runtime model differences
Even with `nodejs_compat`, Workers is not “full Node”. Cloudflare:
- Natively supports many Node APIs, but some are partial/stubs.
- Polyfills remaining APIs via Wrangler/unenv; calling unimplemented methods can throw runtime errors.

Practical guidance:
- Avoid depending on Node-only behavior unless you’ve validated via `opennextjs-cloudflare preview`.
- Prefer Web Platform APIs (Fetch, WebCrypto, Streams) where possible.

### B. Next.js runtime constraints
- The Cloudflare adapter currently targets the **Next.js Node runtime**, not the Edge runtime.
  - Remove `export const runtime = "edge"` where present.
- “Node.js in Middleware” (introduced in Next 15.2) is called out as **not yet supported**.

### C. Middleware
- Standard Next Middleware is supported, but you must treat it as Workers-compatible code.
- If middleware depends on Node-only APIs (or newer “Node middleware” behavior), you will hit runtime issues.

### D. Image optimization
- Cloudflare’s guide indicates “Image optimization” is supported **via Cloudflare Images**.

Pitfall:
- Next’s default image optimizer often relies on native deps (like `sharp`) in traditional Node deployments; on Workers, you generally need to switch to a Cloudflare-native approach.

Recommended direction:
- Use Cloudflare Images (or Cloudflare Image Resizing) as the optimization layer and configure Next accordingly (typically via a custom loader or disabling the built-in optimizer when necessary).

### E. Static assets routing and precedence
Workers Assets default behavior is “asset-first”: if a request matches an uploaded asset, the asset is served without invoking your Worker.

If you need to ensure the Worker runs first for certain routes (auth gating, rewriting, etc.), use `assets.run_worker_first` patterns — but be aware that running the Worker first can increase asset latency.

### F. Size & cold start
Even though Cloudflare has improved OpenNext bundle size and cold start behavior, these are still practical risks for a large monorepo Next app.

Mitigations:
- Keep dependencies tight (avoid bringing in server-only heavyweight packages).
- Track worker gzip size from `wrangler deploy` output.

## 4) Alternatives considered

### Alternative A: `@cloudflare/next-on-pages`
- Pros: historically popular for Cloudflare.
- Cons: it targets **Pages** (and the user requirement is Workers-only), and Cloudflare has signaled preference for OpenNext for modern Next versions.

Decision: Reject (violates Workers-only constraint, less aligned with Cloudflare’s current recommendation).

### Alternative B: Static export (`next export`) + separate API Worker
- Pros: simplest runtime surface; avoids SSR complexity.
- Cons: Dub needs authenticated dashboard + dynamic server behavior; a pure static export likely cannot cover the full product without significant changes.

Decision: Keep as a fallback for a limited “marketing/docs-only” deployment, not for Dub’s full app.

### Alternative C: Rewrite to a Workers-native framework (Hono/Remix/React Router, etc.)
- Pros: best fit to Workers primitives, often smaller/faster.
- Cons: extremely high migration cost; does not meet the short-term objective of hosting an existing Next.js 15 codebase.

Decision: Reject for initial migration; consider only if Next compatibility becomes a blocker.

---

## 5) D1 as the primary database for a multi-tenant SaaS (best practices)

This section documents practical patterns for using **Cloudflare D1** (SQLite semantics) as the authoritative primary database for a multi-tenant SaaS running on **Cloudflare Workers**.

### 5.1 Decision

**Recommend**: Use a **single shared D1 database** with strict **row-level tenant isolation** (`workspace_id` / `project_id`) in *every* table and query, plus a small set of supporting patterns:

- Use **Wrangler D1 migrations** as the source of truth for schema changes.
- Use **prepared statements + bind parameters** for all queries.
- Use **`db.batch()`** to reduce round-trips and to get transactional semantics when you need multi-statement atomicity.
- If you enable **Global read replication**, use **D1 Sessions API** (`db.withSession(...)`) to ensure **sequential consistency** and “read your writes”.

**Why this is the default**:
- It fits D1’s operational model (simple binding, simple migrations).
- It scales operationally without needing “N databases for N tenants” bindings.
- It matches Dub’s existing multi-tenant model (workspace isolation), just swapping the backing store.

### 5.2 Alternatives (and when to pick them)

#### Alternative A: One D1 database per tenant

**When it’s attractive**:
- Hard isolation requirements (compliance, enterprise customers).
- You need per-tenant backup/restore/time-travel operations and blast-radius reduction.

**Tradeoffs**:
- Workers scripts have a finite binding budget; Cloudflare notes you can bind thousands of D1 DBs per Worker (~5k as a rough bound for bindings in script metadata). You can request higher per-account DB limits, but operational complexity remains.
- You need a routing layer (map tenant → database binding/id) and operational automation (provisioning, migrations per tenant).

**Pragmatic hybrid**:
- Default: shared DB.
- Enterprise tier: dedicated DB per tenant.

#### Alternative B: “Shard” tenants across a few databases

Use a small number of D1 databases (e.g., 4–32) and map tenants to shards.

**Pros**: reduces hot-spotting and contention, and improves operational blast radius.
**Cons**: still adds routing logic and makes cross-tenant reporting harder.

---

## 6) Schema & migrations

### 6.1 Schema design for multi-tenancy

**Principle**: every table that stores tenant-owned data must include a non-null `workspace_id` (or `projectId`), and every query must filter by it.

Recommended schema conventions:
- **`workspace_id` column on all tenant-scoped tables**.
- **Composite indexes** to keep common tenant queries fast: `(workspace_id, <lookup_key>)`.
- **Uniqueness** enforced per tenant using unique composite indexes (SQLite-style): e.g. unique on `(workspace_id, slug)`.
- Prefer **stable IDs** (UUID/ULID/KSUID-style string IDs) for primary keys when possible.

Foreign keys:
- D1 supports **enforced foreign keys**; Cloudflare docs note D1 enforces foreign keys by default (equivalent to `PRAGMA foreign_keys=on`).
- For multi-tenancy, include `workspace_id` in foreign key relationships when it helps prevent cross-tenant joins/links.

### 6.2 Migrations workflow (recommended)

Use **Wrangler-managed migrations**:
- Create: `wrangler d1 migrations create <db_name> <migration_name>`
- Apply (remote): `wrangler d1 migrations apply <db_name> --remote`
- Apply (local): `wrangler d1 migrations apply <db_name> --local`

Cloudflare’s migrations model is intentionally simple:
- Migration files are SQL.
- Ordered by a version prefix in filenames.
- Wrangler can list unapplied migrations and apply remaining ones.

Monorepo note:
- Wrangler supports `migrations_dir` on `[[d1_databases]]`, which is useful if you want the migration folder to live under `apps/web/` (or a shared `packages/` location).

### 6.3 Drizzle migrations vs Wrangler migrations

If you choose Drizzle for schema typing:
- Use **Drizzle Kit** to *generate* SQL migrations (from typed schema) into a folder Wrangler can use.
- Use **Wrangler** to *apply* migrations to D1 in local/preview/prod.

This keeps Cloudflare’s environment model (local/preview/remote) consistent while still getting type-safe schema definitions.

---

## 7) Local dev workflow (Workers + D1)

### 7.1 Local DB and persistence

Cloudflare recommends using Wrangler’s local D1 support:
- By default, Wrangler v3+ persists local data across `wrangler dev` runs.
- If you need repeatable tests, explicitly reset tables (or use a dedicated persisted directory).
- Use `wrangler dev --persist-to=/path/to/file-or-dir` to persist to a known location (shareable within a team).

### 7.2 Local migrations

Run migrations against local D1 using:
- `wrangler d1 migrations apply <db_name> --local`

For programmatic tests, Cloudflare documents `unstable_dev()` as a way to spin up a Worker + D1 locally, with a `preview_database_id` configured so the test harness can run migrations and queries against a consistent local DB.

### 7.3 Remote dev (optional)

Wrangler separates local and remote data by default. If you use `wrangler dev --remote` or remote bindings:
- Be explicit: remote changes are real and not easily undone.
- Consider gating remote dev behind explicit scripts/flags (e.g., `pnpm dev:remote`) to avoid accidental production writes.

---

## 8) Query patterns (performance + safety)

### 8.1 Always use prepared statements + bind

Cloudflare’s D1 API is built around `prepare(...).bind(...).run()/all()/first()/raw()`.

Guidance:
- Use `bind()` for all dynamic values to prevent SQL injection.
- Prefer `all<T>()` / `first<T>()` with TypeScript generics to keep types aligned.

Note: D1’s parameter binding follows SQLite’s `?` and `?NNN` conventions; named parameters are not currently supported.

### 8.2 Use `db.batch()` to reduce latency

Cloudflare explicitly recommends batching when you have multiple statements:
- A `batch()` call reduces network round trips.
- D1 guarantees statements execute sequentially.
- Cloudflare documents `batch()` as having **transaction semantics**: if a statement fails, the sequence aborts / rolls back.

Practical usage:
- Wrap “write + derived write + audit write” sequences into a batch.
- Avoid huge batches; each statement still counts toward per-query limits.

### 8.3 Index-first design

Cloudflare’s guidance mirrors standard SQLite:
- Add indexes on columns frequently used in `WHERE` predicates.
- Use composite indexes for common multi-column predicates (often `(workspace_id, ...)`).
- Validate with `EXPLAIN QUERY PLAN ...`.
- After creating indexes, run `PRAGMA optimize` to collect stats and help the query planner.

### 8.4 Observability: leverage `meta`

D1 query results include metadata that can help tune the system:
- Rows read/written, query duration, and (for replication) whether the query was served by primary and which region served it.

---

## 9) Transactions, consistency, and replication

### 9.1 Transaction semantics

D1 behaves like SQLite with **auto-commit** for single statements.

Recommended approach on Workers:
- Use `db.batch()` when you need multi-statement atomicity.
- Keep transactions short; Workers requests are short-lived and should not hold long-running locks.

### 9.2 Consistency model & “read your writes”

When you turn on D1 **Global read replication**, reads may be served by replicas.

Cloudflare’s best-practice is to use **Sessions API** for sequential consistency:
- `env.DB.withSession()` starts a session whose queries are sequentially consistent.
- `withSession("first-primary")` routes the session’s first query to the primary (best for flows that must see the latest write).
- You can “round-trip” the session bookmark across requests (e.g., header/cookie) and start a new session from that bookmark to preserve a user’s monotonic reads.

Operational guidance:
- Use Sessions for user-facing flows that depend on immediate read-after-write correctness (login, link creation → redirect, permission changes).
- For purely read-heavy endpoints where slightly stale reads are acceptable, you can start sessions unconstrained for latency.

### 9.3 Retries

Cloudflare now automatically retries read-only queries up to two times on retryable errors, exposing the attempt count via result metadata.

Still recommended:
- Implement application-level retries with exponential backoff + jitter for *idempotent* operations beyond read-only queries.
- Consider Cloudflare’s suggested helper library `@cloudflare/actors` (or equivalent logic) for retry loops.

---

## 10) Recommended Node/TypeScript libraries for Workers

### 10.1 Decision

**Recommend**: start with **raw D1 + a small typed query layer**, then adopt **Drizzle** for schema typing/migrations once the Workers deployment path is stable.

Rationale:
- Raw D1 API is the most direct, debuggable, and perfectly aligned with Cloudflare’s runtime.
- Drizzle has explicit Cloudflare D1 support and provides strong type-safety without requiring a Node-native database driver.
- Kysely is a good option for teams that prefer a query builder over an ORM; you’ll typically use a D1 dialect adapter.

### 10.2 Options

#### Option A: Raw SQL (Workers D1 API)

Best for:
- Maximum compatibility and minimum dependencies.
- Performance-sensitive hot paths (redirect lookups).

You’ll primarily use:
- `env.DB.prepare(sql).bind(...).first()/all()/run()`
- `env.DB.batch([...])`
- `env.DB.withSession(...)` when using replication.

#### Option B: Drizzle ORM

Best for:
- Typed schema, safer refactors, and a modern TS DX.
- Keeping SQL close while still gaining types.

Suggested migration stance:
- Generate SQL migrations with Drizzle Kit.
- Apply migrations with Wrangler.

Minimal Workers setup (per Drizzle docs):
```ts
import { drizzle } from "drizzle-orm/d1";

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(req: Request, env: Env) {
    const db = drizzle(env.DB);
    // await db.select().from(users).all();
    return new Response("ok");
  },
};
```

#### Option C: Kysely

Best for:
- Type-safe query builder with minimal “ORM magic”.

Implementation note:
- Use a Cloudflare D1 dialect adapter (community-maintained), e.g. `kysely-d1`.

Minimal Workers setup:
```ts
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(req: Request, env: Env) {
    const db = new Kysely({ dialect: new D1Dialect({ database: env.DB }) });
    // await db.selectFrom("users").selectAll().execute();
    return new Response("ok");
  },
};
```

Transaction note:
- Kysely’s `db.transaction()` requires dialect support for interactive transactions.
- Even if a given D1 dialect does not support interactive transactions, you can still model atomic multi-step operations using **D1 `batch()`** (transactional semantics) at a lower level.

#### Option D: Prisma (generally not recommended as default)

Prisma has had various forms of Workers/D1 support in preview over time, but tends to be heavier and may run into Workers constraints (for example, WASM/query engine behaviors and transaction support limitations).

Recommendation:
- Consider Prisma only if you already have deep Prisma investment and are willing to accept potential Workers-specific constraints and an evolving support story.

---

## 11) Primary references

- Cloudflare D1 best practices (migrations, local dev, retries, indexes, replication): https://developers.cloudflare.com/d1/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- D1 Worker Binding API: https://developers.cloudflare.com/d1/worker-api/
- D1 Sessions API / read replication: https://developers.cloudflare.com/d1/best-practices/read-replication/
- Retry queries guidance: https://developers.cloudflare.com/d1/best-practices/retry-queries/
- Use indexes: https://developers.cloudflare.com/d1/best-practices/use-indexes/

---

## Cloudflare primary references
- Cloudflare Docs: Next.js on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare Blog: OpenNext adapter announcement: https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/
- Cloudflare Docs: `nodejs_compat` and Node API coverage: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Cloudflare Docs: Workers Assets binding + routing behavior: https://developers.cloudflare.com/workers/static-assets/binding/

---

# Research: Click + conversion analytics with Workers Analytics Engine (WAE)

This section documents best practices for recording and querying click/conversion events using **Cloudflare Workers Analytics Engine** (WAE) for Dub-like short links.

## 12) Decision recommendation

**Recommend**: Use **Workers Analytics Engine** as the primary store for **aggregated analytics** (clicks/conversions) and query it via the **SQL API**, with an event schema optimized for Dub’s most common read patterns.

Concrete approach:
- Write a **single canonical event** per “thing you want to count” (click, conversion), using `doubles[0] = 1`.
- Choose an **index** that matches how users query analytics (usually **workspace**-scoped, sometimes **workspace+link** for drilldowns).
- When you have multiple incompatible query patterns, **double-write** the same logical event into multiple datasets / indices (Cloudflare explicitly notes this is often OK; inefficient reads are the bigger risk).

**Rationale**:
- WAE is designed for **high-cardinality time-series aggregates**, and writes are **non-blocking** from Workers.
- Sampling is **index-aware**; if you align your index to customer-facing analytics views, you keep accuracy high where it matters.
- Querying is via a simple SQL API and can be used from **Workers** (server-side) or **Grafana**.

## 13) Event shape design

### 13.1 Data point model constraints (from Cloudflare)

WAE datapoints are:
- `blobs`: up to **20 strings** (dimensions for filtering/grouping)
- `doubles`: up to **20 numbers** (metrics)
- `indexes`: **one string** sampling key

Limits to design around:
- Total blob payload per datapoint: **16 KB**
- Index length: **96 bytes**
- Up to **250 datapoints per Worker invocation**
- Retention: **3 months**

### 13.2 Recommended canonical event (logical model)

Model clicks and conversions as the same logical “event record” with an explicit `event_type` dimension.

Recommended dimensions (map into `blob1..blobN`):
- `workspace_id` (always include somewhere, even if also in index)
- `event_type` (`"click" | "conversion"`)
- `link_id` (Dub link id)
- `domain` (host)
- `path` or `short_code` (whichever you use to resolve)
- `country` (e.g., `request.cf.country`)
- `colo` (e.g., `request.cf.colo`) if useful for ops/debugging
- `referrer_host` (normalized; avoid full referrer URL unless you truly need it)
- `device` / `ua_family` (prefer coarse buckets)
- `utm_source` / `utm_medium` (only if you need reporting on them; consider normalizing)

Recommended metrics (map into `double1..doubleN`):
- `double1`: `1` (the count)
- `double2`: `latency_ms` (optional)
- `double3`: `revenue` (optional, if you track value per conversion)

WAE automatically includes `timestamp`, and exposes `index1`, `blob1..blob20`, `double1..double20` as query columns.

### 13.3 Don’t store what you can derive

To keep cardinality and blob size sane:
- Prefer `link_id` over full destination URL in WAE.
- Prefer `referrer_host` over `referrer_url`.
- Prefer `ua_family` / `device_class` over raw UA strings.
- Consider hashing ultra-high-cardinality fields if you only need grouping (but note you’ll lose “human readable top referrers/pages” without a lookup table).

## 14) Indexing + cardinality considerations (the most important part)

### 14.1 How WAE sampling works (practical implications)

Sampling is driven primarily by the **index**:
- At high write rates into a single index, WAE uses **equitable sampling** (normalizes storage across indices).
- At query time, WAE may use **adaptive bit rate (ABR)** sampling for long time ranges / complex queries.

Cloudflare guidance: do **not** write a unique index per row (like a UUID) for typical analytics use cases; it hurts aggregate query quality/perf.

### 14.2 Choosing an index for Dub analytics

Pick the index that matches “how users look at analytics”:

**Default index (recommended)**: `workspace_id`
- Best for workspace dashboards: “Top links”, “Clicks over time”, “Conversions over time”, etc.
- Keeps sampling fairness across workspaces.

**Drilldown index (recommended)**: `workspace_id:link_id`
- Best for “single link analytics” and funnel-style queries that must be accurate per link.
- Use when link-level analytics is a first-class view.

**Avoid** indexing on very broad keys like `hostname` alone if your product is multi-tenant and users expect tenant-scoped views.

### 14.3 Double-writing is often the right trade

If you need both workspace rollups and per-link drilldowns, prefer:
- Dataset A: `events_by_workspace` indexed by `workspace_id`
- Dataset B: `events_by_link` indexed by `workspace_id:link_id`

This keeps the read patterns efficient and statistically meaningful. Cloudflare’s WAE FAQ explicitly calls out that avoiding double-writing is a common misconception; inefficient reads can be worse than extra writes.

## 15) Querying patterns (SQL) + correctness with sampling

### 15.1 Always account for sampling

When counting events, use:
- `SUM(_sample_interval)` instead of `COUNT()`

When summing metrics (like revenue in `double2`), use:
- `SUM(_sample_interval * double2)`

For averages:
- `SUM(_sample_interval * doubleX) / SUM(_sample_interval)`

For quantiles (p50/p95 latency), use weighted quantiles:
- `quantileExactWeighted(0.95)(doubleX, _sample_interval)`

### 15.2 Common query templates

**Top links (last 24h) for one workspace** (dataset indexed by workspace):
```sql
SELECT
  blob3 AS link_id,
  SUM(_sample_interval) AS clicks
FROM events_by_workspace
WHERE
  timestamp > NOW() - INTERVAL '1' DAY
  AND index1 = 'ws_123'
  AND blob2 = 'click'
GROUP BY link_id
ORDER BY clicks DESC
LIMIT 50
```

**Clicks over time (5-min buckets)**:
```sql
SELECT
  intDiv(toUInt32(timestamp), 300) * 300 AS t,
  SUM(_sample_interval) AS clicks
FROM events_by_workspace
WHERE
  timestamp > NOW() - INTERVAL '7' DAY
  AND index1 = 'ws_123'
  AND blob2 = 'click'
GROUP BY t
ORDER BY t
```

**Conversions over time** is the same query with `blob2 = 'conversion'`.

**Conversion rate** (recommended approach): run two queries (clicks + conversions) and compute `conversions / clicks` in application code.

Why: WAE doesn’t support joins, and conditional aggregation support can vary; two simple queries are more robust and still cheap.

**Latency p95 by country**:
```sql
SELECT
  blob6 AS country,
  quantileExactWeighted(0.95)(double2, _sample_interval) AS p95_ms
FROM events_by_workspace
WHERE
  timestamp > NOW() - INTERVAL '1' DAY
  AND index1 = 'ws_123'
  AND blob2 = 'click'
GROUP BY country
ORDER BY p95_ms DESC
LIMIT 50
```

### 15.3 Debugging sampled results

Two useful heuristics from Cloudflare:
- Use `_sample_interval` to understand sampling and to compute unbiased aggregates.
- If you’re extrapolating from only a tiny number of rows, results will be noisy; a larger number of rows scanned usually yields more stable answers.

## 16) Retention strategy

Cloudflare retention for WAE is **three months**.

Recommended policy:
- Use WAE for “recent analytics” (UI defaults like last 24h/7d/30d/90d).
- If you need longer retention (e.g., yearly cohorts, long-term attribution), export/duplicate events into a long-term store:
  - Tinybird/ClickHouse (fits well with time-series + group-by queries)
  - R2 + periodic ETL (cheaper storage, slower queries)
  - A warehouse (BigQuery/Snowflake) if you already have one

## 17) Exposing analytics to the app (securely)

### 17.1 Server-side query proxy (recommended)

Do **not** query the WAE SQL API directly from the browser (it would require exposing a Cloudflare API token).

Instead:
- Create a server-side analytics endpoint (Worker route / Next.js route handler) that:
  - Authenticates the Dub user/workspace
  - Builds bounded SQL (time range, workspace scope, limits)
  - Calls the WAE SQL API via `fetch` from the Worker
  - Returns a normalized JSON payload to the frontend

Cloudflare recommends storing:
- Account ID as a Worker environment variable
- API token as a Worker secret

### 17.2 Caching + cost control

WAE pricing is per query, so treat analytics endpoints like a read-heavy system:
- Cache common aggregates (e.g., top links last 24h, 7d timeseries) for 30–120s using the Cache API or KV.
- Enforce maximum time ranges in your API (e.g., cap at 90 days unless user is on an enterprise plan).
- Always `LIMIT` top-N queries.

### 17.3 External dashboards (Grafana)

For internal ops / power users:
- Use Grafana with the ClickHouse data source plugin (Cloudflare recommends the Altinity plugin) pointing to the WAE SQL endpoint.
- Provide a scoped token with `Account | Account Analytics | Read`.

## 18) Alternatives considered

### Alternative A: Logs-first pipeline (Tail Workers / Logpush → warehouse)

**Pros**: raw events, joins, exactness, long retention.
**Cons**: higher ingest/storage costs; more infrastructure; slower “time to first dashboard”.

### Alternative B: D1 (or Postgres/MySQL) counters/rollups

**Pros**: exact counts; easy joins to app data; long retention.
**Cons**: hot-write amplification at high click volume; more operational risk; requires careful sharding/rollups.

### Alternative C: Third-party analytics (Segment/GA/etc.)

**Pros**: mature UI; attribution tooling.
**Cons**: data ownership, privacy/compliance constraints, limited multi-tenant “bring your own analytics” patterns.

---

## 19) Primary references (Cloudflare)

- Workers Analytics Engine overview: https://developers.cloudflare.com/analytics/analytics-engine/
- Get started + time-series grouping example: https://developers.cloudflare.com/analytics/analytics-engine/get-started/
- SQL API (auth, table schema, sampling): https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- Querying from a Worker (proxy pattern): https://developers.cloudflare.com/analytics/analytics-engine/worker-querying/
- Sampling guide + how to select an index: https://developers.cloudflare.com/analytics/analytics-engine/sampling/
- Limits + retention: https://developers.cloudflare.com/analytics/analytics-engine/limits/
- Grafana integration: https://developers.cloudflare.com/analytics/analytics-engine/grafana/

---

# Research: Rate limiting + caching with Durable Objects (Workers)

This section documents best practices for implementing **rate limiting** and related **caching** in Cloudflare Workers using **Durable Objects (DO)**.

## 20) Decision recommendation

**Recommend**: Use **Durable Objects** for rate limits that require **atomic counters / strong consistency** (per-IP, per-link, per-workspace, per-token), and use a **two-tier cache** to reduce DO load:

- **Tier A (optional)**: short-lived edge memoization using **Cache API** for “allow” decisions (and sometimes “deny” decisions) with very small TTLs.
- **Tier B (authoritative)**: DO implements the actual algorithm and persists counters in **DO Storage**.

**Rationale**:
- Durable Objects provide **strongly consistent** storage colocated with the object and a **single-threaded execution model** that makes read-modify-write safe (Cloudflare describes this as “input gates” protecting against unwanted concurrency).
- Workers KV is **eventually consistent** and has a **1 write/sec per key** limit via the Workers Binding API, which makes it a poor fit for counters under load.
- Cache API is **data-center local and ephemeral**, so it’s useful to reduce repeat work but not to be the source of truth.

## 21) Core patterns

### 21.1 Pick the right keying/sharding strategy (avoid a global singleton)

Cloudflare explicitly calls out using a single DO as a **global singleton** (for global counters/rate limits) as an anti-pattern and a bottleneck. Instead, scope DO instances to a key that naturally partitions load.

Recommended scopes:
- **Per-IP DO**: `idFromName("ip:" + ip)`
  - Great for upstream protection: the DO will usually be geographically close to that IP and spreads load across many objects.
- **Per-link DO**: `idFromName("link:" + linkId)`
  - Useful when protecting a small set of hot links, but can create hotspots if a single link gets massive traffic.
- **Per-workspace / per-api-token DO**: `idFromName("ws:" + workspaceId)` or `idFromName("token:" + tokenId)`
  - Often best for dashboard/API protection.

Hot-key mitigation (when a single key is too hot):
- **Shard by hash**: `idFromName("link:" + linkId + ":shard:" + (hash(ip) % N))`
  - Trades strict global ordering for higher throughput.
- **Two-level design**: a control-plane DO that routes to a shard DO based on consistent hashing (Cloudflare’s “data/control/management planes” reference architecture shows this sharding mindset).

### 21.2 Atomic counters (read-modify-write)

Durable Objects are well-suited for atomic counters because:
- Execution is single-threaded, and storage operations are serialized such that common read-modify-write patterns are safe.

Two practical implementations:

**Option A: KV-style counter in DO storage (simple)**
- Store a single numeric value per key (or per bucket) via `this.ctx.storage.get()` / `put()`.
- Rely on DO concurrency guarantees (“input gates”) to avoid lost updates.

**Option B: SQLite-backed DO storage (best for complex windows)**
- Use the SQLite storage backend (Cloudflare recommends it for new DO namespaces).
- Store per-bucket rows and update using SQL.
- Prefer fewer rows/updates (buckets), not one row per request.

Rule of thumb:
- If you only need “requests in the last minute” and it’s low-ish throughput, KV-style is fine.
- If you need multiple dimensions (per-route, per-action) and cleanup/queries, SQLite tables are cleaner.

### 21.3 Rate-limiting algorithms

#### A) Token bucket (recommended for upstream protection / RPS style)

Cloudflare’s DO rate limiter example uses a **token bucket** and the **Alarms API** to replenish tokens.

Best-practices from that approach:
- Don’t schedule an alarm for every token (too many invocations); instead, replenish tokens in **bulk** on a coarser interval.
- Keep the DO state minimal: current token count + last update timestamp.

#### B) Fixed window counter (cheapest, but bursty at boundaries)

Pattern:
- Bucket key = `floor(now / windowMs)`
- Counter increments for the current window.

Pros: minimal computation.
Cons: allows “double burst” around the boundary (end of window + start of next window).

#### C) Sliding window counter via 2 buckets (good balance)

Pattern:
- Track counts for the **current** and **previous** window.
- Approximate the sliding window by weighting the previous bucket by how far you are into the current window.

Pros: cheap, good approximation.
Cons: still approximate (not exact).

#### D) Sliding log (exact, usually too expensive)

Pattern:
- Store timestamps for each request.
- Prune timestamps older than window.

Pros: exact.
Cons: storage grows with rate; pruning work per request; generally not worth it at high scale.

### 21.4 TTL + cleanup

Common DO cleanup patterns:
- Store a `lastSeenAt` timestamp and delete old buckets/rows lazily when handling requests.
- Use the **Alarms API** for periodic cleanup when you need predictable retention or want to batch work.

Keep cleanup cheap:
- Prefer coarse cleanup intervals.
- Prefer deleting whole windows/buckets, not individual request records.

## 22) Caching around rate limiting (reducing DO hits)

### 22.1 Cache API as a short-lived “decision memo”

Cloudflare describes the Cache API as an **ephemeral** key-value store where the URL is the key and the response is the value, scoped to the local data center.

Useful pattern:
- If DO says “allowed”, write a tiny `200` response into Cache API for a small TTL (e.g., 0.25–2s) keyed by `(scope, ip/link, route)`.
- Subsequent identical requests in the same colo can skip the DO call during micro-bursts.

Tradeoffs:
- Cache API is not globally coherent, so it can over-allow briefly across colos. This is usually acceptable for “soft” limits.
- If you cache “deny” responses, you reduce DO load further but can amplify false positives if the limit state changes quickly.

### 22.2 What NOT to cache

- Don’t try to use Cache API or KV as your authoritative counter store.
- Don’t cache long-lived allow decisions unless you’re intentionally implementing a coarse-grained limit.

## 23) Fail-open vs fail-closed (decision guide)

When the limiter backend is unavailable (DO exceptions, timeouts, transient platform issues), decide explicitly.

**Fail-closed** (return `429` / `503` when limiter fails) when:
- Protecting something costly or unsafe to overload (paid third-party API, login brute-force prevention, admin endpoints).
- Abuse risk is worse than occasional false blocks.

**Fail-open** (allow request when limiter fails) when:
- The endpoint is core to availability (short-link redirects, read-only public pages) and blocking would cause an outage.
- You have secondary safeguards (bot detection, WAF rules, upstream capacity).

Practical hybrid:
- Fail-open for public redirect traffic but emit structured logs/metrics and apply a secondary “soft” limit in Cache API to dampen obvious bursts.
- Fail-closed for sensitive write endpoints (auth, token minting, link creation) with a user-friendly `429` and `Retry-After`.

## 24) Performance tradeoffs: Durable Objects vs KV vs Cache API

### 24.1 Durable Objects

Pros:
- Strong consistency + safe read-modify-write (ideal for counters and coordination).
- Data locality (object lives near where it’s first accessed; per-IP scoping keeps latency low).

Cons:
- Each DO instance is single-threaded for synchronous JS; a single hot key can bottleneck.
- Cross-region traffic to a single object adds latency.

Best practices:
- Avoid global singletons.
- Shard hot keys.
- Avoid `blockConcurrencyWhile()` on every request; Cloudflare recommends using it sparingly (typically for one-time initialization).

### 24.2 Workers KV

Pros:
- Great for read-heavy configuration/session-like data; hot keys benefit from caching.

Cons (for rate limiting):
- **Eventually consistent**, so counters can be wrong.
- **1 write/sec per key** limit (Workers Binding API), which collapses under real rate-limiting workloads.

Good uses alongside DO:
- Store per-workspace rate-limit configs, allowlists/blocklists, feature flags.

### 24.3 Cache API / cache via `fetch`

Pros:
- Extremely fast edge-local caching; useful to absorb micro-bursts.
- Cache API can store Worker-generated responses; `fetch` caching can leverage more of Cloudflare’s caching features (including tiered caching), per Cloudflare guidance.

Cons:
- Not durable and not globally consistent.
- Cache API is local to a data center (and not compatible with tiered caching).

## 25) Alternatives

### Alternative A: Cloudflare WAF Rate Limiting Rules

If you don’t need custom per-link/workspace logic, Cloudflare suggests using built-in **Rate limiting rules**.

Pros: managed, simple, no code paths.
Cons: less application-aware (link/workspace semantics, custom headers/tokens).

### Alternative B: Central store (D1/Postgres) counters

Pros: easy reporting and joins.
Cons: hot write path, higher latency and contention risk; generally not ideal for per-request rate limiting.

### Alternative C: Best-effort limiting (Cache API only)

Pros: lowest latency and cost.
Cons: not enforceable globally; only useful as a “soft” throttle.

---

## 26) Primary references (Cloudflare)

- DO best practices (“Rules of Durable Objects”, including avoiding singletons + `blockConcurrencyWhile` guidance): https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- DO example: Build a rate limiter (token bucket + alarms): https://developers.cloudflare.com/durable-objects/examples/build-a-rate-limiter/
- DO example: Build a counter (notes about read-modify-write safety / input gates): https://developers.cloudflare.com/durable-objects/examples/build-a-counter/
- DO Alarms API: https://developers.cloudflare.com/durable-objects/api/alarms/
- Workers KV FAQ (eventual consistency + per-key write rate limit): https://developers.cloudflare.com/kv/reference/faq/
- Workers Cache in depth (“How the Cache works”, Cache API behavior): https://developers.cloudflare.com/workers/reference/how-the-cache-works/
- Choose a storage option (DO summary + when to use): https://developers.cloudflare.com/workers/platform/storage-options/
