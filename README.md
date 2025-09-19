<div align="center">

# 🏢 QMS (Quotation Management System)

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

**A full-stack, production-ready Quotation Management System for streamlined procurement workflows**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Security](https://img.shields.io/badge/Security-CSRF%20%7C%20JWT%20%7C%20Rate%20Limiting-red?style=flat-square)](#security-features)

</div>

## 📚 Documentation

> 📖 **Full documentation**: see [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md)  
> 🏗️ **Architecture blueprint**: see [`docs/ARCHITECTURE_BLUEPRINT.md`](docs/ARCHITECTURE_BLUEPRINT.md)

## 🚀 Quick Start (Development)

## 🚀 Quick Start (Development)

### 🔧 Backend Setup

```bash
cd backend
npm install
npm run dev
```

### 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### ⚙️ Environment Configuration

Set environment files at:
- `backend/.env` 
- `frontend/.env`

> 💡 **Tip**: See the [Environment Variables](#environment-variables) section below for required configuration.

---

## 📋 Table of Contents

- [🏢 QMS (Quotation Management System)](#-qms-quotation-management-system)
  - [📚 Documentation](#-documentation)
  - [🚀 Quick Start (Development)](#-quick-start-development)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 Project Overview](#-project-overview)
  - [🏗️ System Architecture](#️-system-architecture)
  - [🔧 Code Structure](#-code-structure)
  - [🔐 Security Model](#-security-model)
  - [🚦 Getting Started](#-getting-started)
  - [🎨 Styling & Design](#-styling--design)
  - [📊 Performance & Scalability](#-performance--scalability)
  - [🧪 Testing](#-testing)
  - [🚀 Deployment](#-deployment)
  - [🔮 Future Roadmap](#-future-roadmap)

---
## 🎯 Project Overview

QMS is a full‑stack, production‑ready **Quotation Management System** designed to streamline procurement workflows. The system helps organizations efficiently manage RFQs (Requests for Quotation), capture vendor quotes, compare and score them, handle approvals, and generate comprehensive reports.

### 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 📋 **RFQ Management** | Create and manage Requests for Quotation with detailed item specifications |
| 💰 **Quote Collection** | Capture vendor quotes with comprehensive comparison tools |
| 📊 **Scoring & Analysis** | Automated scoring system for objective quote evaluation |
| ✅ **Approval Workflow** | Multi-level approval process with customizable routing |
| 📈 **Reporting** | Comprehensive reports with Excel export capabilities |
| 👥 **User Management** | Role-based access control with department-level permissions |
| 🔒 **Enterprise Security** | CSRF protection, JWT authentication, and rate limiting |
| 📱 **Responsive Design** | Modern UI with dark/light themes and mobile support |

### 🏗️ Technology Stack

**Backend:**
- **Runtime:** Node.js 22+ with ES modules
- **Framework:** Express.js with security middleware
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT with HttpOnly cookies
- **Security:** CSRF protection, rate limiting, input sanitization
- **Jobs:** Scheduled reporting with node-cron

**Frontend:**
- **Framework:** React 18+ with modern hooks
- **Build Tool:** Vite for fast development and optimized builds
- **Styling:** Tailwind CSS with custom design system
- **HTTP Client:** Axios with CSRF handling
- **State Management:** Context API with custom hooks

### 🎯 Core Objectives

- **🛡️ Security by Default:** HttpOnly cookies, CSRF protection, comprehensive rate limiting
- **📐 Clear Modularity:** Well-structured codebase with separation of concerns
- **🎨 Smooth UX:** Responsive components with intuitive workflows
- **⚡ Performance:** Optimized database indexes and efficient API design

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[👤 User Browser] --> B[🌐 React SPA Frontend]
    B --> C[🔄 Axios HTTP Client]
    C --> D[🛡️ Express.js Backend]
    D --> E[🍪 JWT Auth Middleware]
    E --> F[🔒 CSRF Protection]
    F --> G[📊 API Routes]
    G --> H[🗃️ MongoDB Database]
    
    I[⏰ Scheduler] --> J[📈 Weekly Reports]
    J --> G
    
    K[🔧 Performance Indexes] --> H
    L[📁 File Uploads] --> G
```

### 🔄 Request Flow

1. **🔐 Authentication:** User logs in → JWT stored in HttpOnly cookie
2. **🛡️ CSRF Protection:** Client fetches CSRF token → Attached to requests
3. **📡 API Communication:** CORS-enabled requests with credential passing
4. **💾 Data Processing:** MongoDB operations with performance indexes
5. **📊 Response:** Structured JSON responses with error handling

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

## 🚦 Getting Started

### 📋 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 22+ | [Download](https://nodejs.org/) |
| **MongoDB** | 6.0+ | Local or managed instance |
| **Git** | Latest | For version control |
| **Terminal** | Windows CMD | Command examples use Windows syntax |

### ⚙️ Environment Configuration

#### 🔙 Backend Environment (`backend/.env`)

```bash
# 🔐 Security (REQUIRED)
JWT_SECRET=your-super-secure-secret-key-at-least-32-characters-long
MONGODB_URI=mongodb://localhost:27017/qms

# 🌐 Server Configuration
PORT=3001
HOST=localhost
NODE_ENV=development

# 🛡️ CORS & Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
SECURE_COOKIES=false
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 📊 Features
ENABLE_WEEKLY_REPORTS=true
LOG_LEVEL=info
```

#### 🎨 Frontend Environment (`frontend/.env`)

```bash
# 🌐 API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# ⚙️ Application Settings
VITE_REQUEST_TIMEOUT=30000
VITE_PAGINATION_DEFAULT_SIZE=20
VITE_MAX_UPLOAD_SIZE=10485760
VITE_ENABLE_DEV_TOOLS=true

# 🎨 UI Configuration
VITE_DEFAULT_THEME=dark
VITE_ENABLE_ANIMATIONS=true
```

### 💻 Development Setup

#### 🚀 Quick Start Commands

**1. Clone and Setup Backend**
```bash
cd c:\Users\Manish Bej\Desktop\QMS\backend
npm install
npm run dev
```

**2. Setup Frontend (New Terminal)**
```bash
cd c:\Users\Manish Bej\Desktop\QMS\frontend  
npm install
npm run dev
```

**3. Access Applications**
- 🎨 **Frontend:** http://localhost:5173
- 🔙 **Backend API:** http://localhost:3001/api
- 📊 **Health Check:** http://localhost:3001/api/health

#### 👤 Initial Admin Setup

```bash
cd c:\Users\Manish Bej\Desktop\QMS\backend

# Set admin credentials in environment
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=SecurePassword123!

# Seed the admin user
npm run seed:admin
```

### 🚀 Production Deployment

#### 🔙 Backend Production

**1. Environment Setup**
```bash
# 🔐 Production Security
JWT_SECRET=extremely-secure-production-secret-64-characters-minimum
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/qms?retryWrites=true&w=majority
SECURE_COOKIES=true
ALLOWED_ORIGINS=https://yourdomain.com

# 🌐 Production Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
```

**2. Deployment Commands**
```bash
cd c:\Users\Manish Bej\Desktop\QMS\backend
npm ci --only=production
npm run start

# OR with PM2 (recommended)
npm install -g pm2
pm2 start src/server.js --name "qms-backend"
```

#### 🎨 Frontend Production

**1. Build Static Assets**
```bash
cd c:\Users\Manish Bej\Desktop\QMS\frontend
npm ci --only=production
npm run build
```

**2. Deployment Options**

| Method | Command | Notes |
|--------|---------|-------|
| **Static Hosting** | Upload `dist/` folder | Netlify, Vercel, S3 + CloudFront |
| **Nginx** | Configure proxy | Serve static + API proxy |
| **Apache** | Virtual host setup | .htaccess for SPA routing |

**3. Nginx Configuration Example**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend static files
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy  
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 🔒 Production Security Checklist

| ✅ Task | Description |
|---------|-------------|
| **🔐 JWT Secret** | Use 64+ character random string, rotate periodically |
| **🍪 Secure Cookies** | Set `SECURE_COOKIES=true` for HTTPS only |
| **🌐 CORS Origins** | Restrict `ALLOWED_ORIGINS` to your domain(s) |
| **🗄️ Database Security** | Use managed MongoDB with authentication |
| **🛡️ HTTPS** | Enable SSL/TLS certificates |
| **🚦 Rate Limiting** | Configure appropriate limits for your traffic |
| **📝 Logging** | Set up centralized logging and monitoring |
| **🔄 Backups** | Implement automated database backups |

### 🛠️ Development Tools & Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| **🔧 Dev Server** | `npm run dev` | Start development with hot reload |
| **🏗️ Build** | `npm run build` | Create production build |
| **🧪 Test** | `npm test` | Run test suites |
| **📋 Lint** | `npm run lint` | Code quality checks |
| **👤 Seed Admin** | `npm run seed:admin` | Create initial admin user |
| **📊 Load Data** | `npm run load:sample` | Import sample data |
| **🔍 Validate** | `npm run validate:security` | Security validation checks |

---

## 📸 Screenshots & Live Demo

### 🌟 Application Preview

> **🚀 Live Demo:** [Coming Soon - QMS Demo Environment](https://qms-demo.example.com)
> 
> **📱 Mobile Preview:** Fully responsive design works seamlessly across all devices

<div align="center">

### 🏠 Dashboard Overview
*Modern dashboard with real-time metrics and quick actions*

📷 ![Screenshot Placeholder: Main Dashboard](docs/HOME.png)
- Dark/Light theme toggle
- Real-time RFQ statistics  
- Quick action buttons
- Recent activity feed

### 📋 RFQ Creation Interface
*Intuitive form design with smart validation*

📷 ![Screenshot Placeholder: RFQ Creation Form](docs/RFQ.png)
- Step-by-step wizard interface
- Product search with typeahead
- Vendor selection tools
- Attachment management

### 💰 Quote Comparison View
*Side-by-side comparison with scoring algorithms*

📷 ![Screenshot Placeholder: Quote Comparison](docs/COMPARE.png)
- Interactive comparison tables
- Automated scoring visualization
- Winner highlighting
- Export to Excel functionality

### ✅ Approval Workflow
*Streamlined approval process with role-based routing*

📷 ![Screenshot Placeholder: Approval Interface](docs/APPROVAL.png)
- Multi-level approval chains
- Comments and feedback system
- Status tracking
- Email notifications

### 📱 Mobile Experience
*Fully responsive design optimized for mobile workflows*

📷 ![aScreenshot Placeholder: Mobile Views](docs/MOBILE.png)
- Touch-optimized interface
- Swipe gestures
- Condensed navigation
- Offline capabilities

</div>

### 🎨 Design System Showcase

| Component | Description | Preview |
|-----------|-------------|---------|
| **🎯 Buttons** | Primary, secondary, danger states | 📷 *[Component Preview]* |
| **📊 Tables** | Sortable, filterable, sticky headers | 📷 *[Component Preview]* |
| **🎴 Cards** | Elevation, borders, hover effects | 📷 *[Component Preview]* |
| **📝 Forms** | Validation, error states, accessibility | 📷 *[Component Preview]* |
| **🔔 Notifications** | Toast, alerts, confirmation dialogs | 📷 *[Component Preview]* |

### 🌓 Theme Comparison

<div align="center">

| 🌙 Dark Theme | ☀️ Light Theme |
|---------------|----------------|
| 📷 *[Dark theme screenshot]* | 📷 *[Light theme screenshot]* |
| Modern dark UI with high contrast | Clean light interface with subtle shadows |

</div>

---

## 🎨 Styling & Design System

## 🎨 Styling & Design System

### 🎯 Design Philosophy

The QMS design system prioritizes **clarity**, **accessibility**, and **consistency** across all user interfaces. Our approach combines modern design principles with practical usability.

**🎨 Core Design Principles:**
- **🌓 Theme Flexibility:** Seamless dark/light mode switching
- **📱 Mobile-First:** Responsive design optimized for all screen sizes  
- **♿ Accessibility:** WCAG 2.1 AA compliance with keyboard navigation
- **⚡ Performance:** Optimized CSS with minimal runtime overhead
- **🔧 Maintainability:** CSS variables and component-based architecture

### 🎨 Design System Architecture

<details>
<summary><strong>🎨 Theme Management</strong></summary>

**CSS Variables Structure:**
```css
:root {
  /* 🌙 Dark Theme (Default) */
  --color-primary: #3b82f6;
  --color-surface: #1f2937;
  --color-text: #f9fafb;
  --color-border: #374151;
}

:root.light {
  /* ☀️ Light Theme */
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-border: #d1d5db;
}
```

**Theme Toggle Implementation:**
- `ThemeContext` provides theme state management
- `.light` class toggles on document root
- Automatic system preference detection
- Persistent theme selection in localStorage

</details>

<details>
<summary><strong>🧩 Component Library</strong></summary>

| Component | File | Features |
|-----------|------|----------|
| **🔘 Buttons** | `prototype-foundation.css` | Primary, secondary, danger states with hover/focus |
| **🃏 Cards** | `prototype-foundation.css` | Elevation, borders, interactive hover effects |
| **📊 Tables** | `StickyTable.jsx` | Fixed headers, sortable columns, responsive overflow |
| **📝 Forms** | `prototype-foundation.css` | Validation states, error messaging, accessibility |
| **🏷️ Chips & Badges** | `prototype-foundation.css` | Status indicators, user info, interactive tags |
| **📱 Responsive Grid** | `ResponsiveComponents.jsx` | Flexible grid system with breakpoint management |

</details>

<details>
<summary><strong>📱 Responsive Strategy</strong></summary>

**Breakpoint System:**
```css
/* 📱 Mobile First Approach */
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* 📺 Tablet & Desktop */
@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Responsive Components:**
- `ResponsiveAppHeader.jsx` - Adaptive header with collapsible navigation
- `MobileNavigation.jsx` - Touch-optimized mobile menu
- `ResponsiveComponents.jsx` - Grid and table components with automatic layout switching

</details>

### 🛠️ Tailwind Integration

**Configuration Strategy:**
```javascript
// tailwind.config.cjs
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  corePlugins: {
    preflight: false // Preserve design system reset
  },
  theme: {
    extend: {
      colors: {
        // Extend with CSS variables
        primary: 'var(--color-primary)',
        surface: 'var(--color-surface)'
      }
    }
  }
}
```

**Usage Guidelines:**
- **Design System First:** Use component classes for UI elements
- **Tailwind for Layout:** Utilize utilities for spacing, positioning, flexbox
- **No Conflicts:** Preflight disabled to avoid overriding custom styles

### 🎨 CSS Architecture

```
📁 src/styles/
├── 🎨 critical.css          → Above-the-fold loading styles
├── 🏗️ prototype-foundation.css → Core component library
├── 📱 responsive-components.css → Responsive utilities
├── 👥 UserManagement.css    → Page-specific styles
└── 📝 index.css            → Global imports and base styles
```

**Loading Strategy:**
1. **Critical CSS** loaded inline in `index.html` for immediate rendering
2. **Main Styles** imported in `index.css` for component styling
3. **Page Styles** loaded conditionally for specific views

---

## 📊 Performance & Scalability

### 🚀 Database Optimization

**Index Strategy:**
```javascript
// Automated index creation on startup
const performanceIndexes = {
  users: [
    { username: 1 },
    { email: 1 },
    { department: 1, accessLevel: 1 }
  ],
  rfqs: [
    { createdBy: 1, createdAt: -1 },
    { status: 1, department: 1 }
  ],
  quotes: [
    { rfqId: 1, vendor: 1 },
    { createdAt: -1 }
  ]
};
```

**Query Optimization:**
- **Compound Indexes:** Support complex filtering and sorting
- **TTL Indexes:** Automatic cleanup of expired sessions
- **Sparse Indexes:** Efficient storage for optional fields
- **Startup Validation:** Ensures indexes exist on application boot

### ⚡ Frontend Performance

**Bundle Optimization:**
```javascript
// Vite configuration for optimal bundling
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['./src/components'],
          utils: ['axios', 'date-fns']
        }
      }
    }
  }
}
```

**Performance Features:**
- **Code Splitting:** Automatic route-based chunk splitting
- **Tree Shaking:** Unused code elimination
- **Asset Optimization:** Image compression and lazy loading
- **Service Worker:** Caching strategy for offline support

### 🛡️ Security Performance

**Rate Limiting Strategy:**
```javascript
// Tiered rate limiting
const rateLimits = {
  global: { windowMs: 15 * 60 * 1000, max: 1000 },
  auth: { windowMs: 15 * 60 * 1000, max: 5 },
  api: { windowMs: 15 * 60 * 1000, max: 100 }
};
```

**Security Optimizations:**
- **JWT Optimization:** Short-lived tokens with refresh strategy
- **CSRF Efficiency:** In-memory token store with TTL cleanup
- **Input Validation:** Early validation to prevent processing overhead
- **Error Handling:** Structured errors without stack trace leaks

---

## 🧪 Testing Strategy

### 🧪 Testing Architecture

**Backend Testing:**
```javascript
// Jest configuration
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/scripts/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**Frontend Testing:**
```javascript
// Vitest + Testing Library
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('QuoteEntry Component', () => {
  test('handles quote submission', async () => {
    const user = userEvent.setup();
    render(<QuoteEntry />);
    
    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(screen.getByText(/quote submitted/i)).toBeInTheDocument();
  });
});
```

### 🎯 Testing Categories

| Test Type | Framework | Coverage | Purpose |
|-----------|-----------|----------|---------|
| **🔧 Unit Tests** | Jest/Vitest | Components, utilities | Individual function validation |
| **🔗 Integration Tests** | Supertest | API endpoints | Request/response workflows |
| **🎭 E2E Tests** | Playwright | User journeys | Complete feature workflows |
| **🔒 Security Tests** | Custom scripts | Auth, CSRF, validation | Security vulnerability scanning |

### 📋 Testing Commands

```bash
# 🧪 Run all tests
npm test

# 📊 Coverage report
npm run test:coverage

# 🎭 E2E tests
npm run test:e2e

# 🔒 Security validation
npm run test:security
```

---

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

---

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
