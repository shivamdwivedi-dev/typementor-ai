# Changelog

All notable changes to the TypeMentor AI project are documented in this file.

---

## [1.0.0] - 2026-07-07

### Added
- Enterprise-grade operations/admin telemetry dashboard (`/admin`) for DAU, registrations, average WPM, node memory, active sessions, and database query latency.
- Dynamic script-injected GA4, Sentry, and Microsoft Clarity production tracking.
- Client-side offline session queuing to preserve practice results when connection returns.
- Custom `safeFetch` wrapper with automatic AbortController timeout, backoff retries, and Sentry exception logs.
- Added explicit performance database indexes to model relations (`TypingSession`, `KeystrokeLog`, `RecoveryHistory`).
- Expanded search authority metadata and content-rich workflows on LandingPage (muscle memory science, developer/student workflow sections).

### Fixed
- Added WCAG AA accessibility labels (`aria-label`) to all icon-only buttons in `AIGuide.tsx`.
- Removed three dead/unused codebase files: `Leaderboard.tsx`, `LiveWpmGraph.tsx`, `DailyChallengeWidget.tsx`.
- Overrode global fetch to catch all local `/api/` calls dynamically.
- Lazy-loaded visual modules `AIGuide` and `AICoach` to optimize the main route bundle.
