# TypeMentor AI — Deployment Guide

TypeMentor AI is deployed on Vercel (frontend SPA) and a Node.js cloud platform (backend API).

---

## 1. Environment Configurations

Configure the following variables in the host panels:

### Backend Env Variables
- `DATABASE_URL`: PostgreSQL connection URI.
- `JWT_SECRET`: Random secure string for signing tokens.
- `GOOGLE_CLIENT_ID`: OAuth credentials client token.
- `ALLOWED_ORIGINS`: Comma-separated CORS origins (e.g. `https://typementor-ai-frontend.vercel.app`).
- `ADMIN_EMAILS`: Comma-separated list of admin logins for the Ops Dashboard (e.g. `admin@typementor.dev`).

### Frontend Env Variables
- `VITE_API_URL`: Backend API root URI (e.g. `https://typementor-ai-backend.herokuapp.com`).
- `VITE_ENABLE_GUEST_MODE`: Set to `true` to enable guest storage practice.
- `VITE_SENTRY_DSN`: (Optional) Telemetry capture URL.
- `VITE_GA_MEASUREMENT_ID`: (Optional) Google Analytics measurement ID.
- `VITE_CLARITY_PROJECT_ID`: (Optional) Microsoft Clarity Project ID.

---

## 2. CI/CD Pipeline

The application includes automated GitHub Actions mapping:
1. Builds the project workspace.
2. Checks types (`tsc`).
3. Runs the test suite (`vitest`).
4. Stages successful commits to production, triggering auto-deployments on Vercel.
