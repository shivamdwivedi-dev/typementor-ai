# TypeMentor AI — Database Operations

TypeMentor AI utilizes PostgreSQL managed via Prisma ORM.

---

## 1. Schema Lifecycle & Migrations

Whenever the `prisma/schema.prisma` file is modified:

1. **Development Migration**:
   Create and apply a migration locally:
   ```bash
   npx prisma migrate dev --name add_new_indexes
   ```
2. **Production Deployment**:
   Apply pending migrations during deployment:
   ```bash
   npx prisma migrate deploy
   ```
3. **Client Generation**:
   Regenerate TypeScript typings:
   ```bash
   npx prisma generate
   ```

---

## 2. Seeding Data

To populate the database with default achievements and baseline challenges:
```bash
npm run db:seed
```
This runs `backend/prisma/seed.ts`, adding codes like `STREAK_7` or `WPM_80`.

---

## 3. Database Indexing Details

Explicit indexes are defined for:
- `TypingSession(userId)`
- `KeystrokeLog(sessionId)`
- `RecoveryHistory(userId)`

These are critical to keep read operations fast as user history grows.
