# Scalable — Product Requirements Document

## Original Problem Statement
Build "Scalable," an AI-powered platform that converts SaaS backends into a public API Platform/PaaS. The platform enables SaaS teams to expose selected backend routes as a public developer API — with automatic OpenAPI spec generation, SDK generation, API key management, rate limiting, and sensitive field stripping — in minutes.

## Tech Stack
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI + Recharts
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **AI**: Claude via Emergent Universal Key (for code scanning)
- **Auth**: JWT (access + refresh tokens, brute-force protection)

## Architecture
```
/app
├── backend/
│   ├── server.py          # All API routes, auth, deploy, analytics
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
        ├── DashboardPage.jsx  (skeleton loaders, real stats)
        ├── ConnectPage.jsx
        ├── EndpointsPage.jsx  (skeleton loaders, back button)
        ├── KeysPage.jsx       (Phase 5 - skeleton loaders, back button)
        ├── DocsPage.jsx       (Phase 5 - public, no auth)
        └── AnalyticsPage.jsx  (Phase 6 - Recharts, back button)
```

## All Phases Complete

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
- Programmatic OpenAPI spec and SDK generation
- Deploy animation overlay + success screen
- API Keys backend CRUD

### Phase 5: API Keys UI + Docs Page ✅ (Apr 16, 2026)
- API Keys Management Page (`/keys/:projectId`)
- Public Docs Viewer (`/docs/:slug`)
- Backend `GET /api/projects/{slug}/docs-config` public endpoint
- Deploy stores `defaultApiKey` for docs "Try It" feature

### Phase 6: Analytics Dashboard + Polish ✅ (Apr 16, 2026)
- **Analytics Dashboard** (`/analytics/:projectId`): 4 stat cards (Total Calls, Active Keys, Avg Latency, Error Rate), AreaChart for calls over time (last 7 days), horizontal BarChart for top endpoints, Recent Requests table
- **Backend analytics**: MongoDB aggregation pipelines on usage_logs (by day, by endpoint, recent 20)
- **Dashboard enrichment**: Live projects show real call counts and latency from usage_logs
- **Skeleton loaders**: Dashboard, Endpoints, Keys pages all have pulsing skeleton loading states
- **Back navigation**: Back buttons on Endpoints, Keys, Analytics pages
- **Responsive design**: Tables have overflow-x-auto, grids responsive from 1-4 columns

## DB Collections
- `users`: email, passwordHash, name, githubId
- `projects`: userId, name, slug, repoUrl, targetBackendUrl, credentials, openApiSpec, sdkCode, defaultApiKey, status
- `discovered_routes`: projectId, method, path, description, risk, fieldsToStrip, rateLimit
- `exposed_endpoints`: projectId, method, path, isActive, rateLimit, fieldsToStrip
- `api_keys`: keyHash, keyPrefix, projectId, name, isActive, rateLimit
- `usage_logs`: keyHash, keyName, projectSlug, endpoint, method, statusCode, latencyMs, timestamp
- `rate_limits`: TTL-indexed rate counter per key per minute

## End-to-End Demo Flow
1. Register/Login → Dashboard
2. Create Project (name + GitHub repo URL)
3. Connect Page → Scan repository (AI analyzes code)
4. Endpoints Page → Select safe endpoints, configure rate limits
5. Auth Config → Set backend URL, service account credentials, test connection
6. Deploy → Animated progress → Success screen with API key, gateway URL, docs link
7. Docs Page (public) → Browse endpoints, Try It, curl examples
8. Keys Page → Create/revoke API keys
9. Analytics → View usage stats, charts, recent requests

## Remaining Tasks (Backlog)
- P2: GitHub OAuth (wire up stubbed button)
- P2: AI-Enhanced OpenAPI/SDK via background tasks
- Refactoring: Break `server.py` into `routers/`
