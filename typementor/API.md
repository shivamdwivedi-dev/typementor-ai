# TypeMentor AI — Backend REST API Documentation

All API requests are prefixed with `/api` and return standard JSON responses.

---

## 1. Authentication Routes

### `POST /api/auth/register`
Creates a new user profile.
- **Request Body**: `{ email, password, name }`
- **Response**: `{ token, user: { id, email, name, ... } }`

### `POST /api/auth/login`
Authenticates existing credentials.
- **Request Body**: `{ email, password }`
- **Response**: `{ token, user: { id, email, name, ... } }`

### `POST /api/auth/google`
Authenticates a user session via Google Sign-In.
- **Request Body**: `{ idToken }`
- **Response**: `{ token, user: { id, email, ... } }`

### `GET /api/auth/profile`
Retrieves user profile data and triggers progress migration/syncing.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User profile JSON.

---

## 2. Typing Session Routes

### `POST /api/sessions`
Logs a completed typing session and returns analytics rewards.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "mode": "English",
    "difficulty": 2,
    "wpm": 78,
    "rawWpm": 82,
    "accuracy": 98.4,
    "consistency": 85,
    "focusScore": 92,
    "duration": 45.2,
    "backspaceCount": 4,
    "correctionCount": 2,
    "keystrokes": [...]
  }
  ```
- **Response**: `{ status: "success", xpGained: 15, level: 3, isLevelUp: false, unlockedAchievements: [] }`

### `GET /api/sessions`
Retrieves past typing sessions for charts and graphs.
- **Query Params**: `limit=20`

---

## 3. Operations & Admin Routes

### `GET /api/admin/stats`
Retrieves system DAU, server node usage, and db latency statistics.
- **Headers**: `Authorization: Bearer <token>` (must belong to emails defined in `ADMIN_EMAILS`)
- **Response**: Admin dashboard stats JSON.
