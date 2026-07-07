# TypeMentor AI — Database Telemetry & Audit Report

This report documents our relational schemas, cascade deletion settings, indexing optimizations, and scaling parameters.

---

## 1. Indexing & Query Efficiency

Prerunning complex telemetry queries over scaling datasets requires proper indexing. We reviewed all foreign keys and added explicit indexes in `schema.prisma` to prevent table scans as database history scales.

| Model / Table | Field Indexed | Constraint | Query Target |
|---|---|---|---|
| `User` | `email` | `@unique` (Implicit Index) | Login and registration checks |
| `User` | `googleId` | `@unique` (Implicit Index) | Google OAuth profile resolves |
| `TypingSession` | `userId` | `@@index([userId])` (Added) | Loading user history in Dashboard |
| `KeystrokeLog` | `sessionId` | `@@index([sessionId])` (Added) | Loading keystroke diagnostics for AI coach |
| `MistakeSummary` | `[userId, expectedKey, pressedKey]` | `@@unique` (Composite Index) | AI weak-key diagnostics queries |
| `UserAchievement` | `[userId, achievementId]` | `@@unique` (Composite Index) | Unlocked milestone achievements |
| `UserChallengeProgress` | `[userId, challengeId]` | `@@unique` (Composite Index) | Active goals progress checking |
| `RecoveryHistory` | `userId` | `@@index([userId])` (Added) | Displaying recovery reports in Dashboard |

---

## 2. Cascade Deletion Settings

To maintain referential integrity without manual query complexity:
- All child tables linked to the `User` model (`TypingSession`, `MistakeSummary`, `UserAchievement`, `UserChallengeProgress`, `RecoveryHistory`) are configured with `onDelete: Cascade`.
- Removing a user account automatically cleans up all associated keystrokes and sessions in a single database transaction, preventing orphaned rows.
- Keystroke details are cascade-deleted when their parent `TypingSession` is removed.

---

## 3. Migration Safety

To ensure production migrations execute safely without locking tables:
- **Zero Schema Overrides**: All operational telemetry and analytics are queried using lightweight schemas. The database indexes were added without renaming tables or columns, ensuring full backward compatibility.
- **Prisma Client Sync**: Prisma Client is regenerated locally and automatically deployed during the Vercel/Docker build lifecycle using `prisma generate`.
