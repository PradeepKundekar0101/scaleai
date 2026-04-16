# Scalable Platform — PRD

## Problem Statement
Scalable is an AI-powered platform that helps SaaS companies convert into PaaS by creating an API gateway, generating docs, and publishing SDKs. Phase 1 establishes the foundation with auth, dashboard, and project management.

## Architecture
- **Backend**: FastAPI (Python) on port 8001, MongoDB via Motor async driver
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI, port 3000
- **Database**: MongoDB (7 collections: users, projects, discovered_routes, exposed_endpoints, api_keys, rate_limits, usage_logs)
- **Auth**: JWT-based (PyJWT), bcrypt password hashing, Bearer token + httpOnly cookies

## User Personas
- **SaaS Developer**: Wants to expose internal APIs as a platform, manage API keys, and monitor usage
- **Platform Admin**: Seeds initial data, manages overall platform config

## Core Requirements (Static)
1. User registration/login with email+password
2. JWT-based authentication with protected routes
3. Project CRUD tied to authenticated user
4. Dashboard with project cards grid and empty state
5. Sidebar navigation (Dashboard, Connect, API Keys, Docs, Analytics, Settings)
6. Dark theme matching Linear/Vercel/Stripe aesthetic

## What's Been Implemented (Phase 1 — April 16, 2026)
- 7 MongoDB collections with indexes (users, projects, api_keys, exposed_endpoints, discovered_routes, rate_limits, usage_logs)
- Auth system: register, login, logout, refresh, /me endpoint
- Brute force protection (5 attempts = 15 min lockout)
- Admin seeding on startup
- Project CRUD (create with auto-slug, list by user, get by ID with ownership check)
- 10 stub routes returning 501 for future phases
- FastAPI Swagger docs at /api/docs
- Login + Register pages (split-screen layout with abstract background)
- Dashboard with empty state, project cards grid, new project modal
- Persistent 256px sidebar with nav items and user section
- Protected routes with auth context
- GitHub OAuth button (UI only, shows "coming soon" toast)

## What's Been Implemented (Phase 3 — April 16, 2026)
- POST /api/projects/:id/endpoints — saves selected endpoints to exposed_endpoints collection
- POST /api/projects/:id/test-connection — tests backend connection with mock fallback for unreachable servers
- Enhanced GET /api/projects/:id — includes routeBreakdown, discoveredRouteCount, exposedEndpointCount, connectionTested
- Endpoints configuration page (/endpoints/:projectId) — polished table with:
  - Green rows: selectable with green left border
  - Yellow rows: expandable showing fields to strip with strikethrough
  - Red rows: disabled with lock icon, reduced opacity
  - Method badges (GET=green, POST=blue, PUT=yellow, DELETE=red, PATCH=purple)
  - Editable rate limit inputs per endpoint
  - Risk dot tooltips showing riskReason
- "Select All Safe" button auto-selects all green routes
- Auth configuration section: backend URL, login endpoint (pre-filled), service account credentials
- Test Connection with success/failure UI and mock mode indicator
- Deploy button with smart enabled/disabled state (requires endpoints + connection)
- Dashboard project cards navigate to /endpoints for "configuring" status projects

## Prioritized Backlog
## What's Been Implemented (Phase 4 — April 16, 2026)
- API Gateway reverse proxy at /api/gateway/{slug}/{path}:
  - 11-step flow: resolve slug, validate API key, check endpoint exposure, rate limit, get auth token, forward request, filter response, log usage, set headers
  - 401 missing key, 403 invalid key, 404 endpoint not found, 429 rate limited, 502 backend unreachable
  - X-RateLimit-Limit/Remaining/Reset headers, X-Powered-By: Scalable
  - Sensitive field stripping with recursive deep filter
- Deploy endpoint (POST /api/projects/:id/deploy):
  - Generates OpenAPI 3.0 spec (programmatic with optional AI enhancement)
  - Generates TypeScript SDK with typed ScalableClient class
  - Creates API key (sk_live_...) with SHA-256 hash
  - Sets project status to "live"
- Public OpenAPI spec endpoint (GET /api/projects/{slug}/spec)
- Deploy progress overlay with 6 animated steps
- Deploy success screen with gateway URL, docs URL, SDK install, API key + copy buttons
- Dashboard shows "Live" badge with gateway URL for deployed projects

### P0 (Phase 5)
- API docs viewer page (/docs/{slug}) - render OpenAPI spec
- API keys management page (/keys) - CRUD operations
- Analytics dashboard (/analytics) - usage logs visualization

### P2 (Phase 4)
- SDK code generation
- Custom domain support
- GitHub OAuth full integration
- Settings page (profile, billing)

## Next Tasks
1. Implement repo scanning (POST /projects/:id/scan)
2. Route discovery and risk assessment
3. Endpoint configuration UI
4. API key CRUD
5. Analytics with usage logs
