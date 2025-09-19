# QMS Architecture Blueprint

This blueprint maps the system’s structure, responsibilities, data flow, and integration points across the backend and frontend.

## High-level Overview

- Client: React + Vite SPA
- API: Node.js (Express), ES modules
- Data: MongoDB via Mongoose
- Auth: Cookie-based JWT (HttpOnly), CSRF token per session
- Hardening: Helmet, rate limiting, sanitize, CORS
- Jobs: Weekly report scheduler

Request path example (happy path):

1. Browser → Frontend (React, Axios)
2. Frontend → Backend API (with credentials, CSRF header for writes)
3. Backend → MongoDB (Mongoose models)
4. Backend response → Frontend render

---

## Backend Blueprint (folder: `backend/`)

### Key Entry Points

- `src/server.js`
  - Validates environment (`config/env.js`)
  - Starts HTTP server
  - Connects DB and applies performance indexes (`utils/performanceIndexes.js`)
  - Starts weekly report scheduler (`jobs/weeklyReport.js`)
  - Graceful shutdown handlers (closes server, DB)
- `src/app.js`
  - Middleware chain: JSON limits → helmet → rate limiters → sanitize → cookies → CORS headers → routers → error handlers
  - Mounts API router at `/api`

### Configuration

- `src/config/index.js`
  - Loads `.env` with `dotenv`
  - Builds typed config: ENV/PORT/HOST, DB options, SECURITY, RATE_LIMIT, CORS, UPLOAD, REQUEST limits, LOG, EXTERNAL, FEATURES, BUSINESS, PAGINATION
  - Exposes getters: `getConfig`, `getDatabaseConfig`, `getSecurityConfig`, `getRateLimitConfig`, `getCorsConfig`, `getUploadConfig`, `isFeatureEnabled`
- `src/config/env.js`
  - Validates required env (JWT_SECRET, MONGODB_URI), formats, and production warnings
- `src/config/db.js`
  - Mongoose connection (URI, options)
- `src/config/defaults.js`
  - Default allowed origins and CORS config helper

### Middleware (security and behavior)

- `middleware/auth.js`
  - Loads env early (`dotenv/config`)
  - Verifies JWT from HttpOnly cookie `qms_token`
  - Helpers: `signToken(user)`, `setTokenCookie(res, token)`, `clearTokenCookie(res)`
- `middleware/csrf.js`
  - CSRF helper and validation (paired with token store)
- `middleware/validation.js`
  - Request validation via express-validator
- `middleware/roles.js`, `middleware/ownership.js`, `middleware/quotePermissions.js`
  - Role/ownership checks for protected operations
- `middleware/errorHandler.js`
  - Not-found and global error middleware (dev stack traces in development)

### Routes and Controllers

- `routes/index.js` (mounted at `/api`)
  - `GET /health`
  - `GET /csrf-token` (generates and returns CSRF token; stores metadata in tokenStore)
  - `POST /login` (bcrypt check, sets HttpOnly cookie)
  - `POST /logout` (clears cookie)
  - `GET /me` (returns current user profile; requires cookie)
  - Mounts sub-routers:
    - `routes/products.js` → `/api/products`
    - `routes/reports.js` → `/api/reports`
    - `routes/approvals.js` → `/api/approvals`
    - `routes/users.js` → `/api/users`
    - `routes/quotes.js` → `/api/quotes`
- `controllers/exportController.js`
  - Excel export (RFQ)

### Models (Mongoose)

- `models/User.js` (fields: username, email, firstName, lastName, roles, position, department, accessLevel, permissions, defaultApprover, …)
  - Virtuals: `fullName`, `isLocked`
  - Methods: `hasPermission`, static `getDefaultPermissions(accessLevel)`
- `models/RFQ.js`, `models/Quote.js`, `models/Product.js`, `models/ProductMaster.js`, `models/Approval.js`
  - Domain schemas for RFQs, Quotes, Product catalog, and approval flow

### Utilities & Jobs

- `utils/tokenStore.js` (in-memory CSRF token map)
- `utils/performanceIndexes.js` (ensures collection indexes exist and optimized)
- `utils/pagination.js`, `utils/fileOperations.js`, `utils/logger.js`
- `jobs/weeklyReport.js` (scheduled job; also invokable once)

### Scripts

- `scripts/seedAdmin.js` (seed admin using `ADMIN_USERNAME`/`ADMIN_PASSWORD` env)
- `scripts/migrateProducts.js` (imports CSV into Mongo)
- `scripts/validateSecurity.js`, `scripts/testMigration.js`, `scripts/loadSampleData.*`

### Security & Policies

- Auth: Cookie-based JWT (HttpOnly, SameSite=strict; Secure in prod)
- CSRF: `/csrf-token` issues per-session token; client sends `x-csrf-token` for mutating operations
- Rate limiting: Global + stricter on `/api/login`
- CORS: Allow-list with dev localhost convenience
- Input hardening: `express-mongo-sanitize`, JSON/body size limits, helmet

---

## Frontend Blueprint (folder: `frontend/`)

### App Shell

- `src/main.jsx`: Creates React root, imports `src/index.css`, loads dev-only safety utilities
- `src/App.jsx`: App state machine; manages login, profile fetch (`/api/me`), and view switching via local state and window events
- Providers: `ThemeProvider` (dark/light via `.light` class), `NotificationProvider`

### Navigation & Views

- No React Router; view switching with state (`view`) and custom events:
  - `window.dispatchEvent(new CustomEvent('navigate', { detail: 'rfq-create' }))`
  - `window.dispatchEvent(new CustomEvent('navigateWithQuote', { detail: 'quote-edit:<id>' }))`
- Pages: `NewDashboard.jsx`, `RFQCreate.jsx`, `QuoteEntry.jsx`, `QuoteManagement.jsx`, `CompareView.jsx`, `Approvals.jsx`, `Reports.jsx`, `Settings.jsx`, `UserManagement.jsx`, `Login.jsx`

### Components (selected)

- `ResponsiveAppHeader.jsx` — Theme toggle; left chip: `accessLevel • department • position`, right chip: `username • fullName`
- `AppNavigation.jsx` (left nav)
- `ResponsiveComponents.jsx` (ResponsiveGrid, ResponsiveTable)
- `StickyTable.jsx`, `QuoteAttachments.jsx`, `ErrorBoundary.jsx`, `NotificationSystem.jsx`, `MobileNavigation.jsx`
- `common/ProductTypeahead.jsx`

### Services & Config

- `services/api.js` (Axios):
  - Base URL from config; `withCredentials: true`
  - CSRF lifecycle: fetch `/csrf-token` and attach `x-CSRF-Token` on mutating requests; refresh on 403 token errors
  - Cookie-only auth: UI keeps an `authenticated` flag; no tokens in localStorage
- `config/index.js`:
  - Reads Vite env: `VITE_API_BASE_URL`, timeouts, pagination, upload constraints, feature flags
  - Exposes `getApiConfig()`, `getConfig()`, etc.
- `contexts/ThemeContext.jsx`:
  - Persists theme to `localStorage`, toggles `.light` class on `<html>`

### Styling

- `src/index.css` imports Tailwind utilities (preflight disabled in `tailwind.config.cjs`) and project design CSS (`styles/prototype-foundation.css`, `styles/responsive-components.css`)
- `styles/critical.css` linked from `index.html` for initial loading
- `styles/UserManagement.css` for specific views

### State & Events

- Auth: on login success, server sets cookie; client sets local `authenticated` flag and fetches `/api/me`
- Navigation: custom window events update `view` state in `App.jsx`
- CSRF token cached in module scope inside `services/api.js`

---

## Data Contracts (Representative)

- Auth
  - `POST /api/login` → `{ success: true, user: { id, username, email, roles, accessLevel } }` (cookie set)
  - `POST /api/logout` → `{ message: 'Logout successful' }` (cookie cleared)
  - `GET /api/me` → user profile
- CSRF
  - `GET /api/csrf-token` → `{ token: '<hex>' }` and header `X-CSRF-Token`
- RFQs/Quotes (indicative)
  - `/api/rfqs`, `/api/quotes` CRUD endpoints via corresponding routers

Note: For exact schemas beyond `User.js`, inspect the model files in `backend/src/models/`.

---

## Core Flows

1) Login

- Client POSTs `/api/login` with credentials
- Server validates, signs JWT, sets `qms_token` cookie
- Client sets `authenticated` flag and requests `/api/me`

2) CSRF Acquire & Use

- Client GET `/api/csrf-token`
- Store token and attach `x-csrf-token` on POST/PUT/PATCH/DELETE
- On 403 with CSRF message, fetch a new token and retry once

3) RFQ lifecycle (high level)

- Create RFQ → Add items → Collect Quotes → Compare/Score → Approvals → Export

---

## Deployment Blueprint

- Backend service
  - Env: `JWT_SECRET` (≥32, ideally 64+), `MONGODB_URI`, `PORT`
  - Security: `SECURE_COOKIES=true`, strict `ALLOWED_ORIGINS`
  - Process: `npm start` under a process manager (pm2/systemd/Windows service)
- Frontend static site
  - Build with `npm run build`; serve `frontend/dist`
  - Reverse proxy `/api` to backend; enable HTTPS

---

## Testing Blueprint

- Backend: Jest (`npm test`), supertest for API (recommended)
- Frontend: Vitest + Testing Library (`npm run test`)
- Suggested CI: lint, typecheck, unit tests, minimal e2e smoke

---

## Roadmap & Improvements

- Move CSRF token store to Redis for multi-instance deployments
- Add React Router (or maintain current) with deep links for views
- Server-side scoring endpoints using `services/scoring.js`
- Observability: request logs to file/centralized sink, metrics endpoint
- Dockerize and add health/readiness endpoints for orchestration

*** End of Blueprint ***
