# Data management

This describes what the application stores and the controls it provides. It is not a retention
policy: retention periods are a legal and organisational decision that the deploying
organisation must make.

## What is stored

| Data | Where | Notes |
| --- | --- | --- |
| Case narrative and patient context | `clinical_cases` | Clinician-entered free text; may contain health information. |
| Analyses | `clinical_analyses` | Validated model output (successful runs only), model, prompt version/hash, safety flags, latency, token usage. Failed runs keep an error code and no result. |
| MRI images and derived masks/overlays | Local disk under `ARTIFACT_STORAGE_DIR`, keyed by case and image id | Files are written with owner-only permissions. Not shared between server instances. |
| MRI measurements | `mri_analyses.findings` | Pixel counts/ratios. |
| Doctor feedback | `doctor_feedbacks` | Rating and optional comment. |
| Accounts | `users`, `refresh_tokens`, `password_reset_tokens` | Only hashes of passwords and tokens are stored; MFA secrets are AES-256-GCM encrypted. |
| Audit events | `audit_logs` | Action, actor, organization, resource id, IP, minimal metadata. Never clinical text, passwords or tokens. |

Application logs contain request method, path (no query string), status, latency and user id —
not request bodies.

## Access

Access is enforced server-side by a single case-access policy (`backend/src/common/policies`):
doctors access their own cases; organization admins can read their organization's cases; super
admins can read all cases. Clinical actions (analysis, uploads, feedback) are limited to the
treating doctor. Case views, exports, image views, deletions and all authentication events are
audited.

## Export

`GET /api/v1/clinical-cases/:id/export` (UI: "Export JSON") returns the case, its analyses and
MRI measurements as JSON for anyone allowed to read the case. Each export is audited
(`case.export`). Images are not included in the export.

## Deletion

- **Cases:** `DELETE /api/v1/clinical-cases/:id`, super admins only. Deletes the case, its
  analyses, feedback, MRI records and image files. The deletion itself is audited
  (`case.delete`); earlier audit events about the case are kept.
- **Users:** user accounts cannot be hard-deleted while they own cases, feedback or audit events
  (database `RESTRICT`/`NO ACTION`), so clinical history is never removed as a side effect.
  Deactivate accounts by suspending them.
- **Audit events:** the `audit_logs` table rejects `UPDATE` and `DELETE` via a trigger. Retention
  of audit data therefore requires a deliberate, privileged database operation (for example a
  documented archival job run by the database owner), which should itself be recorded.

## Not provided

- Automatic retention/expiry of cases, images or audit events.
- Patient-level identifiers (the system has no patient entity), so per-patient export/erasure
  must be done per case.
- Encryption of image files at rest beyond what the host filesystem provides.
