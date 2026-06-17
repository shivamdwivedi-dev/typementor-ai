# TypeMentor AI

An AI-powered, adaptive typing coach designed to help coders, writers, and students improve their keyboard biometrics. TypeMentor AI tracks keystroke-level hold times, flight times, and error keys to formulate personalized AI guidance reports and targeted recovery drills.

---

## Features
- **Typing Academy**: 50 structural nodes guiding users from basic home row layout up to advanced coding templates.
- **AI Coach Insights**: Real-time biometric analysis highlighting weak-key transitions, accuracy dips, and recovery suggestions.
- **Endurance Arena**: Speed tests of variable length to evaluate consistency over time.
- **Google OAuth**: Fast registration and profile syncing across devices.
- **Offline Guest Mode**: Practice and build statistics stored entirely in your local browser sandbox when not authenticated.

---

## Local Development

### 1. Prerequisite Setup
Ensure you have Node.js (v18+) and PostgreSQL installed.

### 2. Backend Installation & Migration
```bash
cd backend
npm install
cp .env.example .env
# Configure database connection strings inside .env, then run:
npx prisma db push
npm run dev
```

### 3. Frontend Installation
```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

---

## 🔒 Production Deployment Security

For permanent deployment instructions (Vercel, Render/Railway, Neon), refer to the detailed [DEPLOYMENT.md](file:///c:/Users/shiva/OneDrive/Documents/SHIVAM%20HUB/02_Coding_Projects/02_Web_Development/DEPLOYMENT.md).

> [!WARNING]
> **NEVER COMMIT `.env` FILES TO VERSION CONTROL**:
> `.env` files contain sensitive connection strings and secrets. Ensure your `.gitignore` is correctly configured before pushing code. Environment settings should be configured directly in your host's dashboard (Vercel, Render, Railway).
