# Browser smoke test

Drives a real browser through the main workflows against a running stack and checks for
regressions that unit tests cannot see (API contracts, session handling, fabricated data,
third-party requests, console errors).

It expects:

- the backend running with `LLM_MOCK=true` against a **fresh, disposable** database,
- demo accounts created with `npm run prisma:seed` using `SEED_DOCTOR_PASSWORD` and
  `SEED_ADMIN_PASSWORD` (the test changes both passwords, so re-seed a fresh database to re-run),
- the frontend built with `NEXT_PUBLIC_API_URL` pointing at that backend.

```bash
npm install
npx playwright install chromium     # or set CHROMIUM_PATH to an existing Chromium binary
SEED_DOCTOR_PASSWORD=... SEED_ADMIN_PASSWORD=... FRONTEND_URL=http://localhost:3000 npm run smoke
```

The run prints one PASS/FAIL line per check and exits non-zero on any failure.
