# TypeMentor AI — Security & Telemetry Report

This report evaluates our authentication controls, network policies, rate-limiting rules, input sanitation, and security configurations.

---

## 1. Authentication Controls & OAuth

- **OAuth Verification**: Google Sign-In is validated using Google's official ID Token verification library (`google-auth-library`) on the backend. This prevents client token forgery.
- **JSON Web Tokens (JWT)**: Users are authenticated using stateless JWTs signed with a strong backend key (`JWT_SECRET`). 
- **Purging Mismatched Sessions**: The frontend intercepts expired, revoked, or invalid tokens (401/403 status returns) and automatically purges local credentials, logging the user out safely.

---

## 2. Network & Header Policies

- **CORS Restraints**: Backend CORS configuration restricts incoming requests strictly to the production domains defined in the `ALLOWED_ORIGINS` environment variables. Development domains (localhost, Vercel previews) are only allowed in non-production environments.
- **Helmet Security**: Express uses Helmet to configure 15+ standard security headers, including:
  - `Content-Security-Policy` (CSP)
  - `Cross-Origin-Opener-Policy` (`same-origin-allow-popups` to support Google OAuth popup callback flow)
  - `X-Frame-Options` (`DENY` to prevent clickjacking)
  - `X-Content-Type-Options` (`nosniff` to prevent MIME-sniffing)

---

## 3. Rate Limiting & Input Sanitation

- **Global Limiters**: All `/api` routes are rate-limited to 200 requests per 15 minutes per IP address to mitigate Denial of Service (DoS) attempts.
- **Strict Authentication Limiter**: Login, registration, and Google OAuth routes are restricted to **5 attempts per 15 minutes** (counting only unsuccessful attempts). This protects user accounts against brute-force attacks while avoiding locking out legitimate users.
- **Input Sanitization**:
  - `sanitizeBody` middleware strips HTML tags and characters that could cause Cross-Site Scripting (XSS).
  - `blockSqlInjection` middleware detects SQL command patterns in inputs and immediately rejects the payload before database querying.
- **Zero Exposed Secrets**: All tokens, API URLs, and Sentry DSNs are loaded dynamically from environment variables. No credentials exist in the compiled production bundle.
