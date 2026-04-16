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

## Prioritized Backlog
### P0 (Phase 2)
- Repository scanning / route discovery engine
- Endpoint configuration and exposure
- API key generation and management

### P1 (Phase 3)
- Analytics dashboard with usage charts
- Rate limiting enforcement on gateway
- OpenAPI spec generation

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
