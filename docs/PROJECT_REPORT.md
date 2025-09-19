# QMS (Quotation Management System) — Comprehensive Project Report

## 0. Project Synopsis

QMS is a full‑stack, production‑ready Quotation Management System to organize RFQs (Requests for Quotation), capture vendor quotes, compare and score them, manage approvals, and export reports. It comprises:

- Backend: Node.js/Express + MongoDB (Mongoose), secure cookie auth, CSRF protection, rate limiting, job scheduling, and performance index management.
- Frontend: React + Vite SPA with a responsive design system, dark/light themes, Axios with CSRF handling, and a modular UI for RFQ creation, quote entry, comparisons, approvals, and user management.

Key goals: security by default (HttpOnly cookies, CSRF protection, rate limits), clear modularity, and a smooth UX with responsive components.

---

## 1. Code Explanation (By Area)

### Backend (folder: `backend/`)

- Entry points
  - `src/server.js`: Starts the Express server; validates environment; connects DB; applies performance indexes; kicks off the weekly report scheduler; graceful shutdown handlers.
  - `src/app.js`: Express app with security middleware (helmet, mongo sanitize), CORS headers, rate limiters, cookie parser, routers, and error handlers.
- Configuration
  - `src/config/index.js`: Loads .env, validates required vars, provides typed config getters (rate limits, CORS, upload limits, logging, DB options, features).
  - `src/config/env.js`: Extra environment validations and a secure secret generator.
  - `src/config/db.js`: MongoDB connection setup via Mongoose.
  - `src/config/defaults.js`: Defaults for CORS origins and helper getter.
- Routing and controllers
  - `src/routes/index.js`: Root API router. Endpoints: `/health`, `/csrf-token`, `/login`, `/logout`, `/me`, and mounts sub-routers (`products`, `reports`, `approvals`, `users`, `quotes`). Handles file upload constraints via multer (memory storage, mime/extension guard and size limit).
  - `src/controllers/exportController.js`: Export RFQ to Excel.
  - Other routers: `routes/users.js`, `routes/quotes.js`, `routes/products.js`, `routes/reports.js`, `routes/approvals.js`.
- Middleware
  - `src/middleware/auth.js`: Cookie-based JWT auth. Verifies/sets/clears `qms_token` cookie; loads env early; enforces presence of `JWT_SECRET`.
  - `src/middleware/csrf.js`: CSRF token helpers and store (paired with client’s CSRF header); also provided as simple `/csrf-token` route in `index.js`.
  - `src/middleware/validation.js`: Request validation (express-validator).
  - `src/middleware/roles.js`, `src/middleware/ownership.js`: Access control; ownership checks for RFQs and quotes.
  - `src/middleware/errorHandler.js`: 404 and global error handler with dev-friendly traces.
- Models
  - `src/models/User.js`: User schema with roles, accessLevel, department, position, default approver, and permission helpers. Includes `fullName` virtual and `isLocked` virtual.
  - `src/models/RFQ.js`, `src/models/Quote.js`, `src/models/Product.js`, `src/models/ProductMaster.js`, `src/models/Approval.js`: Domain entities.
- Jobs and utilities
  - `src/jobs/weeklyReport.js`: Scheduled job; can also be run once via route.
  - `src/utils/*`: `logger`, `fileOperations`, `pagination`, `performanceIndexes` (ensures indexes), `tokenStore` (in-memory CSRF token store).
- Scripts (CLI)
  - `scripts/seedAdmin.js`: Seeds an admin user from env vars.
  - `scripts/migrateProducts.js`, `scripts/loadSampleData.*`, `scripts/validateSecurity.js`, `scripts/testMigration.js`.

### Frontend (folder: `frontend/`)

- Entry points
  - `src/main.jsx`: Boots React; imports global CSS; loads development-only utilities.
  - `src/App.jsx`: App shell; handles login/auth check; view switching; wraps UI in Theme and Notification providers.
- Configuration & services
  - `src/config/index.js`: Centralized frontend config; reads Vite env vars (VITE_*); provides config getters and UI/business settings.
  - `src/services/api.js`: Axios instance with CSRF fetch/refresh, cookie-based auth (HttpOnly), request/response interceptors, and safer console.
- UI components and pages
  - Components: `ResponsiveAppHeader.jsx`, `AppNavigation.jsx`, `ErrorBoundary.jsx`, `NotificationSystem.jsx`, `ResponsiveComponents.jsx`, `StickyTable.jsx`, `QuoteAttachments.jsx`, etc.
  - Pages: `Login.jsx`, `NewDashboard.jsx`, `RFQCreate.jsx`, `QuoteEntry.jsx`, `QuoteManagement.jsx`, `CompareView.jsx`, `Approvals.jsx`, `Reports.jsx`, `Settings.jsx`, `UserManagement.jsx`.
- Styling
  - `src/index.css`: Imports Tailwind utilities (preflight disabled) and project design system CSS; CSS variables for themes.
  - `src/styles/prototype-foundation.css`, `src/styles/responsive-components.css`: Core design system and responsive helpers.
  - `src/styles/critical.css`: Initial loading screen styles (linked from `index.html`).
  - Tailwind configured with `tailwind.config.cjs` (preflight disabled) and `postcss.config.cjs`.

---

## 2. Backend & Frontend Architecture

- Backend
  - Layered: config → middleware → routes → controllers → models → utils/jobs.
  - Security middleware stack: helmet → sanitize → rate limiters → cookies → CORS.
  - Auth: cookie-based JWT in `qms_token` (HttpOnly, SameSite=strict; Secure in prod); CSRF token endpoint + header validation.
  - Data: MongoDB via Mongoose with indexes applied at startup for performance.
  - Jobs: cron-like weekly report scheduler.

- Frontend
  - SPA with React; framework-agnostic configuration module and Axios service.
  - Auth: flag in safe local storage indicates state; real auth enforced by backend via HttpOnly cookie; CSRF fetched/attached automatically on mutating requests.
  - UI: Responsive shell with nav, header, and content area; consistent design system with CSS variables for dark/light themes.

Integration notes

- CORS: allowed origins from `.env` (`ALLOWED_ORIGINS` + dev localhost fallback). Cookies are sent via `withCredentials: true`.
- CSRF: client hits `/api/csrf-token` after login; tokens added to subsequent mutating requests via `x-csrf-token`.
- Uploads: in-memory, strict size/type enforced by server config.

---

## 3. Working Principle

1. Authentication

  - Login POST `/api/login` with credentials (server validates via bcrypt, issues JWT, sets HttpOnly cookie `qms_token`).
  - Client stores only an "authenticated" flag; tokens remain in cookies.
  - `/api/me` validates cookie and returns user profile; frontend sets header chips using username, full name, access level, department, and position.

1. CSRF Protection

  - After login, client calls `/api/csrf-token`; server generates a token, stores session context in-memory, returns token in header/body.
  - Client attaches token to mutating requests (`x-csrf-token`); server validates.

1. RFQs and Quotes

  - Users create RFQs, add items; suppliers’ quotes collected via forms.
  - Comparison: frontend computes/visualizes comparisons, scoring via `services/scoring.js` on backend (available to integrate), displays winner/metrics.

1. Approvals and Reports

  - Quotes routed through approvals; weekly report job runs on schedule.
  - Export to Excel via export controller.

1. Performance & Reliability

  - Indexes applied on startup; rate limiting on auth and general endpoints; input sanitized; errors captured via global handler; graceful shutdown closes DB connection.

---

## 4. What the Code Does (End-to-End)

- Presents a portal for procurement teams to:
  - Log in and manage sessions securely.
  - Create RFQs and enter multiple quotes for items.
  - Compare quotes, see scoring, and choose winners.
  - Route quotes for approval.
  - Export RFQ data and weekly reports.
  - Manage users and roles.
- Provides APIs for all core operations with proper security and validations.

---

## 5. Startup & Setup Guide (Development and Production)

### Prerequisites
- Node.js 22+
- MongoDB (local or managed)
- Windows cmd usage in examples

### Environment Variables
- Backend: `backend/.env` (prime, already created)
  - Required: `MONGODB_URI`, `JWT_SECRET` (>=32 chars)
  - Common: `PORT=3001`, `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000`
- Frontend: `frontend/.env` (prime, already created)
  - `VITE_API_BASE_URL=http://localhost:3001/api`
  - Other VITE_* knobs for timeouts, pagination, uploads, etc.

### Development — Run locally
- Backend
```bat
cd c:\Users\Manish Bej\Desktop\QMS\backend
npm install
npm run dev
```
- Frontend
```bat
cd c:\Users\Manish Bej\Desktop\QMS\frontend
npm install
npm run dev
```
- Access frontend at http://localhost:5173; backend at http://localhost:3001/api.

Seed an admin user (optional):
```bat
cd c:\Users\Manish Bej\Desktop\QMS\backend
npm run seed:admin
```

### Production — Build & run
- Backend (set secure env values; restrict CORS to your domain)
  - Run as a service or via a process manager (pm2, systemd, Windows services)
```bat
cd c:\Users\Manish Bej\Desktop\QMS\backend
npm ci
npm run start
```
- Frontend (build static assets and serve behind a reverse proxy)
```bat
cd c:\Users\Manish Bej\Desktop\QMS\frontend
npm ci
npm run build
npm run preview  rem: for local preview only
```
- Recommended: Serve `frontend/dist` via Nginx/Apache/Static host; proxy API to backend service.

Hardening checklist
- Use strong `JWT_SECRET` (>=64 chars) and rotate periodically.
- Set `SECURE_COOKIES=true` and serve over HTTPS in production.
- Lock down `ALLOWED_ORIGINS` to your domain(s).
- Point `MONGODB_URI` to a managed, authenticated cluster.

---

## Styling

- Design system
  - CSS variables define color tokens for dark and light themes (`:root`, `:root.light`).
  - Component classes (buttons, cards, tables, chips, badges, inputs) in `prototype-foundation.css`.
  - Responsive patterns in `responsive-components.css` and `ResponsiveComponents.jsx`.
- Tailwind utilities
  - Tailwind is configured with preflight disabled to avoid overriding the design system reset.
  - Utilities can be used to augment layout; the design system classes remain authoritative.
- Theme toggle
  - `ThemeContext` toggles the `.light` class on the document, switching CSS variable values.

---

## 6. Detailed & Elaborated Project Report

### Security model
- Authentication
  - JWT stored in HttpOnly cookie (`qms_token`). No token in localStorage (only a simple flag for UI state).
  - Cookie options: SameSite=strict, Secure in prod, 1h expiry.
- CSRF
  - Token per session, stored server-side with metadata in `tokenStore` (in-memory). Sent via `x-csrf-token` header for mutating requests.
- Input & transport
  - `express-mongo-sanitize` blocks query selector injections.
  - CORS: strict list + dev convenience for localhost; credentials enabled.
  - `helmet` sets secure headers; rate limiters mitigate brute force.

### Performance & scalability
- Database
  - Indexes defined/applied on startup via `performanceIndexes` utility.
  - DB pool options configurable via env.
- API throughput
  - Global and auth-specific rate limiting, JSON/body size limits.
- Jobs
  - Weekly report scheduled via `node-cron`; can be extended to other periodic tasks.

### Observability
- Logging config (level, format, file path) driven by env.
- Error handler returns structured error responses; dev stack traces in development.

### Frontend UX patterns
- Responsive header with real-time user chips:
  - Right chip: username • full name (from `/api/me`).
  - Left chip: access level • department • position.
- Robust error handling: ErrorBoundary component and extension noise suppression.
- Notification system and sticky UI elements for improved workflows.

### Testing
- Backend: Jest config present; tests can be added with `npm test`.
- Frontend: Vitest and Testing Library configured; run with `npm run test`.

### Future improvements
- Replace in-memory CSRF token store with a distributed store (Redis) for scalability.
- Add role-based route guards on the frontend using `user.roles` and `accessLevel`.
- Integrate `services/scoring.js` endpoints for server-side scoring when needed.
- Add health and readiness probes for k8s/containers; Dockerize services.

---

## Quick Reference
- Backend dev: `npm run dev` in `backend/`
- Frontend dev: `npm run dev` in `frontend/`
- Admin seed: `npm run seed:admin` in `backend/`
- Build frontend: `npm run build` in `frontend/`
- Environment: primary `.env` files live in `backend/.env` and `frontend/.env`

*** End of Report ***
