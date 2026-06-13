# TypeMentor AI - Deployment Documentation

This guide describes how to deploy TypeMentor AI to a permanent production environment.

## Architecture
- **Frontend**: React (SPA) + Vite, deployed on **Vercel**.
- **Backend**: Express + Node.js (TypeScript) + Prisma, deployed on **Render** or **Railway**.
- **Database**: Serverless PostgreSQL, hosted on **Neon**.

---

## 1. Database Setup (Neon PostgreSQL)

1. Sign up/log in to [Neon Console](https://neon.tech/).
2. Create a new project named `typementor-db`.
3. In the project dashboard, copy the connection string. It will look like this:
   `postgresql://[user]:[password]@[neondb-hostname]/neondb?sslmode=require`
4. Save this connection string as `DATABASE_URL` for the backend deployment.

---

## 2. Backend Deployment (Render or Railway)

### Environment Variables
Configure the following environment variables in your Render/Railway dashboard:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Production mode identifier | `production` |
| `DATABASE_URL` | Neon PostgreSQL Connection string | `postgresql://...` |
| `JWT_SECRET` | Strong secret for signing tokens | *(Generate a 64-character random string)* |
| `JWT_EXPIRES_IN` | Token validity timeframe | `7d` |
| `PORT` | Dynamic hosting port | `5000` *(Render sets this automatically)* |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed domains | `https://typementor-frontend.vercel.app` |
| `GOOGLE_CLIENT_ID` | Client ID for Google OAuth login | `362554673184-...apps.googleusercontent.com` |
| `GEMINI_API_KEY` | *(Optional)* Gemini AI Coach API Key | `AIzaSy...` |

### Steps
1. Push your repository to GitHub.
2. Link your repository in Render/Railway.
3. Configure settings:
   - **Build Command**: `npm run build -w backend` (or `cd backend && npm install && npm run build`)
   - **Start Command**: `npm run start -w backend` (or `cd backend && npm run start`)
4. Verify deployment:
   - Ensure the server starts successfully.
   - Access `https://your-backend.railway.app/health` to verify it returns `{ "status": "ok" }`.

### Production CORS Security Note
In production (`NODE_ENV=production`), CORS requests will fail if the frontend domain is not explicitly included in the comma-separated `ALLOWED_ORIGINS` variable. Localhost and ngrok bypasses are automatically disabled in production.

---

## 3. Frontend Deployment (Vercel)

### Environment Variables
Configure these in the Vercel project settings under **Environment Variables**:

| Variable | Description | Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Absolute URL to the deployed backend server | `https://your-backend.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID matching the backend | `362554673184-...apps.googleusercontent.com` |
| `VITE_ENABLE_GUEST_MODE` | Enable or disable offline local practice | `true` |

### Steps
1. Import your repository into **Vercel**.
2. Configure project directories:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Click **Deploy**.
4. Retrieve the deployed URL (e.g. `https://typementor-frontend.vercel.app`) and add it to `ALLOWED_ORIGINS` in your backend environment configuration.

---

## 4. Google OAuth Configuration

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your project and edit your **OAuth 2.0 Client ID**.
3. Under **Authorized JavaScript Origins**, add:
   - `https://typementor-frontend.vercel.app` (your Vercel URL)
   - `http://localhost:5173` (for local development)
4. Under **Authorized Redirect URIs**, configure redirect endpoints if using backend redirects (type-mentor utilizes token-based client-side Google auth, so origins are sufficient).
5. Save changes. It can take up to 5-10 minutes for Google OAuth settings to propagate.
