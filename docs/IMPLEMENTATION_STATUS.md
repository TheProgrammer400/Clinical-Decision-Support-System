# Implementation status

This records how each finding of the October 2026 repository audit was handled, how it was
verified, what changed in behaviour, and what remains. Finding IDs (S = security, C = clinical
correctness, D = data, Q = code quality, T = testing, O = operations) refer to that audit.

Status values: **Fixed** (implemented and covered by tests or a recorded check),
**Partial** (improved, gaps listed), **Deferred** (not done; reason given), **Not done**.

## Verification summary (final run)

| Check | Result |
| --- | --- |
| Backend lint (ESLint + typescript-eslint) | 0 problems |
| Backend typecheck (`strict`, sources and tests) | pass |
| Backend unit tests | 65 passed (10 suites) |
| Backend e2e tests (real NestJS app, disposable PostgreSQL 16) | 47 passed (3 suites); line coverage of `src/` 84.5 % (baseline: 9 % from unit tests only) |
| Migration tests (`scripts/test-migrations.sh`) | pass: fresh migrate with no drift; legacy `db push` database with data baselined and upgraded; audit DELETE rejected; re-run is a no-op |
| Backend build | pass (repeated builds verified complete) |
| Frontend lint / typecheck (`strict`) / tests / build | 0 problems / pass / 25 passed / pass (Next.js 16) |
| MRI service tests (pytest, CPU torch, random weights) | 22 passed |
| Browser smoke test (`tools/browser-smoke`, Chromium, full stack, LLM mock) | 19/19 checks passed on Next 16 / React 19 / Nest 11 |
| Backend ↔ real inference service contract check | pass (token, multipart, id-based matching, zero measurements, artifacts) |
| Test suites under Node 24.22 | all backend and frontend suites and builds pass |
| `npm audit --omit=dev` | backend 0, frontend 0 (baseline: backend 1 critical/3 high, frontend 1 critical) |

Not executed in this environment: Docker image builds (no Docker daemon), the paid LLM
evaluation (`npm run eval:llm`, needs a Groq key), the CI workflow itself (it runs on GitHub),
and anything against AWS.

## Findings

### Security and access control

| ID | Finding | Status | Implementation | Verified by |
| --- | --- | --- | --- | --- |
| S1 | JWT secrets fell back to public values | **Fixed** | `config/env.schema.ts`: secret required, ≥32 chars, published dev values rejected outside development; server exits with a readable list. | `env.schema.spec.ts`; manual start-up checks |
| S2 | MRI images served without auth; path traversal | **Fixed** | Old route removed. `GET /clinical-cases/:caseId/mri/:mriId/artifacts/:kind` behind JWT + case policy, UUID/enum validation, keys validated and path-contained, `Cache-Control: private, no-store`. Frontend fetches images with the Authorization header. | `clinical.e2e-spec.ts`, `artifact-storage.spec.ts` |
| S3 | No authorization on analyze/feedback | **Fixed** | Central `CaseAccessService`; clinical actions only by the owning doctor; 404 on denial. | e2e cross-user matrix |
| S4 | Users without an organization shared access | **Fixed** | `sameOrganization()` never matches null/undefined. | policy unit test + e2e regression |
| S5 | Suspension did not block login | **Fixed** | `SUSPENDED` status checked on every request, login and refresh; suspension revokes sessions; reactivation cannot revive old tokens. Migration converts legacy `-1` markers. | e2e suspension test; migration test |
| S6 | Known super-admin password seeded on every start | **Fixed** | Seed removed from container start; dev-only seed with env/random passwords and forced change. `DefaultCredentialsCheck` forces a password change for accounts still using the previously published passwords. | e2e; browser smoke |
| S7 | Admin/audit endpoints not tenant-scoped | **Fixed** | All admin queries scoped via policy helpers; audit events carry `organizationId`; super-admin-only role changes. | `admin.e2e-spec.ts` |
| S8 | Global idempotency keys | **Fixed** | Unique on `(doctor_id, idempotency_key)`; format validated; race handled. | e2e |
| S9 | CORS reflected any origin | **Fixed** | Explicit `CORS_ORIGINS` allowlist. | config tests |
| S10 | No HTTPS | **Deferred (AWS)** | Application side: secure refresh cookies by default in production, HSTS via helmet. The ALB listener is unchanged. | — |
| S11 | Access token in localStorage | **Fixed** | Memory only; restored through httpOnly refresh cookie. | `api-client.test.ts`; smoke test |
| S12 | No rate limiting; account enumeration | **Fixed** | Per-IP throttling (stricter on auth), lockout after 5 failures, generic login and registration responses, timing equalisation. | e2e |
| S13 | Internal errors returned to clients | **Fixed** | Exception filter sanitises 5xx; Prisma errors mapped; readiness hides details. | `http-exception.filter.spec.ts` |
| S14 | Uploads buffered before size check; MIME trusted | **Fixed** | Multer limits (size/count) from config; magic-byte detection. | e2e (413, 415, too many files) |
| S15 | Over-broad CI/CD IAM | **Deferred (AWS)** | — | — |
| S16 | Terraform default secrets, local state | **Deferred (AWS)** | — | — |
| S17 | Inference service unauthenticated | **Fixed (opt-in)** | Shared `X-Inference-Token` (constant-time compare); compose binds to localhost. Token is optional; set it in every deployment. | pytest; contract check |
| S18 | Vulnerable dependencies | **Fixed (production)** | See upgrades below. Dev-only findings remain (coverage tooling, Tailwind 3 watcher). | `npm audit` |

### Clinical correctness

| ID | Finding | Status | Implementation | Verified by |
| --- | --- | --- | --- | --- |
| C1 | Fabricated diagnoses/investigations shown for failed analyses | **Fixed** | Case page rebuilt from `AnalysisStatusNotice`, `AnalysisResultView`, `MriPanel`; explicit empty/failed/pending/mock states; failed analyses store `NULL` result and serialisers never expose results of non-successful runs. Also removed hardcoded "Right Upper Quadrant"/"Intermittent (2 Months)" labels, fallback reasoning text and fallback alert items. | Vitest regression tests; e2e; smoke |
| C2 | `0 || 3.7` turned zero into a value | **Fixed** | `formatNumber/formatPercent`, nullish handling end-to-end. | Vitest, e2e (zero findings), contract check |
| C3 | Mock LLM output stored as real | **Fixed** | Separate `MockLlmProvider` only with `LLM_MOCK=true` (forbidden in production); `isMock` persisted and shown; mock excluded from analytics. | config tests, e2e, smoke |
| C4 | New-case form pre-filled comorbidities and demographics | **Fixed** | No defaults; explicit "Not specified"; server DTO requires the fields. | Vitest, e2e, smoke |
| C5 | Prompt version label not tied to prompt | **Fixed** | Versioned template module; SHA-256 template hash stored per analysis; env override removed. | unit tests |
| C6 | Safety checks only logged | **Partial** | Delimiter escaping (case text and context); flags persisted and shown (`possible_prompt_injection`, `dosage_content`, `imaging_reference_without_imaging`, `severity_inferred`). Output is flagged, not blocked or redacted. | unit + e2e |
| C7 | Readiness used a non-existent status constant | **Fixed** | 503 on not ready. | pytest |
| C8 | Model and metrics mislabelled | **Fixed (labels)** | Metrics renamed to what is computed (legacy keys still read); architecture documented accurately. Model unchanged: no data or evaluation available to justify retraining. | pytest, unit |
| C9 | Fake SSE progress | **Fixed (removed)** | Endpoint deleted; UI shows real step state from sequential requests. Real-time progress not implemented. | — |
| C10 | Fabricated admin telemetry | **Fixed** | Measured probes and stored-data aggregates only; GPU utilisation not shown (not measured); static pages replaced. | e2e, smoke |
| C11 | Dashboard totals from first 50 cases | **Fixed** | `GET /clinical-cases/stats` (server-side aggregates). Also fixed: critical count fell back to "2". | e2e, smoke |
| C12 | Long synchronous requests vs. load-balancer timeout | **Partial** | SDK timeout with cancellation, bounded retries (1 SDK retry + 1 corrective retry), duplicate-run lock. Requests are still synchronous; worst case can exceed a 60 s proxy timeout. Not measured. | — |
| C13 | Results matched by array index | **Fixed** | Server-generated filenames; unmatched images marked failed. | e2e (reversed order), contract check |
| C14 | Inference blocked the event loop | **Fixed** | `run_in_threadpool`. | pytest timing test |

### Data, quality, testing, operations

| ID | Finding | Status | Notes |
| --- | --- | --- | --- |
| D1 | "S3" service wrote to local disk | **Not done** | Storage is behind an `ArtifactStorage` interface (`LocalArtifactStorage` hardened). An object-store implementation is excluded as AWS storage architecture. |
| D2 | `db push` at startup, no history | **Fixed** | Migrations `0_init` (baseline), `1_security_and_provenance`, `2_backfill_and_audit_guard`; automatic baselining of legacy databases. |
| D3 | RDS resilience | **Deferred (AWS)** | |
| D4 | Audit log not immutable | **Fixed (DB trigger)** | UPDATE/DELETE rejected; TRUNCATE by the table owner is still possible (restrict the application role to close this). Case view/export/delete and image views are audited; write failures counted and surfaced. |
| D5 | No data lifecycle controls | **Partial** | Audited export and super-admin deletion; no retention automation. See `DATA_MANAGEMENT.md`. |
| D6 | Oversized list responses | **Fixed** | List returns previews and latest severity only. |
| Q1 | TypeScript strictness off | **Fixed** | `strict` in backend (except `strictPropertyInitialization`) and frontend. |
| Q2 | Duplicated authorization | **Fixed** | One policy module. |
| Q3 | Dead code | **Fixed** | Removed unused guard/interceptor/DTO/module, broken CLI, unused deps (matplotlib, TanStack Query), fake SSE. |
| Q4 | Hand-written cookie parser | **Fixed** | `cookie-parser`. |
| Q5 | Errors not logged | **Fixed** | Request middleware logs every response with request id. |
| Q6 | Unbounded numeric params | **Fixed** | Validated DTOs (page ≥ 1, limit ≤ 100). |
| Q7 | Repository hygiene | **Fixed** | `.gitignore` no longer hides docs/scripts/lockfiles; build artifact removed. No LICENSE added: the intended license is unknown (README said MIT, `package.json` said UNLICENSED) — owners must decide. |
| Q8 | Third-party font requests | **Fixed** | Self-hosted `geist` fonts; smoke test asserts no third-party requests. |
| T1 | 9 % coverage | **Fixed** | Numbers above. |
| T2 | CI lacked checks | **Fixed** | Lint, types, unit, e2e, migrations, audits, pytest, Docker builds; Dependabot. CodeQL not added. |
| T3 | CD not gated on CI | **Deferred (AWS workflow)** | Smallest proposed change: trigger `cd.yml` with `workflow_run` on successful CI for `main`. |
| T4 | Observability | **Partial** | Structured access logs with request ids, measured health, audit-failure counter. No metrics/tracing/Sentry (unused `SENTRY_DSN` removed). |
| O2 | Frontend image hardcoded API URL | **Fixed (image)** | `NEXT_PUBLIC_API_URL` build arg; CD does not pass it yet (AWS workflow). |
| O4 | MRI service could not start locally; ImageNet download | **Fixed** | No download; explicit missing-weights error; compose mounts weights and allows CPU in development. |
| O6 | Unsafe `torch.load`, unpinned torch | **Fixed** | `weights_only=True`; fully locked requirements. |
| O7 | Huge, root, unpinned inference image | **Fixed (not built here)** | `python:3.12-slim`, non-root, locked deps. |
| O1, O3, O5 | Frontend/MRI not deployed to AWS, region mismatch | **Deferred (AWS)** | |

## Dependency upgrades

| Component | Before | After | Notes |
| --- | --- | --- | --- |
| Node.js (images, CI) | 20 (EOL April 2026) | 24 LTS | All suites verified on 24.22. |
| NestJS | 10.4 | 11.2.7 (Express 5) | NestJS 12 is ESM-only; migration deferred. |
| Prisma | 5.22 | 6.19.3 | `deepmerge-ts` overridden to ^8.0.2 (advisory fixed upstream only in Prisma 7); all CLI commands used here verified. Remove the override when moving to Prisma 7 (requires driver adapters). |
| groq-sdk | 0.3.3 | 1.6 | native timeout/retry. |
| Next.js / React | 14.2.35 / 18 | 16.4.2 / 19.3 | ESLint 9 flat config added. |
| Jest | 29 | 30 | |
| PyTorch stack | unpinned | torch 2.8.0, FastAPI 0.148, NumPy 2.5, Python 3.12 | lock file via `uv pip compile`. |
| Not upgraded | Tailwind 3, Zod 3 | — | Tailwind 4 is a CSS-first config migration with build-time-only advisories; Zod 4 offers little here. |

## Behaviour changes to be aware of

- **All users must sign in again after deployment** (refresh tokens are now opaque, single-use database records; old JWT refresh tokens are not accepted).
- `JWT_ACCESS_SECRET` is mandatory; `JWT_REFRESH_SECRET` and `PROMPT_VERSION` are no longer read. The current ECS task definition does not set `JWT_ACCESS_SECRET`, so the backend **will refuse to start on AWS until the secret is provided** — this is intentional (S1).
- Doctors can no longer open same-organization colleagues' cases by URL (only their own); organization admins can.
- Registration always answers `202` with the same message.
- New passwords need 12+ characters (existing passwords keep working).
- Failed analyses return `502 ANALYSIS_FAILED` with `details.analysisId`; concurrent runs return `409`.
- MRI artifact URLs changed (old unauthenticated route removed); MRI metric keys renamed (old records still read).
- Containers no longer seed demo accounts or run `db push`; they run migrations.

## Deferred AWS findings

Not changed, by scope decision. Smallest safe actions, in priority order:

1. Add `JWT_ACCESS_SECRET` (Secrets Manager) to the ECS task, and `CORS_ORIGINS` once a frontend origin exists — required for the new backend to start.
2. HTTPS listener with ACM certificate and HTTP→HTTPS redirect (S10); until then production refresh cookies (`Secure`) are not sent and sessions last at most 15 minutes. Do not work around this with `COOKIE_SECURE=false` on a public deployment.
3. Least-privilege CI/CD role, restrict the OIDC subject to `main` (S15); gate CD on CI (T3).
4. Remote Terraform state; remove secret defaults from `variables.tf` (S16).
5. RDS: Multi-AZ, deletion protection, final snapshot, backup retention (D3).
6. Shared object storage for MRI artifacts (D1), frontend service, MRI service deployment, region consistency (O1, O3, O5).

## Remaining work (application)

| Priority | Item |
| --- | --- |
| High | Background job processing for analysis/MRI to remove long synchronous requests (C12), then real progress reporting. |
| High | Run `npm run eval:llm` with a real key and record the baseline before changing prompts or models. |
| Medium | Object-store `ArtifactStorage` implementation (with the AWS work). |
| Medium | Email transport for self-service password reset (admin-issued links exist). |
| Medium | Metrics/tracing (OpenTelemetry) and error tracking. |
| Medium | Restrict the database role used by the application (no TRUNCATE/DDL on `audit_logs`). |
| Low | Prisma 7 and NestJS 12 (ESM) migrations; Tailwind 4. |
| Low | DICOM ingestion with pixel spacing — only with suitable de-identified test data and a validation plan. |
| Low | FHIR export, QR code for MFA enrolment. |

## Continuation point

All work is committed on branch `claude/vigilant-galileo-za03ep`. To continue: start with the
deferred AWS item 1 (otherwise the new backend will not start on ECS), then the background-job
work (C12). Every change should keep the existing test suites green; run the browser smoke test
for UI-affecting changes.
