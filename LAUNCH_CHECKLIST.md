# Launch Readiness Checklist - TypeMentor AI

## ⚙️ Environment Variables Required

### Frontend (`frontend/.env`)
* `VITE_API_URL` (e.g. `http://localhost:5000` or production backend endpoint)
* `VITE_GOOGLE_CLIENT_ID` (Google OAuth Client ID for SSO authentication)
* `VITE_ENABLE_GUEST_MODE` (`true`/`false`, set to `true` to permit guest access)

### Backend (`backend/.env`)
* `PORT` (e.g. `5000`)
* `DATABASE_URL` (Prisma-compatible connection string, e.g. `postgresql://user:pass@host:5432/db`)
* `JWT_SECRET` (Cryptographic secret string for securing user session tokens)
* `GOOGLE_CLIENT_ID` (Google OAuth Client ID matching frontend configuration)

---

## 📋 Pre-Launch Task Status

* [ ] **Build Status**: Confirm frontend & backend compile successfully without errors.
* [ ] **Test Status**: Confirm frontend & backend automated test suites pass.
* [ ] **Google Login Check**: Ensure client ID is configured and loads script successfully.
* [ ] **Mobile Responsiveness**: Verify header navigation drawer, dashboard tables, and landing grid render on mobile devices.
* [ ] **New User Zero-State Check**: Confirm brand new users register with `0 WPM`, `0% Accuracy`, `0 Characters`, `0.0 Hours`, and clean empty charts.
* [ ] **Beta Feedback Check**: Verify form submits successfully to `localStorage` and downloads CSV/JSON files.

---

## 🧪 Manual Verification Test Script

1. **Fresh Visitor Landing Page**:
   * Open the app in incognito mode.
   * Verify Landing Page renders with Hero title "Type Smarter. Improve Faster."
   * Validate that all 6 feature cards and 3 preview widgets display correctly.
2. **Authentication Access**:
   * Click "Get Started". Verify redirection to the auth page.
   * Verify clicking "Back" returns to the Landing Page.
3. **Guest Session Initiation**:
   * Click "Try Typing Academy (Guest)" on the Landing Page.
   * Verify page instantly routes to the Typing Academy, setting guest session badge in header nav.
   * Complete Lesson 1 as guest. Ensure progress unlocks but is NOT sent to database.
4. **Data Hygiene Profile**:
   * Create a new account with a mock email.
   * Navigate to the Dashboard.
   * Verify all dashboard cards read: `0 WPM`, `0% Accuracy`, `0` characters, and `0.0 hrs`.
   * Verify "WPM Speed Trend" and "Accuracy Progression" charts display "No Telemetry Recorded Yet" empty-state warnings.
5. **Beta Feedback Execution**:
   * Complete one typing practice drill. During active typing, verify "Beta Feedback" button is hidden.
   * Once finished, click "Beta Feedback" on the bottom left.
   * Fill out Name, Device, Rating, and suggestions. Submit.
   * Verify feedback submission modal updates to "Thank You" state and closes automatically.
6. **Developer Admin Export Check**:
   * Open "Beta Feedback" again.
   * Click the developer admin buttons "JSON" and "CSV".
   * Ensure browser initiates download for `.json` and `.csv` files matching feedback storage values.
7. **Mobile Rendering**:
   * Open developer console, toggle device simulator to Mobile (e.g. iPhone 12 Pro).
   * Confirm header menu contracts to drawer icon, and elements stack.

---

## 🚀 Deployment Checklist

1. **Database Setup**:
   * Verify target production database instance is active.
   * Run migrations: `npx prisma migrate deploy` on production server.
2. **Environment Synchronization**:
   * Double check environment variables are set in hosting dashboard (e.g. Vercel, Render, AWS).
3. **SSL Certificate Security**:
   * Confirm HTTPS is active for both domain and API endpoints (Google OAuth requires secure origins).
4. **Rate Limiting Check**:
   * Backend rate limiter settings in `express-rate-limit` adjusted to protect auth and telemetry routes.

---

## 💾 Backup & Rollback Checklist

* [ ] Create PostgreSQL schema backup before migrating database: `pg_dump -U postgres dbname > backup.sql`
* [ ] Maintain git release branch tags: Tag releases using semantic version tag commands (e.g. `git tag -a v1.0.0-beta -m "Beta launch Release"`).
* [ ] Prepare instant fallback routing configuration in case of authentication server disruption.

---

## ⚠️ Known Limitations

1. **Guest Mode Exclusions**: Guests cannot access personal metrics dashboard, Endurance Arena, Profile, or AI Weak-Key compilation reports (requires authenticated profile).
2. **LocalStorage Persistence**: Feedback submissions and guest progress remain scoped to local browser instance and will be cleared if browser storage is wiped.
3. **Keyboard Device Support**: Heatmap and typing tracker calculations expect standard QWERTY keyboards; physical layout mismatch might skew finger cam accuracy results.
