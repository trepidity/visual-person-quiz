# Couples Communication Lens MVP — BA / Skeptical Validation Review

Reviewer role: BA / skeptical validation agent
Spec under review: `docs/specs/couples-lens-mvp-implementation-spec.md`
Supporting context reviewed:
- `docs/couples-communication-lens-product-brief.md`
- `docs/couples-communication-lens-research-brief.md`
- `docs/couples-lens-adjusted-plan.md`
- `docs/couples-lens-implementation-spec.md` (prior, longer version)
- `docs/owl-visual-verbal-anchor-review.md`
- `docs/validation-roadmap.md`
- Current code: `app/actions.ts`, `components/QuizForm.tsx`, `lib/questions.ts`, `lib/quiz-events.ts`, `lib/db.ts`, `scripts/db-push.mjs`, `scripts/export-agent-review-dataset.mjs`

---

## Executive verdict

**PASS WITH FINDINGS.** The MVP spec is implementation-ready in shape, scope, and safety posture. It correctly solves the root problem (couples using different words/lenses for the same thing), preserves the existing solo flow, and the privacy posture matches the research brief.

No critical blockers. Coders can begin Task 1 (schema) and Task 2 (Model C engine) in parallel after the **High** findings below are folded into the spec. Several gaps will otherwise create coder ambiguity, scoring artifacts the research brief already warned about, or race conditions in production.

Recommended sequencing: apply spec edits in §5 ("Recommended spec edits"), then ship.

---

## What the spec gets right

Calling these out explicitly so they survive editing:

1. **Solves the actual root problem.** Model C constructs (object/scene/detail/spatial/gist/narrative/semantic/communication) directly decompose the "visual vs verbal" overload the owl review flagged. The horse-vs-landscape example becomes object_vs_scene with reciprocal translation moves — exactly the north-star copy in the product brief.
2. **Preserves solo.** Existing `submitQuiz`, `quiz_results` rows, `/results/[id]` route, Model B questions all stay. New `flow_type` defaults to `'solo'` so legacy rows do not need backfill.
3. **MVP privacy minimum.** No names, no emails, no relationship status, no free text. Matches research brief mitigations 3 and 6 verbatim.
4. **Symmetry and evidence rules.** "Round language only," banned terms list, evidence-anchoring rule, low-contrast handling — all present and concrete enough for coders to enforce.
5. **Reciprocal translation moves.** Translation library gives both partners a move per pattern. No "Partner A is the problem" failure mode.
6. **Assumed-similarity check (C3 vs C1).** Operationalizes the Ickes mechanism the research brief identified as the highest-value differentiator.
7. **Schema migrations match existing idempotent style** in `scripts/db-push.mjs` and add proper indexes including partial unique index on `invite_token`.
8. **Deletion is participant-accessible and complete.** Either partner can wipe the paired data without coordination.
9. **Export script extension keeps `hashSaltStored: false` and omits `invite_token`.** Preserves the current privacy posture in `scripts/export-agent-review-dataset.mjs`.
10. **Task breakdown is appropriately granular for coder agents** with file lists and verification per task.

---

## Critical blockers

None. The spec can move to implementation after the High findings below are addressed in the spec text.

---

## High findings

### H1. C9 (imagery band) re-creates the exact scoring artifact the owl review flagged

The owl review (`owl-visual-verbal-anchor-review.md`) was explicit: "the current 'Imagery vividness-leaning' label may be a scoring artifact" because imagery vividness has fewer possible scoring routes than other dimensions, and normalization by max over-weights low-route dimensions.

C9 adds **+1** to `detailFeatures`, `spatialLayout`, or `semanticAnchor` depending on selection. No other question routes points into "imagery." This is a single-question contribution to dimensions that other questions route +3 into. After normalization by max-available, C9's contribution becomes proportionally small and disappears, but the dimension-level inflation problem the owl flagged was the *opposite* — dimensions with few scoring routes get artificially large normalized values when they *do* score.

The MVP spec does not display percentages in the report, which mostly mitigates this. But internal ranking (which difference patterns the report surfaces) is still driven by `normalizedPct`, so a quietly inflated dimension can decide whether a pair gets `detail_vs_atmosphere` vs `blended_or_low_contrast`.

**Recommended fix in spec:**
- Add explicit rule: "C9 contributes to lens scoring as specified but **must not be the sole source** of a top lens. If a participant's top lens would otherwise come from C9 alone (no other question routed ≥2 points into it), demote it from `topLenses`."
- Or simpler: have C9 contribute **only the `imageryBand` tag** and not affect lens scoring at all. Use the band purely as a separate report observation.
- The spec should pick one and write it. Today it leaves coders to discover the failure mode.

### H2. C3 partnerPrediction options have unspecified `scores` shape

Spec §4 says C3 options "mirror C1 and use `partnerPrediction` tags, but do not add to participant lens scores." But `CouplesQuestionOption.scores: LensScores` is a required field on the type. Coders will either:
- Provide non-zero scores (breaks the rule), or
- Provide all-zero scores (matches the rule but creates a silent foot-gun — anyone editing C3 later may add real scores accidentally), or
- Make `scores` optional (changes type signature and affects all questions).

**Recommended fix in spec:**
- Add explicit rule: "C3 options must use `scores: emptyLensScores()`. Linter/test should assert C3 raw score contribution is zero per option."
- Also explicitly state that `maxLensScoresForQuestions()` must **exclude** C3 (and any question with `construct === 'partnerPrediction'`) from the max-available calculation. Otherwise max is inflated and normalized percentages shrink across the board.

### H3. Race condition on pair status updates

`submitPairedQuiz()` reads pair status, inserts result, updates `pair_participants.completed_at`, then updates `pair_sessions.status`. If both partners submit simultaneously, both reads return `open` or `one_complete`, both transitions can lose. End state: pair stuck at `one_complete` even though both completed, or both writes succeed but `updated_at` is non-monotonic.

The spec mentions a concurrency guard for re-submission but not for the status transition.

**Recommended fix in spec:**
- Wrap submission in a single SQL transaction with `select ... for update` on `pair_sessions` row, **or**
- Derive `pair_sessions.status` on read from `pair_participants` completion timestamps instead of storing it. Store only `created_at`, `expires_at`, `deleted_at`. Status becomes a computed view.
- Recommend deriving on read for MVP. Eliminates the race entirely and removes one column from the status enum table.

### H4. Legacy non-null columns get fake zeros for pair rows

Spec §3 instructs paired inserts to write `visual_score=0, words_score=0, detail_score=0, visual_pct=0, words_pct=0`. Any existing analytics query that does `select avg(visual_pct) from quiz_results` will now divide by N including pair rows with zeros. The current `scripts/report.mjs` and `scripts/export-agent-review-dataset.mjs` both already pull these legacy columns.

**Recommended fix in spec:**
- Before writing any paired rows, **all existing aggregate queries** in `scripts/report.mjs` and `scripts/export-agent-review-dataset.mjs` must be updated to filter `flow_type = 'solo'` for legacy metrics. Add this as a Task 6 prerequisite, not just a follow-on.
- Or: make `visual_score`, `words_score`, `detail_score`, `visual_pct`, `words_pct` nullable in the same migration (backward-compatible since solo inserts continue to write values) and set them to NULL for paired rows. Then any aggregate that does `avg(visual_pct)` automatically excludes pair rows.
- Recommend the NULL approach. Simpler and self-protecting.

### H5. Anyone with `pairId` can view results after both complete

Spec §2 routes `/pair/[pairId]/results` with no token. Anyone who knows the pairId — including someone who screenshot-leaked the take URL, someone who saw the URL in a browser history sync, or a CI log scraper — can fetch the comparison report.

This is acknowledged in §8 ("Pair link safety: Results page is accessible by unguessable pair ID only after completion. This is acceptable for MVP") but the threat model is not stated and the mitigation copy is weak ("remind users not to share the link").

The `participantId` segments in `/take/...` and `/waiting/...` give per-participant URLs already; results does not.

**Recommended fix in spec:**
- Either (a) accept and explicitly document the threat: "MVP threat model accepts that pair results URL is leak-equivalent to the participant URLs. Mitigation: copy reminder + 7-day expiry + delete button," or
- (b) Route results as `/pair/[pairId]/results/[participantId]` and require server-side validation that participantId belongs to pairId. Reduces blast radius of a leaked pairId.
- Recommend (b) for MVP — it is a 30-minute change and the validation logic is already in `lib/pairs.ts`.

### H6. No threat model around invite token taken by a non-partner first

`joinPairSession({ pairId, inviteToken })` creates `partner_b` for whoever calls it first with a valid token. If Partner A shares the invite via SMS/email, anyone who intercepts the link (shared device, lock-screen preview, message scraper) can join as Partner B and complete the quiz with junk answers. Partner A then either:
- waits forever (Partner B "joined" but never completes), or
- sees a comparison report against a stranger's answers.

This is the "denial of comparison" or "stuffing" attack.

**Recommended fix in spec:**
- Acknowledge in §8 explicitly. Acceptable risk for MVP, but document.
- Add Partner A control: "If Partner B's answers feel wrong, you can delete this comparison and start a new one." This is already available via delete button — spec should call out this is the mitigation.
- Future enhancement: short-lived join-confirmation step (Partner A approves Partner B join) — out of scope for MVP, but flag for v2.

### H7. C5/C7/C8/C10 are construct-redundant; risk inflating arbitrary lens

C5 ("what feels obvious"), C7 ("when partner is not following, what helps"), C8 ("output format"), and C10 ("crossed-wire repair") all map similar lens constructs in similar ways. A participant who consistently leans `semanticAnchor` will pick `topic`/`clearer-label`/`one-line-summary`/`name-main-thing` and rack up +3 four times. A more varied participant could be flagged as "blended" when in fact they have a coherent style that splits across question framings.

Each question adds genuine signal (obvious vs translation vs output vs repair), but the lens-scoring weights are uniform. Result: top-lens ranking is driven heavily by these 4 questions and somewhat redundantly.

**Recommended fix in spec:**
- Add a "scoring weight rationale" subsection in §4 documenting why each question uses +3 vs +2 vs +1, and confirming that the redundancy is intentional (signal aggregation) vs accidental (double-counting).
- Recommend: keep weights as specified for MVP, but add a fixture test in Task 2 verification: "A respondent answering identically across C5/C7/C8/C10 produces a `clear` confidence top lens. A respondent who splits answers across questions produces `moderate` or `blended` — NOT `clear`." This catches over-weighting bugs before they ship.

### H8. Waiting page does not show whether Partner B has joined

Spec §2 Flow E says PairProgress shows "Partner B: not joined / joined / complete." Good. But Flow F says results page links "from waiting if other partner completes." There is no described UX for the long tail where Partner B never joins. Partner A sits on `/pair/[pairId]/waiting/[participantId]` for hours/days with no signal beyond "Waiting for the other response."

This is a UX/safety gap: Partner A may interpret silence as Partner B being mad/avoidant when in fact the invite was never opened.

**Recommended fix in spec:**
- §2 Flow E: explicitly list states Partner A can see:
  - "Partner B has not opened the invite yet." (no invite_opened event)
  - "Partner B opened the invite but has not joined yet." (invite_opened, no participant)
  - "Partner B joined and is taking the quiz." (participant exists, no completed_at)
  - "Partner B is done." (completed_at set)
- Source these from `pair_participants` and (best-effort) `quiz_events`. Spec already records `invite_opened`.

---

## Medium findings

### M1. `comparePairProfiles()` partner-to-leaning mapping is underspecified

Spec §4 translation library uses `forObjectLeaning`/`forSceneLeaning`/etc. keys, then says: "When assigning partner-specific copy, map 'forObjectLeaning'/etc. to the participant whose top/difference lens matches. If ambiguous, use neutral `forPartnerA` and `forPartnerB` copy."

This is not deterministic. Coders need an algorithm. Example for `object_vs_scene`:

```
if 'objectCategory' in partnerA.topLenses and 'sceneContext' in partnerB.topLenses:
  partnerA copy = forObjectLeaning
  partnerB copy = forSceneLeaning
elif 'sceneContext' in partnerA.topLenses and 'objectCategory' in partnerB.topLenses:
  partnerA copy = forSceneLeaning
  partnerB copy = forObjectLeaning
else:
  # ambiguous — both partners' top lenses are the same or neither matches
  partnerA copy = forPartnerA (generic)
  partnerB copy = forPartnerB (generic)
```

But `different_repair_moves` already uses `forPartnerA`/`forPartnerB` generic keys directly, no leaning mapping. The two patterns mix conventions.

**Recommended fix in spec:**
- Add explicit per-pattern mapping table in §4 showing for each `PairDifferencePattern`: which lens(es) trigger it, and how `forX` keys map to Partner A vs B.
- Standardize translation library shape: either all patterns use leaning-keyed copy, or all patterns use `forPartnerA`/`forPartnerB`. Current mixed shape will produce code with two branches that drift apart.

### M2. Spec uses `app/actions.ts` for all server actions; recommend splitting

Spec §5 says "Add paired actions below it or split pair actions into a separate server module if preferred." Coder agents working in parallel on Task 3 (server actions) and Task 4 (routes/forms) will both touch `app/actions.ts` if not split. Merge conflicts are predictable.

**Recommended fix in spec:**
- Pick one: recommend a new file `app/pair-actions.ts` (Next.js App Router supports per-file `'use server'`). Keep `app/actions.ts` solo-only.
- This isolates Task 3 work and lets Task 4 import from a stable, narrow surface.

### M3. `invite_opened` event semantics are ambiguous

§7 says "Join page loaded with valid-looking pair/token. Best effort; do not block UI." But:
- Does an invalid token still record an event (for abuse/funnel)?
- Does a repeated open by Partner B record duplicates?
- Does Partner A opening their own take URL trigger anything similar?

Without rules, funnel metrics like `pair_joined / pair_created` mix real intent with garbage.

**Recommended fix in spec:**
- Fire `invite_opened` only for **non-expired pair, matching token, no `partner_b` participant yet**. Each pairId records at most one `invite_opened` per browser session (dedupe via cookie or sessionStorage).
- Document this in §7 explicitly.

### M4. Standardize required disclaimer copy

§6 lists 3 required disclaimer locations (`/pair/start`, `CouplesQuizForm` data-use section, `/pair/[pairId]/results`). Copy is sample-only. Coders working in parallel will paraphrase and the message will drift across pages.

**Recommended fix in spec:**
- Add a `SAFETY_DISCLAIMER` constant in `lib/couples-questions.ts` (or new `lib/couples-copy.ts`) with the exact copy.
- All three locations import from there.
- Same for the "what this is not" line in the report, the independent-response reminder, and the deletion warning.

### M5. `pair_sessions.research_opt_in` and `experiment_label` columns are added but unused

§3 declares both columns, but no other spec section captures opt-in UX or describes experiment arm assignment for pair flow. Dead schema.

**Recommended fix in spec:**
- Either: drop both columns from this MVP. Add later when an opt-in UX is in scope.
- Or: spec the minimum surface — e.g., reuse existing `assignExperimentArm()` in `lib/experiments.ts` to attach a label at pair creation time, and capture `research_opt_in` from an optional checkbox on `/pair/start` (default off).
- Recommend: drop both for MVP. The spec already says "do not validate population-level claims from early pair data" — having opt-in columns invites later misuse.

### M6. C9 imagery band has no place in `PairComparisonReport.differences` enum

`PairDifferencePattern` does not include an imagery-related pattern. Spec §4 says reporting must use "one of you reported a more vivid/fainter inner picture in this round" — but the report structure has no field for this. Where does it land? In `sharedGround` (if matched) or as a free-form note?

**Recommended fix in spec:**
- Add `imagery_band_gap` to `PairDifferencePattern`, or
- Add `imageryNote?: string` field to `PairComparisonReport` for the round-language imagery observation.
- Recommend a separate field; it does not match the "difference pattern" structural shape (no translation move pairs naturally).

### M7. `comparePairProfiles` not in scope for Task 2 verification

Task 2 verification says: "Given two fixture answer maps, output deterministic top lenses and pattern IDs. Low-contrast fixture returns `blended_or_low_contrast`. No report text contains banned terms."

This is good but does not verify:
- Reciprocal translation move assignment (H1 mapping rule).
- Assumed-similarity computation from C3 vs C1.
- C10 repair-move surfacing when partners pick different repair categories.

**Recommended fix in spec:**
- Add three more fixture cases to Task 2 verification:
  1. Object-vs-scene fixture asserts the object-leaning partner receives the object-leaning translation copy (not the scene-leaning copy).
  2. Same-prediction fixture (C3 == other's C1 for both) asserts `assumedSimilarity` reads "both predicted closely."
  3. Repair-move-mismatch fixture (C10 partner A: name-main-thing, partner B: give-context) asserts `different_repair_moves` is present.

### M8. `model_version` field missing from `pair_sessions`

Spec uses `couplesScoringVersion = 'couples-lens-mvp-v1'` as a module constant. When Model C v2 ships, in-flight pair sessions started under v1 will have one partner on v1 questions and the other on v2 questions if the version bumps mid-session. The report would compare incompatible answer sets.

**Recommended fix in spec:**
- Add `scoring_version text not null default 'couples-lens-mvp-v1'` column on `pair_sessions`. Stamp at creation. Both participants see the version stamped on their session, not the current `activeCouplesModel`.
- Submission rejects if `couplesScoringVersion !== pair_sessions.scoring_version` (with safe error: "This comparison was started under an older version. Please start a new one.").

### M9. `deletePairSession` semantics around "tombstone vs delete events"

§3 deletion behavior says "delete `quiz_events` for the pair, **or** keep only aggregate tombstone event with no participant/result IDs." Coders will pick one. Inconsistent picks produce inconsistent telemetry.

**Recommended fix in spec:**
- Pick one explicitly. Recommend: keep a single tombstone event of type `pair_deleted` with `pair_id` set, all other IDs nulled. Delete all other events for that pair_id. Tombstone provides retention/deletion auditing without retaining personal-shaped event chain.

### M10. Partner-role assignment in report is positional but not anchored

The report sees "Partner A" and "Partner B" but never tells the reader which one created the pair vs which one joined. If users come back days later, they may not remember which role they were. Risk: each partner reads the report assuming they are the "other one" — degrades safety symmetry.

**Recommended fix in spec:**
- Each participant accesses the results page via a per-participant URL (see H5) that personalizes the report header: "You = Partner A. Your partner = Partner B." The underlying side-by-side stays symmetric; only the header personalizes.
- Or: add a small label at the top of each take page: "You are Partner A. Your invite link sends Partner B to the same comparison." Then both partners remember their role.

### M11. Acceptance tests do not exercise the disclaimer-presence on each page

Acceptance §10 verifies copy via `rg` against banned terms, but does not verify the disclaimer copy is present on `/pair/start`, the form's data-use section, and `/pair/[pairId]/results`.

**Recommended fix in spec:**
- Add three checklist items in §10:
  - [ ] `/pair/start` renders `SAFETY_DISCLAIMER` text.
  - [ ] `CouplesQuizForm` data-use section renders pair-specific data-use copy.
  - [ ] `/pair/[pairId]/results` renders `SAFETY_DISCLAIMER` and "what this is not" copy.

---

## Low findings

### L1. Invite-token base64url should specify URL-safe length cap

`crypto.randomBytes(18).toString('base64url')` is correct. Spec is silent on whether URL display includes padding or not. Node's `base64url` encoding does not include padding, so safe — but call this out so coders do not "fix" it by switching to `base64`.

### L2. Results page should display "expires" copy

§8 mentions 7-day expiry. Results page does not currently include user-facing copy about it. Add: "This comparison will be available until {date}. After that it expires and can no longer be opened."

### L3. Spec is silent on whether `responseTimes` is recorded for paired flow

`submitPairedQuiz` schema includes `responseTimes` (good), but §4/§7 do not say whether response times are stored on the `quiz_results` row or `pair_participants` row. Current solo flow stores on `quiz_results.response_times`. Recommend: keep same.

### L4. PairInviteCard should not show the invite URL once Partner B has joined

Spec §5 says "Show on Partner A take/waiting pages until Partner B has joined." After Partner B joins, the invite token is still in the database and the URL is still valid until expiry. UI hiding it is fine, but the spec should also say: **null out `pair_sessions.invite_token` when Partner B joins** so a leaked URL stops being usable after the join.

This is a one-line addition to `joinPairSession()`. Worth doing.

### L5. C2 image task description "to your partner" — minor framing leak

C2 prompt: "If you had to describe this image to your partner..." During the solo take, Partner A is alone. The framing is fine, but think about whether "partner" framing during the solo entry biases responses (Partner A may consciously simplify for their idea of Partner B). Probably acceptable.

### L6. `quiz_events.flow_type` default `'solo'` will reclassify existing events

The migration `alter table quiz_events add column if not exists flow_type text not null default 'solo'` will fill all existing event rows with `'solo'`. Correct, since all current events are solo. Document this explicitly so it does not look like a backfill bug later.

### L7. `pair_sessions_status_check` will fail if app code transitions to an unlisted status

The CHECK includes `('open', 'one_complete', 'complete', 'expired', 'deleted')`. If H3 fix lands (derive status on read), this constraint becomes dead code that locks future statuses. If kept as stored status, document the rule that any new status enum value requires a migration.

### L8. `participant_role text` on `quiz_results` is unconstrained

No CHECK constraint that limits to `('partner_a','partner_b')`. Solo rows will have NULL, which is fine. But if any coder sets it to a stray string, downstream queries silently break. Add constraint:

```sql
alter table quiz_results add constraint quiz_results_participant_role_check
  check (participant_role is null or participant_role in ('partner_a','partner_b'));
```

### L9. The example report in §6 uses "in this round" — verify all generated copy in `lib/couples-lens.ts` does the same

Add to Task 5 verification: grep generated comparison text for the string "in this round" and assert it appears at least once per section that makes a claim about behavior.

---

## Missing requirements / ambiguity summary

| Topic | Where | What is unclear |
|---|---|---|
| C3 score shape | §4 | "Mirror C1 but do not add to scores" — schema vs literal contents |
| C9 imagery scoring rule | §4 | Whether C9 contributes to lens scoring or only to imagery tag |
| max-score calculation | §4 | Whether `maxLensScoresForQuestions` excludes C3 / partnerPrediction |
| Translation copy mapping | §4 | How `forObjectLeaning` keys map to actual partner A/B per pattern |
| Status transition concurrency | §3, §5 | No transaction / lock spec; race possible on simultaneous submit |
| Results access control | §2 | Whether `pairId` alone authorizes results, or `pairId + participantId` |
| Invite-stuffing threat model | §8 | Not stated; mitigations not enumerated |
| `research_opt_in` UX | §3 | Column declared but no UX described |
| `experiment_label` UX | §3 | Column declared but no arm logic described |
| Tombstone vs delete for events | §3 | "or" — coders will pick differently |
| Disclaimer copy source | §6 | Sample copy only; not pinned to a constant |
| `imageryBand` placement in report | §4 | No field in `PairComparisonReport` for it |
| `scoring_version` per pair session | §3 | Not stored; cross-version sessions possible |

---

## Recommended spec edits

These are the concrete edits the main agent can apply to the spec. Each is a focused change.

1. **§3 (`quiz_results` extension):** Make `visual_score`, `words_score`, `detail_score`, `visual_pct`, `words_pct` nullable; remove the "set to 0 for pair rows" rule. Update Task 6 / `report.mjs` / `export-agent-review-dataset.mjs` notes to expect NULLs and filter accordingly. Fixes H4.

2. **§3 (`pair_sessions`):**
   - Drop `research_opt_in` and `experiment_label` columns. Fixes M5.
   - Add `scoring_version text not null default 'couples-lens-mvp-v1'`. Fixes M8.
   - Optionally drop `status` column and derive on read; or keep and add row-level lock requirement for submission transaction. Fixes H3.

3. **§3 (`quiz_results`):** Add `participant_role` CHECK constraint. Fixes L8.

4. **§2 routing:** Change `/pair/[pairId]/results` to `/pair/[pairId]/results/[participantId]`. Validate `participantId` belongs to `pairId` server-side. Fixes H5 and M10.

5. **§4 (C3 partnerPrediction):**
   - Add rule: "C3 options use `scores: emptyLensScores()`. Test asserts this."
   - Add rule: "`maxLensScoresForQuestions()` excludes questions with `construct === 'partnerPrediction'`." Fixes H2.

6. **§4 (C9 imagery):** Pick and document one of:
   - "C9 contributes only `imageryBand` tag; `scores` are `emptyLensScores()`. Lens scoring ignores C9," or
   - "C9 contributes to scoring as specified; if a top lens is sourced only from C9, demote it." Fixes H1.

7. **§4 (`PairComparisonReport`):** Add `imageryNote?: string` field. Document copy template:
   > "In this round, one of you reported a more {vivid|fainter} inner picture. That can quietly change how 'just picture it' lands." Fixes M6.

8. **§4 (translation library):** Add explicit per-pattern mapping table:

   | Pattern | Trigger | Partner A copy source | Partner B copy source |
   |---|---|---|---|
   | object_vs_scene | A top=objectCategory & B top=sceneContext (or reverse) | forObjectLeaning or forSceneLeaning per match | mirror |
   | label_vs_context | A top=semanticAnchor & B top=sceneContext (or reverse) | forLabelLeaning or forContextLeaning per match | mirror |
   | sequence_vs_gist | A top=narrativeSequence & B top=gistAtmosphere (or reverse) | forSequenceLeaning or forGistLeaning per match | mirror |
   | layout_vs_story | A top=spatialLayout & B top=narrativeSequence (or reverse) | forLayoutLeaning or forStoryLeaning per match | mirror |
   | detail_vs_atmosphere | A top=detailFeatures & B top=gistAtmosphere (or reverse) | forDetailLeaning or forAtmosphereLeaning per match | mirror |
   | different_repair_moves | C10 picks differ between A and B | forPartnerA (generic) | forPartnerB (generic) |
   | blended_or_low_contrast | no other pattern triggered | sharedPractice only, no per-partner copy | sharedPractice only |

   Fixes M1.

9. **§5:** Split paired server actions into `app/pair-actions.ts`. Keep `app/actions.ts` solo-only. Fixes M2.

10. **§5 (`joinPairSession`):** "Null out `pair_sessions.invite_token` after Partner B is created." Fixes L4.

11. **§5 / §6:** Add `lib/couples-copy.ts` with constants for `SAFETY_DISCLAIMER`, `INDEPENDENT_RESPONSE_REMINDER`, `DELETE_WARNING`, `EXPIRY_NOTICE`. All UI imports from here. Fixes M4 and adds L2.

12. **§5 (`submitPairedQuiz`):** Wrap insert+participant update+session update in a single SQL transaction with `select ... for update` on the pair_sessions row (or replace with derived status per H3). Fixes H3.

13. **§7 (`invite_opened`):** Add: "Fired only when pair is non-expired/non-deleted, token matches, `partner_b` does not yet exist. Dedupe via cookie/sessionStorage per pairId per browser." Fixes M3.

14. **§2 Flow E:** Expand PairProgress states for Partner A to include "invite not opened," "invite opened, not joined," "joined, taking quiz," "complete." Source from `pair_participants` + `invite_opened` event. Fixes H8.

15. **§8:** Add explicit threat-model paragraph:
    > "MVP threat model: invite tokens and pair URLs are unguessable but bearer-equivalent — anyone holding them has the privileges of the named participant. We accept this and mitigate via (a) 7-day expiry, (b) deletion by either participant at any time, (c) results path scoped to pair+participant, (d) invite_token nulled after Partner B joins. We do not implement per-participant authentication or join confirmation in MVP." Fixes H5, H6, L4.

16. **§9 Task 2 verification:** Add fixture tests for:
    - Reciprocal copy assignment matches H1/M1 mapping.
    - `assumedSimilarity` populated correctly from C3 vs C1.
    - `different_repair_moves` triggers from C10 mismatch.
    - C9 imagery alone does not push a lens into `topLenses` (per rule from edit 6). Fixes M7.

17. **§9 Task 6:** Add prerequisite step: update `scripts/report.mjs` and `scripts/export-agent-review-dataset.mjs` queries to handle nullable legacy columns / filter by `flow_type` *before* any paired data is written. Fixes H4 dependency ordering.

18. **§10 acceptance criteria:** Add disclaimer-presence acceptance items (M11) and "in this round" copy presence in generated report (L9).

19. **§3 deletion:** Pick "delete `pair_participants`, delete paired `quiz_results`, delete `quiz_events` for pair except one tombstone `pair_deleted` event with nulled IDs." Fixes M9.

---

## Implementation readiness checklist

After the recommended spec edits are applied, the spec is ready for code if and only if:

- [ ] H1 resolved: C9 lens contribution behavior documented (option a or b).
- [ ] H2 resolved: C3 `scores` shape pinned + max-score exclusion rule pinned.
- [ ] H3 resolved: status transition either transactional+locked or derived-on-read.
- [ ] H4 resolved: legacy columns nullable OR all aggregate queries filter by `flow_type`.
- [ ] H5 resolved: results route includes `participantId` OR threat model explicitly documents the accepted risk.
- [ ] H6 resolved: invite-stuffing threat documented; delete is mitigation.
- [ ] H7 resolved: scoring-weight rationale recorded + fixture test asserting split-answer respondent is not classified `clear`.
- [ ] H8 resolved: PairProgress states for Partner A enumerate the no-join cases.
- [ ] M1 resolved: per-pattern translation copy mapping table added.
- [ ] M2 resolved: pair server actions live in `app/pair-actions.ts`.
- [ ] M3 resolved: `invite_opened` dedupe + validity rules documented.
- [ ] M4 resolved: copy constants module exists; required disclaimers reference it.
- [ ] M5 resolved: unused columns dropped OR UX specified.
- [ ] M6 resolved: imagery observation field added to `PairComparisonReport`.
- [ ] M7 resolved: extra fixture tests in Task 2 verification.
- [ ] M8 resolved: `scoring_version` per pair session.
- [ ] M9 resolved: deletion picks one approach (delete + tombstone event).
- [ ] M10 resolved: role-personalization on results header.
- [ ] M11 resolved: disclaimer-presence acceptance tests added.
- [ ] L1–L9 reviewed and either folded or explicitly deferred to follow-on.

---

## Final note for the main agent

The spec is **fundamentally sound**. It correctly translates the product brief, research brief, and owl review into an implementable plan that:
- preserves the existing solo flow,
- adds a paired flow with anonymous participation,
- safely surfaces lens differences with reciprocal translation moves,
- avoids every red line from the research brief (compatibility score, clinical claims, trait labeling, score-driven blame).

The findings above are about closing race conditions, removing dead schema, naming a threat model, and giving coder agents fewer chances to silently diverge. None of them require a redesign. Apply the edits in §5 and ship.