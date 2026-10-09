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

### Google AdSense deployment

AdSense is enabled only when the deployment provides all required values. Add these variables to the frontend hosting environment:

```env
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_LANDING_SLOT=1234567890
VITE_ADSENSE_TOP_SLOT=1234567890
VITE_ADSENSE_BOTTOM_SLOT=1234567890
```

Use the publisher ID and ad unit IDs generated in the AdSense account; do not commit them to source control. Before requesting review, publish an `ads.txt` file at the site root containing the exact authorized-seller line supplied by AdSense, for example `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. Keep the existing Privacy Policy and Terms of Service pages reachable from every page, and complete Google's privacy/consent requirements for the regions you serve. AdSense approval is controlled by Google and cannot be guaranteed by code alone.

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
