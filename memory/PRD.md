# Scalable — Product Requirements Document

## Original Problem Statement
Build "Scalable," an AI-powered platform that converts SaaS backends into a public API Platform/PaaS. The platform enables SaaS teams to expose selected backend routes as a public developer API — with automatic OpenAPI spec generation, SDK generation, API key management, rate limiting, and sensitive field stripping — in minutes.

## Tech Stack
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **AI**: Claude via Emergent Universal Key (for code scanning)
- **Auth**: JWT (access + refresh tokens, brute-force protection)

## Architecture
```
/app
├── backend/
│   ├── server.py          # All API routes, auth, deploy logic
│   ├── gateway.py         # Reverse proxy, rate limiting, field stripping
│   ├── ai_agents.py       # Claude AI integration
│   ├── github_service.py  # GitHub repo file fetching
│   ├── demo_data.py       # Mock codebase fallback
│   └── demo_scan_results.py # Mock AI scan fallback
└── frontend/src/
    ├── App.js             # React routes
    ├── lib/api.js         # Axios instance
    ├── contexts/AuthContext.js
    ├── components/        # Sidebar, AppLayout, ProtectedRoute
    └── pages/
        ├── LoginPage.jsx, RegisterPage.jsx
        ├── DashboardPage.jsx
        ├── ConnectPage.jsx
        ├── EndpointsPage.jsx
        ├── KeysPage.jsx    # Phase 5
        └── DocsPage.jsx    # Phase 5
```

## Completed Phases

### Phase 1: Foundation + Auth + Dashboard ✅
- FARM stack setup, JWT auth (register, login, me, refresh, logout)
- Brute-force protection, admin seeding
- Dashboard with project listing

### Phase 2: Connect + AI Scan ✅
- GitHub file fetcher with demo_data.py mock fallback
- Claude AI code analysis and security auditing
- Route discovery with risk assessment (green/yellow/red)

### Phase 3: Endpoint Selection + Auth Config ✅
- Endpoint table with risk coloring, selection, rate limit config
- Auth config panel (backend URL, login endpoint, service account)
- Connection testing with mock fallback

### Phase 4: API Gateway + Deploy Flow ✅
- Reverse proxy at `/api/gateway/{slug}/{path}`
- API key validation, rate limiting, response field stripping
- Programmatic OpenAPI spec and SDK generation (fast, no AI timeout)
- Deploy animation overlay + success screen
- API Keys backend CRUD

### Phase 5: API Keys UI + Docs Page ✅ (Apr 16, 2026)
- **API Keys Management Page** (`/keys/:projectId`): Full table with prefix, status, created date, rate limit. Create modal with raw key display + copy + warning. Revoke confirmation modal with status change.
- **Public Docs Viewer** (`/docs/:slug`): No auth required. Top bar, left TOC panel, endpoint cards with method badges, curl examples, copy buttons, "Try It" feature, sensitive field notices. TOC groups by resource with scroll-to navigation.
- Backend `GET /api/projects/{slug}/docs-config` public endpoint
- Deploy stores `defaultApiKey` for docs "Try It" feature

## DB Collections
- `users`: email, passwordHash, name, githubId
- `projects`: userId, name, slug, repoUrl, targetBackendUrl, credentials, openApiSpec, sdkCode, defaultApiKey, status
- `discovered_routes`: projectId, method, path, description, risk, fieldsToStrip, rateLimit
- `exposed_endpoints`: projectId, method, path, isActive, rateLimit, fieldsToStrip
- `api_keys`: keyHash, keyPrefix, projectId, name, isActive, rateLimit
- `usage_logs`: keyHash, projectSlug, endpoint, method, statusCode, latencyMs, timestamp
- `rate_limits`: TTL-indexed rate counter per key per minute

## Remaining Tasks (Prioritized)

### P1 — Analytics Dashboard
- Build `/analytics/:projectId` UI showing gateway usage stats
- Charts: requests over time, status code distribution, latency
- Data source: `usage_logs` collection

### P2 — GitHub OAuth
- Wire up "Continue with GitHub" button (currently stubbed)

### P2 — AI-Enhanced Generation
- Move Claude-powered OpenAPI/SDK generation to background tasks
- Bypass 60s HTTP timeout via async processing

### Refactoring
- Break `server.py` (900+ lines) into `routers/` using APIRouter
