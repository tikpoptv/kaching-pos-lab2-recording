# Lab 1 Test Plan and Evidence

| # | Layer | Verification |
|---|---|---|
| 1 | API | `GET /api/health` returns the Kaching service status |
| 2 | API | `GET /api/products` returns the active product catalog |
| 3 | API | Catalog failures return a safe error contract |
| 4 | UI | Kaching heading renders |
| 5 | UI | Successful readiness check shows Online and products |
| 6 | UI | API failure shows an actionable Offline state |

Run all automated checks from the repository root with `npm test` and build
both applications with `npm run build`.
