# TypeMentor AI — Developer Contribution Guide

Welcome! Follow these guidelines to ensure quality, performance, and security standard compatibility.

---

## 1. Development Guidelines

- **No Monolithic Bundles**: Use lazy loading (`React.lazy` + `Suspense`) for any new page component or heavy layout widget.
- **Strict Typings**: Ensure all TypeScript modules compile under strict rules (`strict: true`, `noUnusedLocals: true`). Avoid the use of `any` typings where possible.
- **Client Resilience**: Always wrap API endpoints in our global `safeFetch` function (or call raw `fetch` which routes through the global wrapper) to inherit retries, timeouts, and error logging.
- **Offline Integrity**: Any user progress data must be synced cleanly to the local storage queue if networks fail, ensuring guest mode is fully isolated from registered accounts.

---

## 2. Testing Your Changes

Before submitting pull requests:

1. **Verify Lint & Types**:
   ```bash
   npm run build -w frontend
   ```
2. **Run Tests**:
   ```bash
   npm run test
   ```
3. **Audit Local Bundles**:
   Confirm that chunk splitting separates main libraries (`recharts`, `jspdf`) correctly.
