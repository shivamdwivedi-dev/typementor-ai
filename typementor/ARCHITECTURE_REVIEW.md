# TypeMentor AI — Technical Architecture Review (V1.0.0)

This document provides a comprehensive review of the project's folder structure, component hierarchy, state management, API abstractions, utility architectures, and lazy loading strategies.

---

## 1. Directory Structure & Layout

The project is structured as a monorepo containing a frontend and a backend workspace.

```
typementor/
├── backend/
│   ├── prisma/             # Schema definitions and database migrations
│   └── src/
│       ├── controllers/    # API handler controllers
│       ├── middleware/     # Auth, sanitation, and rate limiting middlewares
│       ├── routes/         # Routing modules mapped to controllers
│       ├── services/       # Business logic operations
│       ├── types/          # Express and custom typescript interfaces
│       ├── app.ts          # Express application initialization
│       └── server.ts       # HTTP listener bootstrap
├── frontend/
│   ├── public/             # Static sitemaps, robots, icons, and metadata
│   └── src/
│       ├── components/     # Reusable layout and telemetry widgets
│       ├── pages/          # Route-level page components
│       ├── store/          # Zustand global state stores (Auth, Typing)
│       ├── test/           # Unit and integration test suites
│       ├── utils/          # API helpers, calculations, and assets
│       ├── App.tsx         # Route analytics and bootstrapping
│       ├── AppRoutes.tsx   # React Router v7 lazy routes switch
│       ├── index.css       # Tailwind variables and utility systems
│       └── main.tsx        # Client mounting and monitoring boot
└── ENTERPRISE_PRODUCTION_REPORT.md
```

---

## 2. Component Hierarchy

All pages inside the application are loaded through `AppRoutes.tsx`. 
- Public routes (`/`, `/auth`) render directly.
- Protected routes (`/practice`, `/academy`, `/dashboard`, `/profile`, `/endurance`, `/interview`, `/admin`) are nested inside `AppLayout.tsx` which manages the shared header navigation, footer, XP progress display, mobile warning modals, sound settings drawer, and the floating AI helper guides.
- Layout nesting:
  ```
  App
  └── BrowserRouter
      └── HelmetProvider
          └── AppRoutes
              ├── Route (/) -> LandingPage
              ├── Route (/auth) -> AuthPage
              └── Route element={<AppLayout />}
                  ├── Route (/practice) -> PracticeBoard -> TypingEngine + AICoach + FingerCamera
                  ├── Route (/academy) -> TypingAcademy
                  ├── Route (/dashboard) -> Dashboard
                  ├── Route (/admin) -> AdminDashboard
                  └── ... other protected views
  ```

---

## 3. State Management (Zustand)

Global state is managed by two centralized Zustand stores:
- **`AuthStore.ts`**: Handles token validation (`bootstrap`), credentials validation, Google OAuth synchronization, user metadata loading, database syncing of academy completions, and offline queuing.
- **`TypingStore.ts`**: Holds session-level telemetry (current character position, speed metrics, accuracy calculation, inconsistency coefficients, and keyhold telemetry details).

### Local Storage Syncing
All progress keys are prefixed and suffixed using `getStorageKey` which dynamically appends the active `userId` (or `_guest`) to prevent data cross-contamination between sessions.

---

## 4. API Abstraction & Client Safety

All requests go through a unified global wrapper in `frontend/src/utils/api.ts`:
- **`safeFetch()`**: Wraps native fetch to enforce AbortController timeouts (10 seconds), automatic retries with exponential backoff on transient server codes (502, 503, 504), exception telemetry reporting to Sentry, and human-friendly error mapping.
- **Global Monkeypatch**: Native `window.fetch` is monkeypatched to automatically catch all local `/api/` calls and wrap them in `safeFetch()`. This ensures absolute client-side resilience with zero code repetition.

---

## 5. Lazy Loading Strategy

To optimize the initial bundle size and speed up Largest Contentful Paint (LCP):
- Page-level imports are split using `React.lazy` + `Suspense` inside `AppRoutes.tsx`.
- Heavy third-party visual integrations (Recharts in `Dashboard`, jsPDF in `TypingAcademy`) are split into cacheable standalone vendor chunks via `vite.config.ts`.
- Sub-layout widgets (`AIGuide` in `AppLayout` and `AICoach` in `PracticeBoard`) are lazy-loaded on demand to ensure the immediate rendering lifecycle remains unblocked.
