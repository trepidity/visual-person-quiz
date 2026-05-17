# Couples Communication Lens MVP — QA Review

Reviewer role: QA agent for the Couples Communication Lens MVP implementation.
Implementation reviewed: working tree at `/Users/jared/.openclaw/workspace/visual-person-quiz` (not just `git diff`).
Authoritative specs reviewed:
- `docs/specs/couples-lens-mvp-implementation-spec.md` (§11 is binding)
- `docs/specs/couples-lens-ba-review.md`

---

## Executive verdict

**PASS WITH FINDINGS.** The implementation matches the spec on all major BA-review amendments (§11.1–§11.8): per-participant results URL, role personalization, schema (no `research_opt_in`/`experiment_label`, with `scoring_version`), nullable legacy solo columns, transactional submit with `select … for update`, paired actions split into `app/pair-actions.ts`, invite-token nulled on join, C3/C9 excluded from lens scoring, copy constants imported from `lib/couples-copy.ts`, and the imagery note added to `PairComparisonReport`. The fixture verifier passes all seven mandated assertions and the production build succeeds with TypeScript strict mode.

No critical blockers. The findings below are medium-and-below concurrency/edge-case gaps that should be addressed before public launch but do not block an internal preview deploy.

---

## Commands run

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/verify-couples-scoring.mjs` (with `DATABASE_URL` unset) | PASS — 7/7 assertions | Output reproduced below. |
| `npm run build` (Next.js 16.2.6, Turbopack) | PASS — compiled in 2.4s, TS in 1.25s, 6 static pages generated | Routes confirmed: `/`, `/solo`, `/results/[id]`, `/api/quiz-events`, `/pair/start`, `/pair/[pairId]/join`, `/pair/[pairId]/take/[participantId]`, `/pair/[pairId]/waiting/[participantId]`, `/pair/[pairId]/results/[participantId]`. |
| `node --check scripts/db-push.mjs scripts/report.mjs scripts/export-agent-review-dataset.mjs scripts/verify-couples-scoring.mjs scripts/export-results.mjs` | PASS — `OK` | Plain syntax check for the .mjs scripts. |
| `rg "compatibility\|incompatible\|match score\|diagnosis\|disorder\|deficit\|normal/abnormal\|the visual one\|the verbal one"` over `app/`, `components/`, `lib/` | PASS — matches only in disclaimers (`app/page.tsx`, `app/solo/page.tsx`, `app/results/[id]/page.tsx`, `lib/questions.ts`) and the banned-terms list itself (`lib/couples-scoring.ts`). | No interpretive pair-report copy contains banned language. |
| `rg "better\|worse\|more accurate\|less accurate"` | PASS — matches only in the banned-terms allowlist at `lib/couples-scoring.ts:123-126`. | |
| `rg "in this round"` over `lib/couples-scoring.ts` | PASS — 14 occurrences across `frame`, `leaningPatternDefinitions[*].body`, `repairDifferenceCopy.body`, `lowContrastDifferenceCopy.body`, `buildSharedGround`, `buildAssumedSimilarity`, and `buildImageryNote`. | Round-language present in every interpretive section. |
| `npm run db:push` | **BLOCKED** — `DATABASE_URL` not present in shell; `.env.local` exists but was not loaded for the QA pass (safety: not connecting to a live Neon DB from a QA review). | The migration script `scripts/db-push.mjs` is idempotent and syntactically valid; manual verification still required by the implementer. |

Fixture verifier output (verbatim):

```
✓ C3 contributes zero and is excluded from max-score normalization
✓ C9 alone cannot place a lens in topLenses
✓ Object-vs-scene reciprocal copy assigns correctly
✓ Exact C3 prediction match sets assumed-similarity close-match copy
✓ C10 repair mismatch triggers different_repair_moves
✓ Split C5/C7/C8/C10 fixture does not produce false clear confidence
✓ Generated report uses round language and avoids banned terms
All couples scoring fixture checks passed.
```

`npm run build` route table (verbatim, abridged):

```
├ ○ /
├ ƒ /api/quiz-events
├ ƒ /pair/[pairId]/join
├ ƒ /pair/[pairId]/results/[participantId]
├ ƒ /pair/[pairId]/take/[participantId]
├ ƒ /pair/[pairId]/waiting/[participantId]
├ ƒ /pair/start
├ ƒ /results/[id]
└ ○ /solo
```

---

## What the implementation gets right

These resolve spec / BA-review items and are worth recording so they survive future edits.

1. **Routes match the spec exactly.** `/`, `/solo`, `/results/[id]`, `/pair/start`, `/pair/[pairId]/join`, `/pair/[pairId]/take/[participantId]`, `/pair/[pairId]/waiting/[participantId]`, and `/pair/[pairId]/results/[participantId]` are all present. There is **no** `/pair/[pairId]/results/page.tsx` (without `participantId`), so a bare `pairId` URL cannot render the report.
2. **Results route validates participant ↔ pair binding server-side.** `app/pair/[pairId]/results/[participantId]/page.tsx:25-37` queries `pair_participants pp join pair_sessions ps` filtered by `pp.pair_id = ${pairId}` and looks up `current` by `participantId`; if not found, `notFound()` is returned. It also redirects to waiting when either participant has not completed, and validates `deleted_at` / `expires_at` before any report rendering.
3. **Role personalization without breaking symmetry.** `app/pair/[pairId]/results/[participantId]/page.tsx:70` renders `You = Partner A. Your partner = Partner B.` (and the mirror) in the header only. The side-by-side body, shared-ground, differences, assumed-similarity, translation-moves, imagery note, and "what this is not" sections stay structurally symmetric.
4. **Schema matches §11.2.** `scripts/db-push.mjs` creates `pair_sessions` with `scoring_version` (default `couples-lens-mvp-v1`), explicitly **drops** `research_opt_in` and `experiment_label` (lines 58–59), and adds the `pair_sessions_status_check` constraint. `quiz_results` legacy solo columns are made nullable (`alter ... drop not null` at lines 30–34). `quiz_results_participant_role_check` ensures the role is `partner_a`/`partner_b` or NULL. Unique index `pair_participants_pair_role_unique_idx` blocks more than two participants per pair.
5. **Submit transaction with row-level lock.** `app/pair-actions.ts:166-205` opens `sql.transaction(...)` with `select id from pair_sessions where id = ${pairId} for update` as the first statement, then INSERT + UPDATE pair_participants + UPDATE pair_sessions.status in order. The status `case` expression also tolerates the read-your-writes ordering via `(completed_at is not null or id = ${parsed.participantId})`.
6. **Invite-token nulled immediately after Partner B joins.** `joinPairSession()` at `app/pair-actions.ts:89-93` updates `pair_sessions set invite_token = null` after inserting Partner B. A leaked invite URL stops working after the join, as §11.3 / L4 required.
7. **Scoring-version mismatch is rejected with safe copy.** `app/pair-actions.ts:160-162` throws `This comparison was started under an older version. Please start a new one.` when `participantRow.scoring_version !== couplesScoringVersion`. Matches §11.3 verbatim.
8. **C3 + C9 do not affect lens scoring or max normalization.**
   - C3 partnerPrediction options use `emptyLensScores()` (`lib/couples-questions.ts:200-226`).
   - C9 imagery options use `emptyLensScores()` (`lib/couples-questions.ts:443-468`); only the `imageryBand` tag is emitted.
   - `maxLensScoresForQuestions()` (`lib/couples-scoring.ts:146-156`) skips questions whose construct is `partnerPrediction`.
   - `evidenceSupportForLens()` (`lib/couples-scoring.ts:306-319`) skips both `partnerPrediction` and `imageryBand` answers, so confidence and topLenses cannot be driven by C3 or C9.
9. **`PairComparisonReport.imageryNote` exists.** Defined at `lib/couples-scoring.ts:101` and populated by `buildImageryNote()` (`lib/couples-scoring.ts:774-778`) only when both bands are present and differ. Rendered in `app/pair/[pairId]/results/[participantId]/page.tsx:145`.
10. **Translation-move mapping is reciprocal and deterministic.** `translationCopyForLens()` (`lib/couples-scoring.ts:724-753`) maps the BA-review §11.6 table directly. Verified by `verify-couples-scoring.mjs` lines 114–126: object-leaning A receives `After naming the main thing, add one sentence of surrounding context.` and scene-leaning B receives `Name the central object or decision earlier, then add the scene around it.`
11. **Paired actions are isolated.** `app/pair-actions.ts` holds `createPairSession`, `joinPairSession`, `recordInviteOpened`, `submitPairedQuiz`, `deletePairSession`. `app/actions.ts` remains solo-only.
12. **Required disclaimers are centralized.** All paired pages (`pair/start`, `pair/[pairId]/join`, `pair/[pairId]/take/[participantId]` via `CouplesQuizForm`, `pair/[pairId]/waiting/[participantId]`, `pair/[pairId]/results/[participantId]`) import `SAFETY_DISCLAIMER` / `INDEPENDENT_RESPONSE_REMINDER` / `DELETE_WARNING` / `EXPIRY_NOTICE` from `lib/couples-copy.ts`.
13. **Privacy posture matches §8.** No name/email/phone/relationship-status inputs. The form data-use note (`components/CouplesQuizForm.tsx:184`) is pair-specific: "stores selected answers, timing, anonymous session IDs, and generated comparison data. It does not ask for names, email, or login."
14. **Deletion is participant-accessible and cascading.** `deletePairSession()` (`app/pair-actions.ts:231-256`) runs in a transaction: delete `quiz_events`, delete paired `quiz_results`, delete `pair_participants`, then mark `pair_sessions.status='deleted'`, set `deleted_at`, null `invite_token`, and write a single `pair_deleted` tombstone event with `pair_id` retained.
15. **Export hashes pair-related identifiers and omits invite tokens.** `scripts/export-agent-review-dataset.mjs` hashes `pair_id`, `participant_id`, `result_id`, `event_id`, `session_id`; sanitizer drops any key containing `invitetoken`/`inviteurl`/`invitelink` (lines 184-186); manifest counts include `pairSessions`, `pairsWithPartnerBJoined`, `completePairs`, `oneCompletePairs`, `deletedPairs`, `expiredPairs`; legacy solo metrics for pair rows are set to null (lines 346-350); raw JSONL/JSON files for `pair_sessions`, `pair_participants`, `pair_comparisons` are written.
16. **`scripts/report.mjs` filters legacy solo aggregates by `flow_type = 'solo'`.** Solo result types and experiment-assignment queries (lines 60–72, 75–86) and the solo session funnel (lines 117–137) all add `where flow_type = 'solo'` when the column exists. Pair funnel metrics are separate (lines 269–286).
17. **Pair fixture tests verify the BA review's “meaningful” scenarios.** `scripts/verify-couples-scoring.mjs` covers C3 exclusion, C9-only no-topLens, object-vs-scene reciprocal copy, exact-C3-match assumed-similarity, C10 repair mismatch, split repeated-item answers not classified `clear`, and round-language + banned-term sweep. All seven pass.

---

## Critical findings

None.

---

## High findings

None.

---

## Medium findings

### M1. `joinPairSession()` is not transactional — concurrent Partner B joins surface a raw error instead of the spec'd copy

`app/pair-actions.ts:64-106` performs a read (existence/expiry/token/has_partner_b) followed by an INSERT and a separate UPDATE without a transaction. If two browsers hit the join URL within a few hundred ms of each other:

1. Both reads return `has_partner_b = false`.
2. Both INSERTs are issued. The unique constraint `pair_participants_pair_role_unique_idx (pair_id, role)` protects integrity — only one Partner B can exist — but the losing INSERT throws a raw Postgres `duplicate key value violates unique constraint` error, not the spec's `This comparison already has two participants.` message. Worse, the losing browser does not get redirected; the user sees Next.js's default server-action error UI.

**Recommended fix:**
- Wrap the read + insert + token-null update in a single `sql.transaction([...])` with `select ... for update` on the `pair_sessions` row.
- Catch unique-violation errors specifically (PG `23505`) and re-throw with the spec'd copy.
- Alternative: keep the current structure but add `try { await sql\`insert ...\` } catch (error) { if (isUniqueViolation(error)) throw new Error('This comparison already has two participants.'); throw error; }`.

Reference spec: §2 Flow C ("If Partner B already exists, show a safe error page: 'This comparison already has two participants.'") and §8 error-handling rule.

### M2. `submitPairedQuiz()` can insert a duplicate `quiz_results` row under concurrent double-submit

`app/pair-actions.ts:146-205`:

1. `participantRow` is read non-transactionally.
2. If `completed_at` is NULL, the function enters the transaction.
3. The transaction unconditionally INSERTs into `quiz_results`, then updates `pair_participants ... where id = ${participantId} and completed_at is null` (this *will* update zero rows on the second concurrent call), then updates `pair_sessions.status`.

The `select ... for update` on `pair_sessions` serializes the two transactions, but it does not prevent two `quiz_results` rows being written for the same `participantId`. Read-your-writes does not span transactions: the first tx's INSERT is invisible to the second tx's pre-INSERT check because the check happens *before* `sql.transaction()` begins.

Real-world trigger surface is small: the client `disabled={!canSubmit}` (`components/CouplesQuizForm.tsx:62, 191`) blocks UI double-clicks while `useTransition` is pending. But network retries, page refresh-during-submit, or two tabs of the same participant can still hit this.

Symptoms: `quiz_results` has two rows for one participant; `app/pair/[pairId]/results/[participantId]/page.tsx:42-46` already orders `... order by participant_role asc, created_at desc` and uses `find()`, so the report renders the newest row — but downstream analytics (`pair_participantResults` count) over-counts.

**Recommended fix:** add a uniqueness guard. Cheapest is a partial unique index in `scripts/db-push.mjs`:

```sql
create unique index if not exists quiz_results_pair_participant_unique_idx
  on quiz_results(pair_id, participant_id)
  where flow_type = 'pair' and participant_id is not null;
```

Then handle the unique-violation in `submitPairedQuiz()` by re-reading the existing result and redirecting appropriately. Alternatively (and more invasive): move the `select participantRow` inside the transaction after the `for update` lock so read-your-writes hold.

### M3. `scripts/export-results.mjs` does not filter `flow_type = 'solo'`

`scripts/export-results.mjs:23-29` emits a CSV of *all* `quiz_results` rows, including paired rows. Pair rows have:
- `result_type = 'couples_lens'`
- `model = 'C'`
- `visual_pct`/`words_pct` NULL (renders as empty cells — safe, per §11.2)
- `raw_scores` containing `LensScores` keys (`objectCategory`, `sceneContext`, …) — the script then probes for `objectDetail`/`sceneGist`/etc., so all six dimension cells are empty.

The CSV is technically valid but mixes solo and pair rows in a file whose columns presume a Model B / solo schema. Any consumer of `export:results` that assumes "this file is the solo dataset" silently double-counts row volume.

Spec §11.2 makes the requirement explicit: "Before any paired data is written, `scripts/report.mjs` and `scripts/export-agent-review-dataset.mjs` must filter legacy solo metrics by `flow_type = 'solo'` or handle NULL legacy columns safely." The current implementation handles `scripts/report.mjs` and `scripts/export-agent-review-dataset.mjs` correctly, but the `scripts/export-results.mjs` legacy CSV was missed.

**Recommended fix:** add a `where flow_type = 'solo' or flow_type is null` clause to the SELECT in `scripts/export-results.mjs:23-29`. If keeping pair rows is intentional, add a `flow_type` CSV column so consumers can filter downstream.

### M4. `recordInviteOpened` does not dedupe stale token reuses

`app/pair-actions.ts:108-131` records `invite_opened` whenever the pair exists, the token matches, `deleted_at is null`, `expires_at > now()`, and Partner B does not exist. Client-side dedupe is implemented in `components/InviteOpenedTracker.tsx` via `window.sessionStorage`, but that is per-browser-session, not per-pair. If Partner A pastes the invite URL into a private/incognito window to verify it, that browser fires another `invite_opened`. If the invite URL is opened from a link-preview bot (iMessage, Slack, WhatsApp), each preview fetch potentially triggers an extra `invite_opened` event (depending on whether the link preview runs JavaScript — most don't, but link-preview/server-rendered behavior is platform-dependent).

This does not affect functionality; it inflates the `invite_opened / pair_created` funnel ratio in `scripts/report.mjs:269-286`. The spec §11.3 says "Dedupe in the browser via cookie or sessionStorage per pairId" and the implementation does match that letter — this finding is a heads-up that the funnel number should be read as "events" not "unique invite recipients."

**Recommended fix (optional):** dedupe server-side as well by checking `not exists (select 1 from quiz_events where pair_id = ${pairId} and event_type = 'invite_opened' limit 1)` before inserting. Cheap; eliminates link-preview noise. Or — even cheaper — keep the current behavior and document the metric semantics in the report.

### M5. `pair_deleted` tombstone retains `participant_role` text

`deletePairSession()` (`app/pair-actions.ts:246-253`) reads the participant role before the deletion transaction and passes `participantRole: participant[0].role` to `recordQuizEvent({ eventType: 'pair_deleted', ... })`. The recorded event has `pair_id` and `participant_role` (and `metadata.participantRole`) set; `participant_id` and `result_id` are null.

Spec §11.2 wording: "delete `quiz_events` for the pair except one tombstone event `pair_deleted` with `pair_id` retained and participant/result identifiers nulled." Strictly read, "participant identifiers" means `participant_id` (and the deleted UUID is not retained). `participant_role` is a category, not an identifier. So this is **borderline-compliant** but worth tightening: knowing whether the deleter was Partner A vs Partner B is moderate retention metadata that the spec did not explicitly authorize.

**Recommended fix:** drop `participantRole` from the `recordQuizEvent` call inside `deletePairSession`, or move it into the JSON `metadata` as an opaque deletion-origin marker (e.g., `metadata: { deletedBy: 'a' | 'b' }`) and explicitly document it in the spec.

---

## Low findings

### L1. Imagery note hardcodes "more vivid" rather than dynamically picking vivid/fainter

`lib/couples-scoring.ts:774-778` always returns the "more vivid inner picture" sentence whenever the two `imageryBand` values differ. Because the copy starts with "one of you," the framing is symmetric and remains *correct* in every case (the partner with the higher band is the one referenced). But the spec template says `{vivid|fainter}` — if the future copy expects dynamic substitution, this would silently miss it.

Recommended: leave as-is for MVP; add a code comment noting the symmetric-framing rationale, or implement the dynamic substitution if there are stakeholder concerns.

### L2. `CouplesQuizForm` server-side prop `inviteUrl` can stale after Partner B joins mid-take

`app/pair/[pairId]/take/[participantId]/page.tsx:28-31` reads `invite_token` server-side; the rendered form prop is fixed for the lifetime of the rendered page. If Partner A is mid-quiz, Partner B joins from another device, and Partner A's page is not re-fetched, the invite section in the form still shows the (now-invalid) link. This is acceptable per spec — the token is invalid post-join, so reuse fails — but Partner A has no visible cue that the link is dead until they navigate or refresh.

Recommended: optionally poll on the take page (low priority), or add a sentence: "If your partner has already joined, the link above will stop working."

### L3. `CouplesQuizForm` registers `pair_started` event via fetch only after first interaction

`components/CouplesQuizForm.tsx:89-105` fires `pair_started` on first `markSeen` (mouseenter/focus/touchstart on any fieldset). For users using a keyboard only and tabbing directly to the radio inputs, the `onFocus` on the fieldset does cover this — fine. But on the server side the `submitPairedQuiz()` records `pair_completed` regardless of whether a `pair_started` was ever recorded. Funnel math `pair_started → pair_completed` can show >100% completion if start events are dropped (e.g., adblocker blocks `/api/quiz-events`).

Recommended: document the metric semantics; or, server-side, also emit a derived `pair_started` if `pair_completed` arrives without a prior `pair_started`. Low priority.

### L4. `inviteOpened` flag on waiting page reflects any event for the pair, not just non-deduped browser sessions

`app/pair/[pairId]/waiting/[participantId]/page.tsx:38-43` queries `select count(*) from quiz_events where pair_id = ${pairId} and event_type = 'invite_opened'` and treats `count > 0` as "invite opened." That means Partner A sees "invite opened, not joined" if *anyone* (including Partner A themselves in incognito) opened the link. Reasonable for MVP; the underlying inflation is the same as M4 above.

### L5. `pair_sessions` status `expired` is never written automatically

`scripts/db-push.mjs:52` includes `expired` in the status enum, but no code path transitions a pair to `expired` after `expires_at` passes. The pages and actions check `new Date(expires_at) < new Date()` and reject access, so user-facing behavior is correct. But `scripts/report.mjs:283` reports `pair_sessions_expired` based on `status = 'expired'` — currently always zero, even when many pairs are past their expiry. Either:
- Add a periodic cron / migration step that updates `status = 'expired'` for expired pairs, or
- Change the report query to compute "expired" as `status not in ('deleted', 'complete') and expires_at < now()`.

Recommended: pick the report-side fix; it is one line.

### L6. Double-submit on solo `submitQuiz` is not guarded either

Mirror of M2 in the solo flow. Out of scope for this QA (couples MVP), but flagged so it does not regress later.

### L7. `verify-couples-scoring.mjs` recompiles TypeScript at runtime; CI run-time cost grows with `lib/`

The verifier uses `tsc --ignoreConfig --module commonjs ...` to compile two `.ts` files into a tmpdir, then requires them. Works, but the spawn-tsc-per-run pattern is brittle: if `lib/couples-scoring.ts` ever imports another `lib/*.ts` not listed in the `execFileSync` arg list, the verifier fails. Today the import surface is `./couples-questions`, which is listed. Fine for now — log as something to watch.

Recommended: optionally migrate to `tsx scripts/verify-couples-scoring.mjs` or compile via the same TS config used by Next.js.

---

## Spec-coverage matrix (BA review §11)

| §11 item | Verdict | Evidence |
| --- | --- | --- |
| 11.1 Results route includes `participantId` | PASS | `app/pair/[pairId]/results/[participantId]/page.tsx` exists; no bare `results/page.tsx`. |
| 11.1 participantId ↔ pairId validation server-side | PASS | `results/[participantId]/page.tsx:25-33`. |
| 11.1 Role personalization in header only | PASS | `results/[participantId]/page.tsx:70-78`. |
| 11.1 `invite_token` nulled after Partner B joins | PASS | `pair-actions.ts:89-93`. |
| 11.1 7-day expiry + either-partner delete | PASS | `pair_sessions.expires_at` default + `DeletePairButton` on take, waiting, results. |
| 11.2 No `research_opt_in` / `experiment_label` columns | PASS | `db-push.mjs:58-59`. |
| 11.2 `pair_sessions.scoring_version` column | PASS | `db-push.mjs:50, 56`. |
| 11.2 `quiz_results.participant_role` check constraint | PASS | `db-push.mjs:116-129`. |
| 11.2 Legacy solo columns nullable, NULL for pair rows | PASS | `db-push.mjs:30-34`; `pair-actions.ts:174-175` writes nulls. |
| 11.2 Single SQL tx + `select ... for update` on submit | PASS | `pair-actions.ts:166-205`. |
| 11.2 `report.mjs` / `export-agent-review-dataset.mjs` filter solo | PASS for both targeted scripts; **MISSED** for `export-results.mjs` (M3). | See M3. |
| 11.2 Deletion semantics (cascade + tombstone) | PASS (borderline — see M5) | `pair-actions.ts:239-253`. |
| 11.3 Paired actions in `app/pair-actions.ts` | PASS | File exists; `app/actions.ts` solo-only. |
| 11.3 `joinPairSession` nulls `invite_token` | PASS | `pair-actions.ts:89-93`. |
| 11.3 `invite_opened` only for valid token + no Partner B | PASS | `pair-actions.ts:108-131`. |
| 11.3 sessionStorage dedupe per pairId | PASS | `components/InviteOpenedTracker.tsx`. |
| 11.3 Scoring-version mismatch rejection | PASS | `pair-actions.ts:160-162`. |
| 11.4 C3 partnerPrediction `scores: emptyLensScores()` | PASS | `couples-questions.ts:200-226`. |
| 11.4 `maxLensScoresForQuestions()` excludes partnerPrediction | PASS | `couples-scoring.ts:148`. |
| 11.4 C9 imagery only contributes `imageryBand` tag | PASS | `couples-questions.ts:443-468`. |
| 11.4 Scoring-weight rationale comment | PASS | `couples-questions.ts:97-101`. |
| 11.4 Fixture tests (all 6 items) | PASS | `verify-couples-scoring.mjs` lines 50–159; all assertions pass. |
| 11.5 `PairComparisonReport.imageryNote` field | PASS | `couples-scoring.ts:101`. |
| 11.5 `lib/couples-copy.ts` copy constants | PASS | File exists with all 4 required exports; imported across paired pages and form. |
| 11.6 Translation mapping table | PASS | `couples-scoring.ts:724-753` implements per-pattern mapping; fixture verifies object_vs_scene reciprocal mapping. |
| 11.7 Waiting-page Partner A states enumerated | PASS — 4 states (`statusText` in `waiting/[participantId]/page.tsx:14-19`) | "not joined" / "invite opened, not joined" / "joined, taking quiz" / "complete" (plus "waiting" for Partner A's own row). |
| 11.8 Disclaimer presence on start / take / waiting / results | PASS | Verified each page imports + renders `SAFETY_DISCLAIMER`. |
| 11.8 "in this round" round-language in report | PASS | 14 occurrences across all interpretive sections in `couples-scoring.ts`. |
| 11.8 Banned-term sweep clean in interpretive copy | PASS | `rg` against `app/`, `components/`, `lib/` shows only disclaimer + allowlist occurrences. |
| 11.8 Bare `pairId` cannot render report | PASS | No route file at `/pair/[pairId]/results/page.tsx`. |
| 11.8 Paired rows do not affect solo aggregates | PASS for `report.mjs` and `export-agent-review-dataset.mjs`; **MISSED** for `export-results.mjs` (M3). | See M3. |
| 11.8 Deletion leaves only `pair_deleted` tombstone | PASS (borderline — see M5) | `pair-actions.ts:239-253`. |

---

## Recommended next steps before public launch

These mirror the findings above in priority order. None are critical; doing all five hardens the implementation against the most likely production failure modes.

1. **M1**: wrap `joinPairSession()` in a transaction + catch unique-violation. ~15 lines.
2. **M2**: add partial unique index `quiz_results_pair_participant_unique_idx` on `(pair_id, participant_id) where flow_type='pair'` and handle the conflict in `submitPairedQuiz()`. ~10 lines + 1 migration line.
3. **M3**: add `where flow_type = 'solo' or flow_type is null` to `scripts/export-results.mjs`. ~1 line.
4. **L5**: change `scripts/report.mjs` expired-pair count to compute on the fly. ~3 lines.
5. **M5**: drop `participantRole` from the `pair_deleted` event call (or move it into `metadata` and document). ~1 line.

Optional bonus:
- Add a Playwright / manual end-to-end script for the pair flow now that the route surface is stable.
- Document the metric semantics noted in M4 and L3 in `scripts/report.mjs`'s output header.

---

## Closing assessment

The implementation is fundamentally sound and tightly follows §11 of the implementation spec. The fixture verifier covers every BA-review-mandated invariant and passes cleanly. The production build succeeds. No banned terms leak into interpretive copy. Pair data does not contaminate solo aggregates in the two targeted analytics scripts. The few medium findings are concurrency edge cases that the spec largely anticipated; closing them is straightforward and does not require redesign.

This QA review introduces **no code changes**. All findings cite file:line for the implementer to address.
