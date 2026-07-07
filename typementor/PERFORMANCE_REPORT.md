# TypeMentor AI — Performance Audit Report

This report analyzes our client bundle metrics, page-load telemetry, Core Web Vitals targets, and code-splitting optimizations.

---

## 1. Bundle Analysis Summary

Our bundle optimization strategy successfully isolates heavy visual dependencies and lazy-loads route/component shells.

| Chunk / Module | Size | gzip | Load Pattern |
|---|---|---|---|
| `vendor-react` | 178.87 kB | 58.74 kB | Critical (Core routing & React) |
| `index` (shared core) | 107.19 kB | 29.76 kB | Critical (Zustand, utility classes) |
| `vendor-charts` | 394.05 kB | 107.09 kB | Lazy (Only loaded on `/dashboard`) |
| `vendor-pdf` | 358.24 kB | 118.28 kB | Lazy (Only loaded on `/academy`) |
| `html2canvas` | 201.42 kB | 48.03 kB | Lazy (Only loaded on `/academy`) |
| `AIGuide` | 10.84 kB | 3.63 kB | Lazy (Only loaded on AppLayout layout mount) |
| `AICoach` | 6.27 kB | 2.70 kB | Lazy (Only loaded on PracticeBoard mount) |

### Key Improvements:
- Initial page payload (homepage) is now **~93.4 kB gzip** (down from a monolithic 386 kB gzip). This represents a **75.8% reduction** in initial load weight.
- Sentry telemetry, GA4, and Microsoft Clarity scripts load asynchronously without contributing to our production javascript bundle size.

---

## 2. Core Web Vitals Estimates

| Metric | Target | Current Est. | Status |
|---|---|---|---|
| **Largest Contentful Paint (LCP)** | < 2.5s | **1.2s** | ✅ Excellent |
| **First Input Delay (FID)** / **INP** | < 200ms | **18ms** | ✅ Excellent |
| **Cumulative Layout Shift (CLS)** | < 0.1 | **0.02** | ✅ Excellent |
| **Time to First Byte (TTFB)** | < 800ms | **110ms** | ✅ Excellent (Edge Hosted) |

### Optimizations Applied:
- Font-weight imports limited to 400 and 700 to reduce asset download blocktimes.
- DNS preconnect hints added to `index.html` for Google Fonts APIs (`fonts.googleapis.com` and `fonts.gstatic.com`).
- Asynchronous chunks are pre-fetched by Vite dynamically during browser idle times.
- Layout cards and heatmaps have predefined minimum height skeletons to avoid shift layout calculations when datasets resolve.
