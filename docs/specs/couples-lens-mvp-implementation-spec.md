# Couples Communication Lens MVP — Implementation Spec

Status: implementation-ready MVP spec  
Scope: first shippable paired/couples flow in the existing Next.js app  
Repo baseline: Next.js App Router + Tailwind + Neon Postgres; current solo quiz lives in `app/page.tsx`, `components/QuizForm.tsx`, `app/actions.ts`, and `lib/questions.ts`.

This spec intentionally narrows the previous product/research briefs into an achievable first release. It preserves the existing solo quiz while adding an anonymous paired comparison flow built around Model C lens constructs.

---

## 1. Goals / non-goals

### Goals

1. **Preserve the existing solo quiz.**
   - Keep `submitQuiz`, `quiz_results`, `/results/[id]`, and the current Model B question set working.
   - Move the solo form behind a clear `/solo` entry if the homepage becomes a landing page.

2. **Add an anonymous paired comparison flow.**
   - Partner A starts a pair session.
   - Partner A gets a private take link and an invite link for Partner B.
   - Partner B joins through the invite link.
   - Both answer the same Model C question set independently.
   - A waiting page is shown until both have submitted.
   - The comparison report is revealed only after both completed submissions exist.

3. **Implement Model C lens constructs.**
   - Replace the old “visual vs words” interpretation in the pair flow with discrete lens constructs:
     - object/category
     - scene/context
     - detail/features
     - spatial/layout
     - gist/atmosphere
     - narrative/sequence
     - semantic anchor
     - communication output

4. **Produce a safe comparison report.**
   - Report side-by-side differences from this round of responses.
   - Provide at least one concrete translation move for each partner.
   - Avoid compatibility, diagnosis, ranking, blame, or trait labeling.

5. **Extend analytics and exports for paired sessions.**
   - Track pair creation, invite opens, joins, starts, completions, waiting states, results views, and deletions.
   - Export pair-safe review datasets with hashed IDs and no invite tokens.

6. **Keep the MVP privacy posture simple.**
   - No login.
   - No names required.
   - No emails.
   - No relationship status.
   - No open-ended relationship-conflict text.
   - Option-only answers for the MVP.

### Non-goals for this MVP

- No compatibility score or match percentage.
- No “couple archetype.”
- No clinical, diagnostic, therapeutic, attachment-style, or pathology claims.
- No accounts, authentication, email invitations, SMS, or notifications.
- No public admin UI.
- No social-sharing CTA as a primary flow.
- No long self-report battery.
- No timed image-recall implementation yet.
- No free-text answer collection in the first shippable MVP. Free text can be revisited later with a separate privacy/safety review.
- No attempt to validate population-level claims from early pair data.

---

## 2. User flows and routes

### Route map

Keep the solo result route unchanged and add pair-specific routes:

| Route | Purpose |
| --- | --- |
| `/` | Landing page with two primary choices: “Take solo snapshot” and “Start couples comparison.” |
| `/solo` | Existing solo quiz flow using Model B `questions` and `QuizForm`. |
| `/results/[id]` | Existing solo result page. No paired result content here. |
| `/pair/start` | Start page with safety/privacy copy and a button/form that calls `createPairSession()`. |
| `/pair/[pairId]/take/[participantId]` | Paired Model C quiz form for one participant. Shows invite card for Partner A while still incomplete. |
| `/pair/[pairId]/join` | Invite landing page for Partner B. Requires `?invite=<inviteToken>`. Calls `joinPairSession()`. |
| `/pair/[pairId]/waiting/[participantId]` | Waiting page after one partner submits. Shows completion state without revealing answers. |
| `/pair/[pairId]/results` | Pair comparison report. Only renders when both participants have completed and pair is not deleted/expired. |

### Flow A: solo quiz preserved

1. User visits `/`.
2. User clicks “Take solo snapshot.”
3. App navigates to `/solo`.
4. `/solo` renders the existing `QuizForm` with `questions` from `lib/questions.ts`.
5. Existing `submitQuiz()` inserts a solo `quiz_results` row and redirects to `/results/[id]`.
6. Existing result page renders unchanged, except copy may be updated to avoid overclaiming.

Acceptance requirement: existing solo submissions must still succeed after pair schema changes.

### Flow B: Partner A starts a pair session

1. User visits `/` and clicks “Start couples comparison.”
2. User lands on `/pair/start`.
3. Page explains:
   - both partners answer privately;
   - no names/emails are required;
   - this is not therapy/diagnosis/compatibility scoring;
   - comparison appears only after both submit.
4. User clicks “Create comparison.”
5. Server action `createPairSession()`:
   - creates `pair_sessions` row;
   - creates `pair_participants` row for `partner_a`;
   - records `pair_created` event;
   - redirects to `/pair/[pairId]/take/[participantAId]`.
6. Partner A’s take page displays:
   - Model C quiz form;
   - invite URL card: `/pair/[pairId]/join?invite=<inviteToken>`;
   - reminder not to answer together or show responses before both submit.

### Flow C: Partner B joins

1. Partner B opens invite URL: `/pair/[pairId]/join?invite=<inviteToken>`.
2. Join page validates:
   - pair exists;
   - invite token matches;
   - pair status is `open` or `one_complete`;
   - pair is not expired/deleted;
   - there is no existing `partner_b` participant.
3. Partner B clicks “Join privately.”
4. Server action `joinPairSession({ pairId, inviteToken })`:
   - creates `pair_participants` row for `partner_b`;
   - records `invite_opened` and `pair_joined` events as appropriate;
   - redirects to `/pair/[pairId]/take/[participantBId]`.
5. If Partner B already exists, show a safe error page:
   - “This comparison already has two participants. Ask your partner for your private quiz link if this is yours.”

### Flow D: independent paired submission

1. Each participant answers Model C questions in `CouplesQuizForm`.
2. The form client records:
   - selected option IDs;
   - anonymous client session ID;
   - optional response times, as in solo flow;
   - pair metadata in analytics events.
3. Server action `submitPairedQuiz()` validates:
   - participant belongs to pair;
   - pair is active;
   - participant has not already completed;
   - answers include every Model C question;
   - all answer IDs are valid for their question IDs.
4. Action computes participant profile and inserts one `quiz_results` row with:
   - `flow_type = 'pair'`;
   - `model = 'C'`;
   - `pair_id`, `participant_id`, `participant_role`;
   - Model C scores/profile in JSON fields.
5. Action updates `pair_participants.result_id` and `completed_at`.
6. Action updates `pair_sessions.status`:
   - `open` if no one complete;
   - `one_complete` if exactly one participant complete;
   - `complete` if both participants complete.
7. Redirect:
   - if both complete: `/pair/[pairId]/results`;
   - otherwise: `/pair/[pairId]/waiting/[participantId]`.

### Flow E: waiting page

The waiting page must not reveal either participant’s answers.

Show only:

- “You’re done.”
- “Waiting for the other response.” or “Both responses are in.”
- participant completion states by role label only:
  - Partner A: complete / waiting
  - Partner B: complete / waiting
- invite link if the current participant is Partner A and Partner B has not joined.
- refresh button or auto-refresh every 10–20 seconds using normal page refresh is acceptable.
- delete comparison button.

If the other partner completes, the page links to `/pair/[pairId]/results`.

### Flow F: pair results

1. `/pair/[pairId]/results` fetches pair session, both participants, both `quiz_results` rows.
2. If pair is incomplete, redirect current participant to waiting when possible; otherwise show “not ready yet.”
3. If pair is deleted/expired, show safe not-found/expired page.
4. Build deterministic comparison report server-side from stored Model C profiles.
5. Render:
   - safety frame;
   - side-by-side selected answers;
   - shared ground;
   - top 1–3 visible differences;
   - assumed-similarity check;
   - translation moves for both partners;
   - “what this is not” note;
   - delete comparison button.

---

## 3. Data model / schema migrations

Implement migrations in `scripts/db-push.mjs`. Migrations must be idempotent, matching the existing script style.

### New table: `pair_sessions`

Create before adding pair references to `quiz_results`.

```sql
create table if not exists pair_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  deleted_at timestamptz,
  status text not null default 'open',
  invite_token text,
  research_opt_in boolean not null default false,
  experiment_label text,
  metadata jsonb not null default '{}'::jsonb,
  constraint pair_sessions_status_check check (status in ('open', 'one_complete', 'complete', 'expired', 'deleted'))
);
```

Indexes:

```sql
create index if not exists pair_sessions_created_at_idx on pair_sessions(created_at desc);
create index if not exists pair_sessions_status_idx on pair_sessions(status);
create index if not exists pair_sessions_expires_at_idx on pair_sessions(expires_at);
create unique index if not exists pair_sessions_invite_token_idx on pair_sessions(invite_token) where invite_token is not null;
```

Generation rule:

- `invite_token` must be generated server-side with at least 128 bits of entropy.
- Use Node `crypto.randomBytes(18).toString('base64url')` or equivalent.
- Do not use short six-character codes for the first MVP unless rate limiting is also added.

### New table: `pair_participants`

```sql
create table if not exists pair_participants (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references pair_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role text not null,
  display_label text,
  client_session_id text,
  result_id uuid references quiz_results(id) on delete set null,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint pair_participants_role_check check (role in ('partner_a', 'partner_b'))
);
```

Indexes:

```sql
create index if not exists pair_participants_pair_id_idx on pair_participants(pair_id);
create index if not exists pair_participants_result_id_idx on pair_participants(result_id);
create unique index if not exists pair_participants_pair_role_unique_idx on pair_participants(pair_id, role);
```

Display labels for MVP:

- Default to `Partner A` and `Partner B`.
- Do not collect real names in the MVP.
- Do not add nickname input in the MVP. If later added, cap at 32 chars and explain it is optional.

### Extend `quiz_results`

Current `quiz_results` has legacy non-null scoring columns. Keep them for solo compatibility. Add pair metadata:

```sql
alter table quiz_results add column if not exists flow_type text not null default 'solo';
alter table quiz_results add column if not exists pair_id uuid references pair_sessions(id) on delete set null;
alter table quiz_results add column if not exists participant_id uuid;
alter table quiz_results add column if not exists participant_role text;
alter table quiz_results add column if not exists deleted_at timestamptz;
```

Indexes:

```sql
create index if not exists quiz_results_flow_type_idx on quiz_results(flow_type);
create index if not exists quiz_results_pair_id_idx on quiz_results(pair_id);
create index if not exists quiz_results_participant_id_idx on quiz_results(participant_id);
create index if not exists quiz_results_participant_role_idx on quiz_results(participant_role);
```

Model C insert rule:

- For paired submissions, insert `model = 'C'` and `flow_type = 'pair'`.
- Because legacy columns are non-null, set:
  - `visual_score = 0`
  - `words_score = 0`
  - `detail_score = 0`
  - `visual_pct = 0`
  - `words_pct = 0`
- Do **not** map Model C constructs into the legacy visual/words fields. That would create misleading output.
- Store actual Model C scores/profile in:
  - `raw_scores` JSONB;
  - `answers.profile` JSON;
  - `answers.answers` JSON.

### Extend `quiz_events`

Add direct columns for pair reporting. Continue also writing pair metadata into `metadata` so older exports remain readable.

```sql
alter table quiz_events add column if not exists flow_type text not null default 'solo';
alter table quiz_events add column if not exists pair_id uuid;
alter table quiz_events add column if not exists participant_id uuid;
alter table quiz_events add column if not exists participant_role text;
```

Indexes:

```sql
create index if not exists quiz_events_flow_type_idx on quiz_events(flow_type);
create index if not exists quiz_events_pair_id_idx on quiz_events(pair_id);
create index if not exists quiz_events_participant_id_idx on quiz_events(participant_id);
```

Extend `quizEventTypes` in `lib/quiz-events.ts` to include:

```ts
export const quizEventTypes = [
  'start',
  'abandon',
  'complete',
  'pair_created',
  'invite_opened',
  'pair_joined',
  'pair_waiting_viewed',
  'pair_results_viewed',
  'pair_deleted',
] as const;
```

Update `quizEventSchema` and `recordQuizEvent()` to accept/write:

```ts
flowType?: 'solo' | 'pair';
pairId?: string;
participantId?: string;
participantRole?: 'partner_a' | 'partner_b';
```

### Deletion behavior

MVP should include a participant-accessible “Delete this comparison” action.

`deletePairSession({ pairId, participantId })` must:

1. Verify `participantId` belongs to `pairId`.
2. Mark `pair_sessions.status = 'deleted'`, `deleted_at = now()`, `invite_token = null`.
3. Delete or tombstone associated paired rows:
   - preferred: delete `quiz_results` where `flow_type = 'pair' and pair_id = ...`;
   - delete `pair_participants` for the pair;
   - delete `quiz_events` for the pair, or keep only aggregate tombstone event with no participant/result IDs.
4. Redirect to a simple deleted confirmation page or `/`.

Do not delete solo results.

---

## 4. TypeScript types and scoring/comparison model

Add a new module instead of overloading `lib/questions.ts` too heavily:

- `lib/couples-questions.ts` — Model C question set and types.
- `lib/couples-lens.ts` — scoring, profiles, comparison rules, report generation.
- Optional: `lib/pairs.ts` — DB helpers for pair sessions/participants.

### Core lens types

```ts
export const activeCouplesModel = 'C' as const;
export const couplesScoringVersion = 'couples-lens-mvp-v1';
export const couplesBlendThresholdPct = 8;

export type LensConstruct =
  | 'objectCategory'
  | 'sceneContext'
  | 'detailFeatures'
  | 'spatialLayout'
  | 'gistAtmosphere'
  | 'narrativeSequence'
  | 'semanticAnchor'
  | 'communicationOutput';

export type LensScores = Record<LensConstruct, number>;

export type ParticipantRole = 'partner_a' | 'partner_b';
export type FlowType = 'solo' | 'pair';
```

Labels:

```ts
export const lensLabels: Record<LensConstruct, string> = {
  objectCategory: 'Object/category',
  sceneContext: 'Scene/context',
  detailFeatures: 'Detail/features',
  spatialLayout: 'Spatial/layout',
  gistAtmosphere: 'Gist/atmosphere',
  narrativeSequence: 'Narrative/sequence',
  semanticAnchor: 'Semantic anchor',
  communicationOutput: 'Communication output',
};
```

### Model C question/option types

```ts
export type CouplesQuestionKind = 'image' | 'scenario' | 'memory' | 'repair' | 'imagery';

export type CouplesAnswerTag =
  | { type: 'lens'; lens: LensConstruct }
  | { type: 'partnerPrediction'; lens: LensConstruct }
  | { type: 'imageryBand'; band: 'vivid' | 'moderate' | 'faint' | 'absent' }
  | { type: 'repairMove'; move: 'nameMainThing' | 'addContext' | 'giveSequence' | 'nameEmotion' | 'showLayout' };

export type CouplesQuestionOption = {
  id: string;
  label: string;
  scores: LensScores;
  tags?: CouplesAnswerTag[];
};

export type CouplesQuestion = {
  id: string;
  model: typeof activeCouplesModel;
  version: string;
  construct: LensConstruct | 'mixed' | 'partnerPrediction' | 'imageryBand';
  kind: CouplesQuestionKind;
  prompt: string;
  helper?: string;
  imageUrl?: string;
  options: CouplesQuestionOption[];
  reportAnchor?: string;
};
```

Helper functions:

```ts
export function emptyLensScores(): LensScores;
export function addLensScores(a: LensScores, b: LensScores): LensScores;
export function maxLensScoresForQuestions(items?: CouplesQuestion[]): LensScores;
export function normalizeLensScores(raw: LensScores, max?: LensScores): LensProfileDimension[];
export function profileFromLensScores(raw: LensScores, answers: EnrichedCouplesAnswer[]): ParticipantLensProfile;
export function comparePairProfiles(input: PairComparisonInput): PairComparisonReport;
```

### Model C paired question set

Use option-only items for the MVP. Store selected labels and tags so the report can anchor claims to concrete answers without storing free text.

All questions are answered independently by both participants.

#### C1 — same image: first grab

- id: `c1_image_first_grab`
- kind: `image`
- image: reuse `/horse.png` for MVP unless a better licensed image is added.
- prompt: “When you first see this image, what does your brain grab first?”
- options:
  - `main-object`: “The main object/person/thing” → objectCategory +3, semanticAnchor +1; tag lens objectCategory
  - `surrounding-scene`: “The surrounding scene or context” → sceneContext +3, gistAtmosphere +1; tag lens sceneContext
  - `specific-details`: “Specific details like color, shape, texture, or movement” → detailFeatures +3; tag lens detailFeatures
  - `layout`: “Where things are in relation to each other” → spatialLayout +3; tag lens spatialLayout
  - `mood`: “The mood or atmosphere of the whole image” → gistAtmosphere +3; tag lens gistAtmosphere

#### C2 — same image: description start

- id: `c2_image_describe_first`
- kind: `image`
- prompt: “If you had to describe this image to your partner, what would you say first?”
- options:
  - `name-central-thing`: “Name the central thing first” → semanticAnchor +2, objectCategory +2, communicationOutput +1
  - `set-scene`: “Set the scene around it first” → sceneContext +3, communicationOutput +1
  - `mention-detail`: “Mention a specific visual detail first” → detailFeatures +3, communicationOutput +1
  - `describe-layout`: “Describe the layout or relationship between parts” → spatialLayout +3, communicationOutput +1
  - `tell-mini-story`: “Tell a small story about what might be happening” → narrativeSequence +3, gistAtmosphere +1, communicationOutput +1

#### C3 — assumed similarity: partner prediction

- id: `c3_predict_partner_first_grab`
- kind: `scenario`
- construct: `partnerPrediction`
- prompt: “What do you think your partner would notice first in the same image?”
- helper: “This is not a test of being right. It helps show what each of you assumes is shared.”
- options mirror C1 and use `partnerPrediction` tags, but do not add to participant lens scores.

#### C4 — shared-memory default

- id: `c4_shared_memory_first`
- kind: `memory`
- prompt: “When you remember a shared moment, what appears first?”
- options:
  - `scene-snapshot`: “A scene or snapshot” → sceneContext +2, gistAtmosphere +1
  - `sequence`: “The sequence of what happened” → narrativeSequence +3
  - `words-said`: “Words people said or the exact phrasing” → semanticAnchor +2, narrativeSequence +1
  - `feeling`: “The feeling or atmosphere” → gistAtmosphere +3
  - `key-point`: “The key point, label, or takeaway” → semanticAnchor +3

#### C5 — what feels obvious

- id: `c5_assumed_obvious`
- kind: `scenario`
- prompt: “In conversation, what do you most often assume is already obvious?”
- options:
  - `topic`: “The central topic or object” → objectCategory +2, semanticAnchor +1
  - `context`: “The surrounding context” → sceneContext +3
  - `why-matters`: “Why it matters or what it means” → gistAtmosphere +2, semanticAnchor +1
  - `order`: “The order things happened” → narrativeSequence +3
  - `layout`: “Where things are or how pieces connect” → spatialLayout +3

#### C6 — common-ground explanation

- id: `c6_explain_location_to_new_person`
- kind: `scenario`
- prompt: “You need to explain where something is to someone who has never been in the space. What do you lead with?”
- options:
  - `label-place`: “Name the place or container first” → semanticAnchor +3, objectCategory +1
  - `surrounding-context`: “Describe what is around it” → sceneContext +3
  - `step-by-step`: “Give step-by-step directions” → narrativeSequence +2, spatialLayout +1
  - `layout-map`: “Describe the layout like a map” → spatialLayout +3
  - `example`: “Give a concrete example they can picture” → objectCategory +1, sceneContext +1, communicationOutput +2

#### C7 — when partner is not following

- id: `c7_translation_help`
- kind: `repair`
- prompt: “When your partner is not following you, what helps you translate fastest?”
- options:
  - `clearer-label`: “A clearer name, label, or main point” → semanticAnchor +3, communicationOutput +1
  - `more-context`: “More surrounding context” → sceneContext +3, communicationOutput +1
  - `sequence`: “A step-by-step sequence” → narrativeSequence +3, communicationOutput +1
  - `concrete-example`: “A concrete example” → objectCategory +1, sceneContext +1, communicationOutput +2
  - `diagram-layout`: “A diagram, layout, or relationship map” → spatialLayout +3, communicationOutput +1

#### C8 — output format

- id: `c8_output_format`
- kind: `scenario`
- prompt: “When explaining a plan or situation, what do you usually produce first?”
- options:
  - `one-line-summary`: “A one-line summary or label” → semanticAnchor +3, communicationOutput +1
  - `bullet-list`: “A bullet list of key points” → semanticAnchor +2, narrativeSequence +1, communicationOutput +1
  - `walkthrough`: “A story or walkthrough” → narrativeSequence +3, communicationOutput +1
  - `diagram`: “A diagram or layout” → spatialLayout +3, communicationOutput +1
  - `scene-setting`: “The surrounding context before the point” → sceneContext +3, communicationOutput +1

#### C9 — imagery vividness band, coarse only

- id: `c9_imagery_band`
- kind: `imagery`
- construct: `imageryBand`
- prompt: “Picture a familiar room. How clear is the inner image?”
- helper: “This is a coarse experience band, not a score or diagnosis.”
- options:
  - `vivid`: “Vivid — close to seeing it” → detailFeatures +1, spatialLayout +1; tag imageryBand vivid
  - `moderate`: “Moderate — a usable picture with some gaps” → spatialLayout +1; tag imageryBand moderate
  - `faint`: “Faint — mostly partial or vague” → semanticAnchor +1; tag imageryBand faint
  - `absent`: “Absent — more like facts/knowledge than a picture” → semanticAnchor +1; tag imageryBand absent

Report rule: do not call this aphantasia/hyperphantasia. Use only “one of you reported a more vivid/fainter inner picture in this round.”

#### C10 — crossed-wire repair move

- id: `c10_crossed_wire_repair`
- kind: `repair`
- prompt: “In a crossed-wire conversation, what would help fastest?”
- options:
  - `name-main-thing`: “Name the main thing first.” → semanticAnchor +2, objectCategory +1; repairMove nameMainThing
  - `give-context`: “Give me the context.” → sceneContext +3; repairMove addContext
  - `tell-sequence`: “Tell me the sequence.” → narrativeSequence +3; repairMove giveSequence
  - `say-emotional-meaning`: “Say what this means emotionally.” → gistAtmosphere +3; repairMove nameEmotion
  - `show-layout`: “Show me the layout or relationship.” → spatialLayout +3; repairMove showLayout

### Participant profile model

```ts
export type LensProfileDimension = {
  key: LensConstruct;
  label: string;
  rawValue: number;
  maxValue: number;
  normalizedPct: number;
  sharePct: number;
};

export type EnrichedCouplesAnswer = {
  questionId: string;
  itemVersion: string;
  model: 'C';
  construct: CouplesQuestion['construct'];
  prompt: string;
  displayOrder: number;
  answerId: string;
  answerLabel: string;
  scores: LensScores;
  tags: CouplesAnswerTag[];
  responseTimeMs: number | null;
};

export type ParticipantLensProfile = {
  scoringVersion: typeof couplesScoringVersion;
  dimensions: LensProfileDimension[];
  top: LensProfileDimension;
  second: LensProfileDimension;
  topLenses: LensProfileDimension[];
  isBlended: boolean;
  gapPct: number;
  confidence: 'blended' | 'moderate' | 'clear';
  imageryBand?: 'vivid' | 'moderate' | 'faint' | 'absent';
  selectedLensByQuestion: Record<string, LensConstruct | null>;
  partnerPredictionByQuestion: Record<string, LensConstruct | null>;
  repairMove?: 'nameMainThing' | 'addContext' | 'giveSequence' | 'nameEmotion' | 'showLayout';
};
```

Scoring rules:

- Normalize each construct by max available points for Model C questions.
- Sort dimensions by `normalizedPct`, then raw value, then stable label.
- Treat top-two gap `<= 8` points as blended.
- Do not display normalized percentages in the pair report. They are internal ranking aids only.
- A participant can have multiple “top lenses” if dimensions are within 8 points of the top.

### Pair comparison model

```ts
export type PairComparisonInput = {
  pairId: string;
  participants: [
    { role: 'partner_a'; profile: ParticipantLensProfile; answers: EnrichedCouplesAnswer[] },
    { role: 'partner_b'; profile: ParticipantLensProfile; answers: EnrichedCouplesAnswer[] },
  ];
};

export type PairDifferencePattern =
  | 'object_vs_scene'
  | 'label_vs_context'
  | 'sequence_vs_gist'
  | 'layout_vs_story'
  | 'detail_vs_atmosphere'
  | 'different_repair_moves'
  | 'blended_or_low_contrast';

export type TranslationMove = {
  pattern: PairDifferencePattern;
  forPartnerA: string;
  forPartnerB: string;
  sharedPractice: string;
};

export type PairComparisonReport = {
  frame: string;
  isLowContrast: boolean;
  sharedGround: string[];
  differences: Array<{
    pattern: PairDifferencePattern;
    title: string;
    body: string;
    evidence: Array<{
      questionId: string;
      partnerAAnswer: string;
      partnerBAnswer: string;
    }>;
  }>;
  assumedSimilarity: {
    body: string;
    partnerAPredicted?: string;
    partnerBActual?: string;
    partnerBPredicted?: string;
    partnerAActual?: string;
  };
  translationMoves: TranslationMove[];
  whatThisIsNot: string;
};
```

### Comparison rules

1. **Shared ground**
   - If both participants share any top lens within their `topLenses`, add a shared-ground observation.
   - If both choose the same option for a question, add at most two anchored observations.
   - If no obvious overlap exists, say: “The overlap was less visible in this short round; that does not mean you lack shared ground.”

2. **Differences**
   - Compute per-construct delta from normalized profiles.
   - Use internal ranking to choose top 1–3 differences.
   - Prefer named pair patterns over generic deltas:
     - objectCategory high vs sceneContext high → `object_vs_scene`
     - semanticAnchor high vs sceneContext high → `label_vs_context`
     - narrativeSequence high vs gistAtmosphere high → `sequence_vs_gist`
     - spatialLayout high vs narrativeSequence high → `layout_vs_story`
     - detailFeatures high vs gistAtmosphere high → `detail_vs_atmosphere`
     - C10 repair moves differ → `different_repair_moves`
   - If no delta is notable, use `blended_or_low_contrast` and do not invent a conflict.

3. **Evidence anchoring**
   - Every difference must cite at least one question where both partners’ selected labels are shown side-by-side.
   - Never state a free-floating trait like “Partner A is object-first.”
   - Use “in this round” and “your selected answers suggest.”

4. **Assumed-similarity check**
   - Compare Partner A’s C3 prediction to Partner B’s C1 tag.
   - Compare Partner B’s C3 prediction to Partner A’s C1 tag.
   - Report as:
     - “You both predicted each other closely on the image task.”
     - “One/both of you expected your partner to start where you started.”
     - “This was mixed in this round.”
   - Do not call predictions wrong, inaccurate, or failed.

5. **Low-confidence / thin-data rule**
   - If both profiles are blended or all construct deltas are small, report a blended/low-contrast result.
   - Copy: “This short round did not create a strong contrast. That is still useful: your translation move is to ask which handle matters in the moment instead of assuming a fixed pattern.”

### Translation move library

Use deterministic copy. Each move gives both partners something useful.

```ts
const translationMovesByPattern = {
  object_vs_scene: {
    forObjectLeaning: 'After naming the main thing, add one sentence of surrounding context.',
    forSceneLeaning: 'Name the central object or decision earlier, then add the scene around it.',
    sharedPractice: 'Try: “Main thing first, then one sentence of context.”',
  },
  label_vs_context: {
    forLabelLeaning: 'Pair the short label with why it matters in this situation.',
    forContextLeaning: 'Give the short label before expanding the background.',
    sharedPractice: 'Try: “What handle are we using for this?”',
  },
  sequence_vs_gist: {
    forSequenceLeaning: 'Start with the bottom-line meaning before walking through the order.',
    forGistLeaning: 'Add the key steps that led to the meaning so the path is visible.',
    sharedPractice: 'Try: “Meaning first or sequence first?”',
  },
  layout_vs_story: {
    forLayoutLeaning: 'Add a brief walkthrough so the map does not stay only in your head.',
    forStoryLeaning: 'Mark the pieces and relationships explicitly as the story unfolds.',
    sharedPractice: 'Try sketching the relationship, then narrating the sequence.',
  },
  detail_vs_atmosphere: {
    forDetailLeaning: 'Say which detail changes the point, not every detail you noticed.',
    forAtmosphereLeaning: 'Name one concrete detail that supports the overall feeling.',
    sharedPractice: 'Try: “What detail carries the vibe?”',
  },
  different_repair_moves: {
    forPartnerA: 'Ask for the repair format you need instead of assuming it is obvious.',
    forPartnerB: 'Offer your preferred repair format, then ask what format would help them.',
    sharedPractice: 'Try: “Do you need the label, context, sequence, emotion, or layout?”',
  },
};
```

When assigning partner-specific copy, map “forObjectLeaning”/etc. to the participant whose top/difference lens matches. If ambiguous, use neutral `forPartnerA` and `forPartnerB` copy.

---

## 5. Components/pages/server actions to change/add

### Files to add

Recommended new files:

```txt
app/solo/page.tsx
app/pair/start/page.tsx
app/pair/[pairId]/join/page.tsx
app/pair/[pairId]/take/[participantId]/page.tsx
app/pair/[pairId]/waiting/[participantId]/page.tsx
app/pair/[pairId]/results/page.tsx
components/CouplesQuizForm.tsx
components/PairInviteCard.tsx
components/PairProgress.tsx
components/PairResultsReport.tsx
components/DeletePairButton.tsx
components/SafetyNotice.tsx
lib/couples-questions.ts
lib/couples-lens.ts
lib/pairs.ts
```

### Files to modify

```txt
app/page.tsx
app/actions.ts
components/QuizForm.tsx (only if extracting shared form utilities; otherwise leave unchanged)
lib/quiz-events.ts
scripts/db-push.mjs
scripts/export-agent-review-dataset.mjs
scripts/report.mjs
package.json (only if adding script names; avoid new dependencies unless needed)
```

### `app/page.tsx`

Change from rendering the solo quiz directly to a landing page.

Required content:

- Product frame: “Couples Communication Lens” / “communication lens snapshot.”
- CTA 1: “Start couples comparison” → `/pair/start`.
- CTA 2: “Take solo snapshot” → `/solo`.
- Safety note:
  - “This is a reflection tool, not therapy, diagnosis, or compatibility scoring.”
  - “No names or emails required.”

### `app/solo/page.tsx`

Move the current homepage body here with minimal copy changes.

Implementation:

```tsx
import QuizForm from '@/components/QuizForm';
import { questions } from '@/lib/questions';

export default function SoloPage() {
  return (...existing solo page shell... <QuizForm questions={questions} /> ...);
}
```

### `app/actions.ts`

Keep existing `submitQuiz()` unchanged except any shared imports. Add paired actions below it or split pair actions into a separate server module if preferred.

Required server actions:

#### `createPairSession(input?: { experimentLabel?: string; clientSessionId?: string })`

Responsibilities:

- Generate invite token.
- Insert `pair_sessions` row.
- Insert `pair_participants` row for `partner_a`.
- Record `pair_created` event.
- Redirect to `/pair/[pairId]/take/[participantAId]`.

Validation:

- `experimentLabel` max 160 optional.
- `clientSessionId` max 128 optional.

#### `joinPairSession(input: { pairId: string; inviteToken: string; clientSessionId?: string })`

Responsibilities:

- Validate UUID/token.
- Fetch session.
- Reject expired/deleted/complete sessions.
- Reject if token mismatch.
- Reject if `partner_b` already exists.
- Insert `partner_b`.
- Record `pair_joined` event.
- Redirect to `/pair/[pairId]/take/[participantBId]`.

#### `submitPairedQuiz(input)`

Suggested schema:

```ts
const pairedSubmitSchema = z.object({
  pairId: z.string().uuid(),
  participantId: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
  responseTimes: z.record(z.string(), z.number().nonnegative()).optional(),
  experimentLabel: z.string().max(160).optional(),
  clientSessionId: z.string().min(1).max(128).optional(),
  privacyAcknowledged: z.boolean().optional().default(true),
});
```

Responsibilities:

- Fetch pair and participant together.
- Verify participant belongs to pair.
- Verify participant incomplete.
- Verify pair status active and not expired/deleted.
- Validate every Model C question has a valid selected option.
- Score with `profileFromLensScores()`.
- Insert `quiz_results` with pair metadata.
- Update participant completion.
- Update pair status.
- Record `complete` event with `flowType: 'pair'` and pair metadata.
- Redirect to waiting or results.

Concurrency guard:

- If the participant already has `completed_at`, do not insert a second result.
- Redirect to waiting/results based on pair status.

#### `deletePairSession(input: { pairId: string; participantId: string })`

Responsibilities as specified in deletion behavior.

### `lib/pairs.ts`

Recommended DB helper functions:

```ts
export async function getPairSession(pairId: string): Promise<PairSession | null>;
export async function getPairWithParticipants(pairId: string): Promise<PairWithParticipants | null>;
export async function getParticipant(pairId: string, participantId: string): Promise<PairParticipant | null>;
export async function getCompletedPairResults(pairId: string): Promise<CompletedPairResults | null>;
export function isPairExpired(session: PairSession): boolean;
export function inviteUrlForPair(pairId: string, inviteToken: string): string;
```

Keep token validation server-only. Do not expose `invite_token` on results pages after Partner B has joined, except to Partner A before Partner B exists.

### `components/CouplesQuizForm.tsx`

Can fork `QuizForm` for speed. Required differences:

- Takes props:

```ts
type CouplesQuizFormProps = {
  pairId: string;
  participantId: string;
  participantRole: 'partner_a' | 'partner_b';
  questions: CouplesQuestion[];
  inviteUrl?: string;
};
```

- Calls `submitPairedQuiz()` instead of `submitQuiz()`.
- Sends pair metadata in analytics events.
- Copy says “Submit my private answers” instead of “See my response profile.”
- Data-use note must be pair-specific:
  - selected answers, response times, anonymous pair/participant IDs, and generated comparison are stored;
  - no names/emails are required;
  - do not submit if uncomfortable.
- Start/abandon events include:
  - `flowType: 'pair'`
  - `pairId`
  - `participantId`
  - `participantRole`

### `PairInviteCard`

Show on Partner A take/waiting pages until Partner B has joined.

Content:

- Invite URL in readonly input.
- Copy button.
- Reminder: “Send this to your partner. Try not to compare answers until both are done.”

### `PairProgress`

Input: pair participants and statuses. Display:

- Partner A: not started / in progress unknown / complete
- Partner B: not joined / joined / complete

Do not show answers.

### `PairResultsReport`

Input: `PairComparisonReport`, participants, and enriched answers.

Sections:

1. Safety frame.
2. Side-by-side answers.
3. Shared ground.
4. Where wires crossed in this round.
5. Assumed-similarity check.
6. Translation moves.
7. What this is not.
8. Delete comparison.

Do not show bars, percentages, compatibility numbers, or rankings.

---

## 6. Report output rules and example report

### Output rules

1. **Round language only**
   - Use: “in this round,” “your selected answers suggest,” “leaned toward.”
   - Avoid: “you are,” “your type is,” “always,” “never.”

2. **Symmetry rule**
   - Every interpretive paragraph must mention both partners or the pair as a unit.
   - Never describe one partner as the problem.

3. **No score rule**
   - Do not display percentages, point totals, match scores, compatibility scores, or ranked “better/worse” language in pair results.
   - Internal deltas are allowed only for report selection logic.

4. **Evidence anchor rule**
   - Each observation must cite selected answers from the same question.
   - Example: “On the image task, Partner A selected ‘Name the central thing first,’ while Partner B selected ‘Set the scene around it first.’”

5. **Translation rule**
   - Every report must include at least one concrete move each partner can try.
   - Translation moves should be reciprocal, not a fix assigned to one partner.

6. **Low-contrast rule**
   - If the data is blended or thin, say so.
   - Do not manufacture contrast just to make the report feel interesting.

7. **Banned terms**
   - compatibility, incompatible, match score, diagnosis, disorder, deficit, normal/abnormal, better, worse, more accurate, less accurate, “the visual one,” “the verbal one.”

8. **Required disclaimer locations**
   - `/pair/start`
   - `CouplesQuizForm` data-use section
   - `/pair/[pairId]/results`

Required disclaimer copy can be concise:

> This is a reflection tool, not therapy, diagnosis, or compatibility scoring. It describes this round of selected answers, not who either of you is.

### Example report

Scenario:

- C1 Partner A: “The main object/person/thing.”
- C1 Partner B: “The surrounding scene or context.”
- C2 Partner A: “Name the central thing first.”
- C2 Partner B: “Set the scene around it first.”
- C3 Partner A predicted Partner B: “The main object/person/thing.”
- C3 Partner B predicted Partner A: “The surrounding scene or context.”
- C10 Partner A: “Give me the context.”
- C10 Partner B: “Name the main thing first.”

Example output:

```md
## How to read this

This is one round of selected answers, not a verdict about either of you. No score here means compatible or incompatible.

## The short version

In this round, one of you tended to grab the central handle first, while the other tended to preserve the surrounding scene first. Both are legitimate ways into the same picture.

## Side-by-side moment

On the image task, Partner A selected “The main object/person/thing.” Partner B selected “The surrounding scene or context.”

On the description task, Partner A selected “Name the central thing first.” Partner B selected “Set the scene around it first.”

## What we noticed about the gap

The visible crossed wire in this round was label/context order. One answer pattern started by naming the main thing. The other started by building the frame around it. That can create a small translation miss: the concise version can feel incomplete, while the contextual version can feel like it is taking too long to reach the point.

Neither move is more accurate. They are different doors into the same scene.

## Assumed-similarity check

On the prediction item, each of you expected your partner to start closer to your own starting point than they actually did in this round. That is common in close relationships: we often assume the other person has the same obvious handle in mind.

## Translation move

If this comes up in a real conversation:

- The object/label-first partner can name the main thing, then add one sentence of surrounding context.
- The scene/context-first partner can name the central object or decision earlier, then add the context around it.

Try this shared script: “Main thing first, then one sentence of context.”

## What this is not

This is not therapy, diagnosis, or compatibility scoring. It is a short mirror for how these answers landed today. A different prompt or day may show a different pattern.
```

Low-contrast example:

```md
This short round did not create a strong contrast between your selected answers. That does not mean there is no difference between you; it means this item set did not surface a clear one today.

Your useful move is not to force a label. Try asking: “What handle are you using for this — the main thing, the context, the sequence, the feeling, or the layout?”
```

---

## 7. Analytics/export requirements

### Event requirements

Record events with pair metadata:

| Event | When |
| --- | --- |
| `pair_created` | Pair session and Partner A participant created. |
| `invite_opened` | Join page loaded with valid-looking pair/token. Best effort; do not block UI. |
| `pair_joined` | Partner B participant created. |
| `start` | Participant first interacts with Model C form. |
| `abandon` | Participant leaves after starting but before completion. |
| `complete` | Participant paired submission saved. |
| `pair_waiting_viewed` | Waiting page viewed. |
| `pair_results_viewed` | Results page viewed after both complete. |
| `pair_deleted` | Participant deletes comparison. |

Each pair event should include:

```ts
metadata: {
  flowType: 'pair',
  pairStatus?: 'open' | 'one_complete' | 'complete' | 'expired' | 'deleted',
  participantRole?: 'partner_a' | 'partner_b',
  completedCount?: number,
  totalParticipants?: number,
}
```

Also write direct columns where available:

- `flow_type`
- `pair_id`
- `participant_id`
- `participant_role`

### Funnel metrics for `scripts/report.mjs`

Extend report output with:

- solo results count;
- pair participant result count;
- pair sessions created;
- pair sessions with Partner B joined;
- pair sessions with one completion;
- pair sessions complete;
- pair sessions expired/deleted;
- invite conversion rate: `pair_joined / pair_created`;
- pair completion rate: complete pairs / pair sessions with Partner B joined;
- participant abandonment count/rate by role.

Do not print invite tokens.

### Export script requirements

Update `scripts/export-agent-review-dataset.mjs`.

Required privacy behavior:

- Hash `pair_id`, `participant_id`, `result_id`, `session_id`, `event_id` per export.
- Omit `invite_token` entirely.
- Omit user-agent as current export already does.
- Do not export IPs (none are currently collected).
- Keep `hashSaltStored: false`.

Add files:

```txt
raw/quiz_results.jsonl         # extended with flowType/pair IDs hashed
raw/quiz_events.jsonl          # extended with flowType/pair IDs hashed
raw/pair_sessions.jsonl        # pair status/timestamps only, hashed IDs, no token
raw/pair_participants.jsonl    # hashed IDs, role, timestamps, hashed result ID
raw/pair_comparisons.jsonl     # derived safe reports/patterns, no invite token
raw/*.json                     # JSON arrays mirroring JSONL if current style continues
derived/pair_sessions.json
derived/pair_funnel.json
derived/pair_answer_matrix.json
derived/pair_pattern_counts.json
derived/pair_question_answer_counts.json
```

Extend manifest counts:

```ts
counts: {
  results,
  soloResults,
  pairParticipantResults,
  events,
  sessions,
  pairSessions,
  pairsWithPartnerBJoined,
  completePairs,
  oneCompletePairs,
  deletedPairs,
  expiredPairs,
}
```

Derived pair comparison rows should include:

```ts
{
  pairId: 'pair_<hash>',
  status: 'complete',
  createdAt,
  completedAt,
  participantA: {
    participantId: 'participant_<hash>',
    resultId: 'result_<hash>',
    topLenses: ['objectCategory', 'semanticAnchor'],
    isBlended: false,
    imageryBand: 'moderate',
    selected: { c1_image_first_grab: 'main-object', ... }
  },
  participantB: {...},
  comparison: {
    isLowContrast: false,
    patterns: ['object_vs_scene'],
    sharedGroundCount: 1,
    translationMoveCount: 1,
    assumedSimilarity: 'both_diverged' | 'both_matched' | 'mixed' | 'not_available'
  }
}
```

Do not export raw report prose unless needed; pattern IDs are easier to analyze and less likely to leak sensitive phrasing.

---

## 8. Privacy/safety requirements

### Data minimization

MVP collects only:

- selected option IDs/labels;
- anonymous pair/session/participant IDs;
- response times;
- generated scores/profile/report patterns;
- non-sensitive analytics events.

MVP must not collect:

- names;
- emails;
- phone numbers;
- relationship status;
- location;
- open-ended conflict stories;
- therapy/mental-health history;
- free-text answers.

### Pair link safety

- Invite link uses an unguessable token.
- Expire invite after 7 days by checking `expires_at` in server actions/pages.
- Results page is accessible by unguessable pair ID only after completion. This is acceptable for MVP, but all copy should remind users not to share the link unless they want the other person to see the result.
- Do not expose invite token in exports or result pages.

### Independent response guardrail

Show this reminder on `/pair/start`, join page, and paired form:

> For the cleanest mirror, answer privately before comparing. Don’t coach each other while answering.

Do not enforce with surveillance or device checks.

### Report safety

- No compatibility score.
- No “who is better” framing.
- No clinical language.
- No trait labels.
- No advice to change personality.
- No “you always/never” language.
- Use “this round” throughout.

### Deletion

Either participant can delete the comparison from waiting/results.

UI copy:

> Delete this comparison for both of you. This removes the paired answers and report from this app.

Require a confirm checkbox or second click.

### Error handling safety

Use neutral error messages:

- “This invite is expired or invalid.”
- “This comparison already has two participants.”
- “This comparison is not ready yet.”
- “This comparison is no longer available.”

Do not reveal whether a specific participant completed when requester is not on a participant-specific URL.

---

## 9. Implementation task breakdown suitable for coder agents

### Task 1 — Schema and DB helpers

Files:

- `scripts/db-push.mjs`
- `lib/pairs.ts`

Work:

1. Add `pair_sessions` and `pair_participants` tables.
2. Add pair columns/indexes to `quiz_results` and `quiz_events`.
3. Add idempotent indexes/checks as above.
4. Implement pair helper read functions.
5. Run `npm run db:push` against the intended database.

Verification:

- `npm run db:push` succeeds twice.
- Existing `quiz_results` rows remain readable.

### Task 2 — Model C questions and comparison engine

Files:

- `lib/couples-questions.ts`
- `lib/couples-lens.ts`

Work:

1. Define Model C types and question set.
2. Implement lens scoring and normalization.
3. Implement participant profile generation.
4. Implement pair comparison and translation move rules.
5. Add small fixture-style checks if no test framework exists.

Verification:

- Given two fixture answer maps, output deterministic top lenses and pattern IDs.
- Low-contrast fixture returns `blended_or_low_contrast`.
- No report text contains banned terms.

### Task 3 — Server actions and analytics schema

Files:

- `app/actions.ts`
- `lib/quiz-events.ts`

Work:

1. Extend quiz event schema and DB insert.
2. Add `createPairSession()`.
3. Add `joinPairSession()`.
4. Add `submitPairedQuiz()`.
5. Add `deletePairSession()`.
6. Ensure existing `submitQuiz()` still works.

Verification:

- Creating a pair inserts one session and Partner A.
- Joining inserts Partner B only once.
- A participant cannot submit twice.
- Completion updates pair status correctly.

### Task 4 — Pair routes and forms

Files:

- `app/page.tsx`
- `app/solo/page.tsx`
- `app/pair/start/page.tsx`
- `app/pair/[pairId]/join/page.tsx`
- `app/pair/[pairId]/take/[participantId]/page.tsx`
- `app/pair/[pairId]/waiting/[participantId]/page.tsx`
- `components/CouplesQuizForm.tsx`
- `components/PairInviteCard.tsx`
- `components/PairProgress.tsx`
- `components/DeletePairButton.tsx`
- `components/SafetyNotice.tsx`

Work:

1. Convert homepage to landing page.
2. Move solo quiz to `/solo`.
3. Build pair start/join/take/waiting pages.
4. Fork or adapt `QuizForm` for paired flow.
5. Add pair-aware analytics events.
6. Add safety/privacy copy.

Verification:

- `/` loads with both CTAs.
- `/solo` can submit and show `/results/[id]`.
- Partner A sees invite link.
- Partner B can join from invite.
- Waiting page does not reveal answers.

### Task 5 — Pair results report

Files:

- `app/pair/[pairId]/results/page.tsx`
- `components/PairResultsReport.tsx`

Work:

1. Fetch completed pair results.
2. Build `PairComparisonReport` with `comparePairProfiles()`.
3. Render side-by-side answers and report sections.
4. Include delete button.
5. Record `pair_results_viewed` event.

Verification:

- Results page 404s or redirects when incomplete.
- Results show after both complete.
- No percentages/scores/match labels are displayed.
- Example object-vs-scene fixture renders reciprocal translation moves.

### Task 6 — Reporting/export updates

Files:

- `scripts/report.mjs`
- `scripts/export-agent-review-dataset.mjs`

Work:

1. Add pair funnel metrics to report script.
2. Export pair sessions/participants/comparisons with hashed IDs.
3. Omit invite tokens.
4. Include pair counts in manifest.
5. Keep solo export compatibility.

Verification:

- Export runs with existing solo-only database.
- Export runs with at least one pair session.
- No `invite_token` appears in exported files.

### Task 7 — Final verification pass

Work:

1. Run `npm run build`.
2. Run `npm run db:push` if database available.
3. Manually complete one solo submission.
4. Manually complete one pair session end-to-end.
5. Grep UI/report copy for banned terms.
6. Confirm `git diff` contains no accidental secrets or raw data.

Suggested grep:

```bash
rg -n "compatib|diagnos|disorder|deficit|better|worse|match score|your type|you are the" app components lib docs
```

Review matches manually; some occurrences may be allowed in safety disclaimers like “not compatibility scoring.”

---

## 10. Acceptance criteria and verification checklist

### Functional acceptance criteria

- [ ] `/` is a landing page with “Start couples comparison” and “Take solo snapshot.”
- [ ] `/solo` preserves the existing solo quiz and result flow.
- [ ] Existing `/results/[id]` still renders old solo results.
- [ ] Partner A can create an anonymous pair session.
- [ ] Partner A receives an invite link for Partner B.
- [ ] Partner B can join with the invite link.
- [ ] The app prevents a third participant from joining.
- [ ] Both partners answer the same Model C question set independently.
- [ ] A participant cannot submit the same paired quiz twice.
- [ ] If only one partner has completed, the app shows waiting state and no comparison.
- [ ] When both complete, `/pair/[pairId]/results` renders the comparison report.
- [ ] Either participant can delete the comparison.

### Scoring/report acceptance criteria

- [ ] Model C includes all eight lens constructs.
- [ ] Pair scoring does not use legacy visual/words labels.
- [ ] Pair report does not display percentages, point totals, compatibility, or match scores.
- [ ] Pair report includes side-by-side selected answers.
- [ ] Pair report includes shared ground or a low-contrast explanation.
- [ ] Pair report includes top visible difference(s) only when supported by answers.
- [ ] Pair report includes an assumed-similarity check from C3 vs C1.
- [ ] Pair report includes at least one reciprocal translation move.
- [ ] Low-contrast/blended pairs do not receive forced mismatch language.

### Privacy/safety acceptance criteria

- [ ] No names required.
- [ ] No emails required.
- [ ] No relationship status collected.
- [ ] No free-text conflict answers collected.
- [ ] Intake and result pages state this is not therapy, diagnosis, or compatibility scoring.
- [ ] Invite token is unguessable and omitted from exports.
- [ ] Pair data can be deleted by either participant.
- [ ] Waiting pages do not reveal answers.
- [ ] Error messages do not disclose sensitive state beyond what the requester needs.

### Analytics/export acceptance criteria

- [ ] Pair events are recorded with `flowType: 'pair'` and pair metadata.
- [ ] Report script shows solo and pair funnel counts.
- [ ] Export script hashes pair IDs, participant IDs, result IDs, event IDs, and session IDs.
- [ ] Export script omits invite tokens.
- [ ] Export script works for solo-only historical data.
- [ ] Export manifest includes pair counts.

### Build/manual verification checklist

Run before handoff:

```bash
npm run build
```

If database credentials are available:

```bash
npm run db:push
npm run report
npm run export:results
node scripts/export-agent-review-dataset.mjs data/agent-review-test
```

Manual browser path:

1. Open `/`.
2. Click `/solo`; complete solo quiz; verify `/results/[id]`.
3. Open `/pair/start`; create pair.
4. Copy invite URL.
5. Complete Partner A quiz; verify waiting page.
6. Open invite URL in another browser/incognito; join as Partner B.
7. Complete Partner B quiz.
8. Verify both can reach pair results.
9. Verify no comparison was visible before both submitted.
10. Delete comparison; verify results no longer load.

Copy safety sweep:

```bash
rg -n "compatib|diagnos|disorder|deficit|better|worse|match score|your type|you are the|always|never" app components lib
```

Manual review rule:

- “not compatibility scoring” and “not diagnosis” are allowed in disclaimers.
- Interpretive report copy must not use the banned language.

---

## 11. BA Review Amendments — Binding Implementation Notes

These amendments resolve `docs/specs/couples-lens-ba-review.md` findings and override any conflicting language earlier in this spec. Coder agents must treat this section as authoritative.

### 11.1 Route/security amendments

- Pair results route is `/pair/[pairId]/results/[participantId]`, not `/pair/[pairId]/results`.
- Results rendering must validate that `participantId` belongs to `pairId` and that both participants completed.
- Results header must personalize only the role frame: `You = Partner A/B. Your partner = Partner B/A.` The comparison body remains symmetric.
- Invite tokens and pair/participant URLs are bearer-equivalent in MVP. Anyone holding them has that participant's privileges. Mitigations:
  - 7-day expiry.
  - Either participant can delete the comparison at any time.
  - Results are scoped to pair + participant.
  - `invite_token` is nulled immediately after Partner B joins.
  - No per-participant authentication or join-confirmation is implemented in MVP.
- Invite-stuffing risk is accepted for MVP. If the joined comparison looks wrong, the user-facing mitigation is: delete the comparison and start a new one. Join approval is a v2 candidate.

### 11.2 Schema amendments

`pair_sessions` must be:

```sql
create table if not exists pair_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  deleted_at timestamptz,
  status text not null default 'open',
  invite_token text,
  scoring_version text not null default 'couples-lens-mvp-v1',
  metadata jsonb not null default '{}'::jsonb,
  constraint pair_sessions_status_check check (status in ('open', 'one_complete', 'complete', 'expired', 'deleted'))
);
```

- Do not add `research_opt_in` or `experiment_label` in MVP.
- `submitPairedQuiz()` must run insert + participant update + status update in a single SQL transaction and lock the `pair_sessions` row with `select ... for update` before deriving/writing status.
- Add a check constraint for `quiz_results.participant_role in ('partner_a', 'partner_b')` when non-null.
- Legacy solo score columns (`visual_score`, `words_score`, `detail_score`, `visual_pct`, `words_pct`) must be nullable. Paired rows write NULL to those columns, not fake zeroes.
- Before any paired data is written, `scripts/report.mjs` and `scripts/export-agent-review-dataset.mjs` must filter legacy solo metrics by `flow_type = 'solo'` or handle NULL legacy columns safely.
- Deletion semantics: delete `pair_participants`, delete paired `quiz_results`, delete `quiz_events` for the pair except one tombstone event `pair_deleted` with `pair_id` retained and participant/result identifiers nulled.

### 11.3 Server action amendments

- Add paired actions in `app/pair-actions.ts`; keep `app/actions.ts` solo-focused.
- `joinPairSession()` must null `pair_sessions.invite_token` after successfully creating Partner B.
- `invite_opened` is recorded only when the pair exists, is not expired/deleted, the token matches, and Partner B does not already exist. Dedupe in the browser via cookie or sessionStorage per `pairId`.
- Submission must reject if the current app `couplesScoringVersion` differs from `pair_sessions.scoring_version` with safe copy: `This comparison was started under an older version. Please start a new one.`

### 11.4 Model/scoring amendments

- C3 partner-prediction options must use `scores: emptyLensScores()`.
- `maxLensScoresForQuestions()` excludes questions where `construct === 'partnerPrediction'`.
- C9 imagery-vividness contributes only an `imageryBand` tag; it does not contribute to lens scoring. Its options also use `scores: emptyLensScores()`.
- Add scoring-weight rationale in code comments/docs near `lib/couples-questions.ts`: repeated communication/repair items are intentional signal aggregation, but confidence must remain `blended`/`moderate` unless the evidence is consistent across distinct task families.
- Add fixture tests that verify:
  - C3 contributes zero raw lens score and is excluded from max-score normalization.
  - C9 alone cannot place a lens in `topLenses`.
  - Object-vs-scene reciprocal copy assigns the object-facing move to the object-leaning partner and the scene-facing move to the scene-leaning partner.
  - Exact C3 prediction match sets assumed-similarity copy to a close-match state.
  - C10 repair mismatch triggers `different_repair_moves`.
  - Split answers across C5/C7/C8/C10 do not produce a false `clear` confidence top lens.

### 11.5 Report type/copy amendments

`PairComparisonReport` must include:

```ts
imageryNote?: string;
```

Imagery note copy template:

> In this round, one of you reported a more {vivid|fainter} inner picture. That can quietly change how “just picture it” lands.

Add `lib/couples-copy.ts` as the single source for required copy constants:

- `SAFETY_DISCLAIMER`
- `INDEPENDENT_RESPONSE_REMINDER`
- `DELETE_WARNING`
- `EXPIRY_NOTICE`

All paired UI pages import those constants rather than duplicating copy.

### 11.6 Translation mapping table

| Pattern | Trigger | Partner A copy source | Partner B copy source |
| --- | --- | --- | --- |
| `object_vs_scene` | A top=`objectCategory` & B top=`sceneContext`, or reverse | object-leaning or scene-leaning copy based on A's actual lens | object-leaning or scene-leaning copy based on B's actual lens |
| `label_vs_context` | A top=`semanticAnchor` & B top=`sceneContext`, or reverse | label-leaning or context-leaning copy based on A's actual lens | label-leaning or context-leaning copy based on B's actual lens |
| `sequence_vs_gist` | A top=`narrativeSequence` & B top=`gistAtmosphere`, or reverse | sequence-leaning or gist-leaning copy based on A's actual lens | sequence-leaning or gist-leaning copy based on B's actual lens |
| `layout_vs_story` | A top=`spatialLayout` & B top=`narrativeSequence`, or reverse | layout-leaning or story-leaning copy based on A's actual lens | layout-leaning or story-leaning copy based on B's actual lens |
| `detail_vs_atmosphere` | A top=`detailFeatures` & B top=`gistAtmosphere`, or reverse | detail-leaning or atmosphere-leaning copy based on A's actual lens | detail-leaning or atmosphere-leaning copy based on B's actual lens |
| `different_repair_moves` | C10 picks differ | generic Partner A repair move | generic Partner B repair move |
| `blended_or_low_contrast` | no stronger pattern triggered | shared practice only | shared practice only |

### 11.7 Waiting-page amendments

Partner A waiting/progress states must distinguish:

- invite not opened
- invite opened, not joined
- joined, taking quiz
- complete

Source these from `pair_participants` plus valid/deduped `invite_opened` events. Partner B can see only safe role-level completion states.

### 11.8 Acceptance amendments

Acceptance criteria must include:

- Required disclaimer appears on `/pair/start`, `/pair/[pairId]/take/[participantId]`, waiting, and results pages.
- Generated report includes round-language such as `in this round` and contains none of the banned words/phrases.
- Results URL without a valid participant belonging to the pair does not render the report.
- Paired rows do not affect solo aggregate metrics.
- Deletion leaves only the `pair_deleted` tombstone event for that pair.

