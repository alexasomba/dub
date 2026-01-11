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

- **SC-001**: A new self-hoster can complete a first successful deployment to Cloudflare Workers in under 30 minutes following documented steps.
- **SC-002**: Public redirects succeed for at least 99.9% of requests over a 24-hour soak test in a Workers-hosted environment.
- **SC-003**: Workspace members can complete the primary management flow (sign in → create a link → verify redirect) with a first-attempt completion rate of at least 90%.
- **SC-004**: The Workers-hosted build has zero runtime failures caused by unsupported runtime capabilities during automated deployment validation.
- **SC-005**: Multi-tenant isolation is verified by automated tests: zero cross-workspace data access across representative API operations.

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
