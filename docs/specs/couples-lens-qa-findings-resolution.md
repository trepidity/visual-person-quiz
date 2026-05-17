# Couples Communication Lens MVP — QA Findings Resolution

QA source: `docs/specs/couples-lens-qa-review.md`

## Resolved findings

- **M1 — concurrent Partner B joins:** `joinPairSession()` now uses a transaction with `select ... for update`, inserts Partner B only while the invite is still valid and no Partner B exists, and returns the safe already-joined/invalid-invite errors instead of surfacing raw database errors.
- **M2 — duplicate paired submissions:** added partial unique index `quiz_results_pair_participant_unique_idx` and changed `submitPairedQuiz()` to insert only when the participant is still incomplete and no pair result exists for that participant. Duplicate/retry submissions redirect to waiting/results without creating another row.
- **M3 — legacy CSV export mixing pair rows:** `scripts/export-results.mjs` now detects `flow_type` and exports only solo rows when the column exists.
- **M4 — invite-opened inflation:** `recordInviteOpened()` now includes a server-side `not exists` check so each pair records at most one `invite_opened` event.
- **M5 — deletion tombstone role retention:** `pair_deleted` tombstone no longer stores `participantRole`; only `pair_id` and non-identifying model/version context remain.

## Low findings

- L1-L7 were reviewed. No public-launch blocker remains. L5 remains a reporting hygiene follow-up: expired pairs are rejected at page/action level, but the report can later compute expiry from `expires_at` instead of relying only on `status = 'expired'`.

## Verification after fixes

- `npm run build` — passed.
- `node scripts/verify-couples-scoring.mjs` — passed all fixture assertions.
- `node --check scripts/db-push.mjs scripts/report.mjs scripts/export-agent-review-dataset.mjs scripts/export-results.mjs scripts/verify-couples-scoring.mjs` — passed.
- Safety grep over `app`, `components`, and `lib` found banned terms only in solo disclaimers/legacy solo copy and the banned-term allowlist; pair report interpretive copy remains clean.

## Remaining blocker

- `npm run db:push` could not be executed in this shell because `DATABASE_URL` is not exported. The migration script is syntactically valid, but live DB migration still needs an environment with `DATABASE_URL` available.
