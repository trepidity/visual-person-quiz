# Couples Communication Lens — Implementation Spec

## Goal

Add a paired comparison mode that helps two people understand how they notice, encode, and communicate the same stimulus differently.

The first implementation should be lightweight, anonymous, and safe:

- no login
- no clinical claims
- no compatibility score
- no blame language
- pair comparison by invite link

## Existing App Baseline

Current stack:

- Next.js app router
- TailwindCSS
- Neon Postgres via `@neondatabase/serverless`
- Server action submission in `app/actions.ts`
- Questions/scoring in `lib/questions.ts`
- Analytics events in `quiz_events`
- Results stored in `quiz_results`

Current tables:

- `quiz_results`
- `quiz_events`

## Proposed V1 User Flow

### Solo entry

User lands on homepage and chooses:

1. **Take solo snapshot**
2. **Start a couples comparison**
3. **Join a comparison** via invite link

Solo mode can continue using current flow with updated copy.

### Paired comparison flow

1. Partner A clicks “Start couples comparison.”
2. App creates a `pair_session`.
3. App creates Partner A participant record.
4. Partner A gets:
   - their own quiz form
   - an invite link for Partner B
5. Partner B opens invite link.
6. App creates Partner B participant record.
7. Both answer the same prompt set independently.
8. If only one partner has completed, show waiting page.
9. When both complete, show comparison report.

## Routes

Proposed routes:

- `/` — updated landing page
- `/solo` — current solo quiz flow, optionally redirected from old homepage during transition
- `/pair/start` — creates pair session and redirects to Partner A flow
- `/pair/[pairId]/join` — invite landing page for Partner B
- `/pair/[pairId]/take/[participantId]` — paired quiz form
- `/pair/[pairId]/waiting/[participantId]` — waiting page after one completion
- `/pair/[pairId]/results` — comparison report when both complete

For v1, `pairId` and `participantId` can be opaque random IDs. Later, use shorter invite codes.

## Database Schema

Keep `quiz_results` as the canonical response store, but add pair metadata.

### Add columns to `quiz_results`

```sql
alter table quiz_results add column if not exists pair_id text;
alter table quiz_results add column if not exists participant_id text;
alter table quiz_results add column if not exists participant_role text;
alter table quiz_results add column if not exists flow_type text not null default 'solo';
```

Indexes:

```sql
create index if not exists quiz_results_pair_id_idx on quiz_results(pair_id);
create index if not exists quiz_results_participant_id_idx on quiz_results(participant_id);
create index if not exists quiz_results_flow_type_idx on quiz_results(flow_type);
```

### New table: `pair_sessions`

```sql
create table if not exists pair_sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'open',
  invite_code text unique,
  experiment_label text,
  metadata jsonb not null default '{}'::jsonb
);
```

Status values:

- `open`
- `one_complete`
- `complete`
- `expired`

### New table: `pair_participants`

```sql
create table if not exists pair_participants (
  id text primary key,
  pair_id text not null references pair_sessions(id),
  created_at timestamptz not null default now(),
  role text not null,
  display_label text,
  result_id uuid references quiz_results(id),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
```

Role values:

- `partner_a`
- `partner_b`

No real names required for v1. Optional display labels can be:

- “Me” / “Partner”
- “Partner A” / “Partner B”
- user-entered nicknames if explicitly provided

## Data Privacy

V1 should not collect:

- email
- real names
- relationship status
- sensitive relationship-conflict text

If open-ended text is added later, require a separate privacy review.

Pair links should be unguessable random IDs.

Optional future setting:

- expire pair sessions after 7 or 30 days

## Question Model Changes

Current `Question` model is individual-oriented.

Add metadata fields:

```ts
export type LensConstruct =
  | 'objectCategory'
  | 'sceneContext'
  | 'detailFeatures'
  | 'spatialLayout'
  | 'gistAtmosphere'
  | 'narrativeSequence'
  | 'semanticAnchor'
  | 'communicationOutput';

export type Question = {
  id: string;
  model: 'A' | 'B' | 'C';
  version: string;
  construct: LensConstruct | 'mixed';
  prompt: string;
  helper?: string;
  kind: 'text' | 'image' | 'paired-scenario';
  imageUrl?: string;
  pairCompare?: boolean;
  comparePrompt?: string;
  options: QuestionOption[];
};
```

Add scoring model:

```ts
export type LensScores = {
  objectCategory: number;
  sceneContext: number;
  detailFeatures: number;
  spatialLayout: number;
  gistAtmosphere: number;
  narrativeSequence: number;
  semanticAnchor: number;
  communicationOutput: number;
};
```

## V1 Prompt Set

Use 8–10 questions.

### 1. Same image: first grab

Prompt:

> When you first see this image, what does your brain grab first?

Options:

- The main object/person/thing
- The surrounding scene/context
- Specific visual details
- The mood or atmosphere
- The words I would use to describe it

### 2. Same image: how you would describe it

Prompt:

> If you had to describe this image to your partner, what would you say first?

Options:

- Name the central object
- Describe the full scene
- Mention specific details
- Explain the feeling/vibe
- Tell a small story about what might be happening

### 3. Memory recall

Prompt:

> When you remember a shared moment, what appears first?

Options:

- A snapshot/scene
- The sequence of what happened
- The words said
- The feeling/atmosphere
- The key point or label

### 4. Explanation style

Prompt:

> When explaining a situation to your partner, what do you usually lead with?

Options:

- The conclusion / label
- The surrounding context
- The sequence of events
- The emotional tone
- A visual layout or relationship map

### 5. Miscommunication pattern

Prompt:

> When someone does not understand you, what is usually missing?

Options:

- They missed the central point
- They missed the surrounding context
- They missed the sequence
- They missed the emotional tone
- They missed the exact details

### 6. What feels obvious

Prompt:

> In conversation, what do you most often assume is obvious?

Options:

- The central object/topic
- The context around it
- Why it matters
- The order things happened
- The emotional meaning

### 7. Translation preference

Prompt:

> When your partner is not following, what helps you most?

Options:

- A clearer label/name
- More surrounding context
- A step-by-step sequence
- A concrete example
- A diagram or layout

### 8. Conflict repair

Prompt:

> In a crossed-wire conversation, what would help fastest?

Options:

- “Name the main thing first.”
- “Give me the context.”
- “Tell me the sequence.”
- “Say what this means emotionally.”
- “Show me the layout/relationship.”

## Comparison Engine

### Individual lens summary

For each participant:

- top 2 lens scores
- weak/low lens scores
- input-vs-output gap
- notable patterns

### Pair comparison dimensions

Compute:

- matching lenses
- divergent lenses
- object-vs-scene gap
- label-vs-context gap
- sequence-vs-gist gap
- emotion/vibe gap
- visual-input vs verbal-output split

### Pair report sections

1. **Shared ground**
   - Where both partners tend to notice/communicate similarly.

2. **Where wires cross**
   - Top 1–3 differences.

3. **How Partner A may experience it**
   - Non-blaming, tentative language.

4. **How Partner B may experience it**
   - Same.

5. **Translation moves**
   - Concrete suggestions for each.

6. **Conversation starter**
   - A prompt for them to discuss the result.

## Report Language Rules

Use tentative language:

- “Your answers suggest...”
- “You may tend to...”
- “This can feel like...”
- “Try...”

Avoid:

- “You are...”
- “Your partner is wrong...”
- “This proves...”
- “Compatibility score”
- clinical/diagnostic claims

## Example Report Pattern

### Pattern: Object label vs scene context

Partner A:

- tends to name the central object/topic quickly
- may value concision and clarity

Partner B:

- tends to preserve surrounding context
- may feel that the “point” is incomplete without the scene

Possible crossed wire:

- A thinks B is adding unnecessary detail.
- B thinks A is leaving out important meaning.

Translation moves:

- A: add one sentence of context after naming the main thing.
- B: name the central object/decision before expanding context.

## Server Actions / API

### `createPairSession()`

Creates:

- `pair_sessions` row
- `pair_participants` row for partner A

Returns:

- `pairId`
- `participantId`
- `inviteUrl`

### `joinPairSession(pairId)`

Creates partner B if missing.

Returns partner B participant ID.

Guardrails:

- reject if pair is complete/expired
- reject if two participants already exist

### `submitPairedQuiz(input)`

Same as current `submitQuiz`, but includes:

- `flowType: 'pair'`
- `pairId`
- `participantId`
- `participantRole`

After insert:

- update participant `result_id`, `completed_at`
- update pair status
- redirect to waiting or results

### `getPairResults(pairId)`

Fetch both participant result profiles and build comparison report.

## Analytics Events

Extend `quiz_events.metadata` for pair flow:

- `flowType: 'pair'`
- `pairId`
- `participantRole`
- `pairStatus`

Event types can remain:

- `start`
- `complete`
- `abandon`

Future event types:

- `pair_created`
- `invite_opened`
- `pair_results_viewed`

## Implementation Phases

### Phase 1 — Docs/spec only

- Product brief exists.
- Adjusted plan exists.
- Implementation spec exists.
- Research brief in progress.

### Phase 2 — Schema + data model

- Add pair tables and columns.
- Add TypeScript types for pair sessions and lens scores.
- Keep old solo flow working.

### Phase 3 — Paired flow skeleton

- `/pair/start`
- `/pair/[pairId]/join`
- `/pair/[pairId]/take/[participantId]`
- waiting page
- basic paired completion state

### Phase 4 — Lens model v1

- Add model C questions.
- Add scoring/profile function for lens constructs.
- Keep existing model B for solo until replaced.

### Phase 5 — Pair report v1

- Compare partner profiles.
- Generate deterministic report from pattern rules.
- Add translation moves.

### Phase 6 — Validation/export

- Extend agent export script for pair sessions.
- Add discovery brief for pair mismatch patterns.
- Track whether users say the report was useful.

## Acceptance Criteria for V1

- A partner can create a pair session and invite another partner.
- Both partners can answer independently.
- Neither can see comparison until both complete.
- The comparison report shows at least:
  - top lenses for each partner
  - top mismatch pattern
  - one translation move for each partner
- No names/emails required.
- No compatibility score.
- Existing solo flow remains usable.

## Immediate Next Engineering Tasks

1. Add schema migration to `scripts/db-push.mjs`.
2. Add `lib/couples-lens.ts` for lens scoring and pair comparison rules.
3. Add pair server actions.
4. Add routes/pages for pair flow.
5. Add model C question set.
6. Update exports/reporting for pair data.
7. Add tests or at minimum deterministic fixture checks for comparison output.
