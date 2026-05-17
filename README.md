# Visual or Words Questionnaire

Mobile-first Next.js + TailwindCSS questionnaire backed by Neon Postgres.

## What it does

- Asks how someone tends to grab meaning first: objects/details, scenes/gist, visual features, spatial structure, words/narrative, or imagery vividness.
- Starts with the horse question and adds direct self-report plus lightweight task-style scenarios.
- Shows a calibrated result immediately, including practical takeaways.
- Uses normalized dimension percentages so bars are not raw totals.
- Shows blended/inconclusive results when the top two normalized dimensions are close.
- Assigns each browser to an experiment arm for copy/flow comparison.
- Stores start, completion, and abandonment events when the analytics table is available.
- Requires no authentication.

## Run locally

```bash
npm install
cp .env.example .env.local
# fill DATABASE_URL from Neon
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Deploy

Recommended: deploy the Next.js app to Vercel/Netlify/Render and use Neon for Postgres.

Neon is the database, not the web host. Set this environment variable in the host:

```bash
DATABASE_URL=<your Neon connection string>
```

Then run the schema once:

```bash
npm run db:push
```

## Database

Table: `quiz_results`

Important columns:

- `model` — question/model version, e.g. `B`
- `visual_score`
- `words_score`
- `detail_score`
- `result_type`
- `visual_pct`
- `words_pct`
- `answers` — JSONB answer payload, including normalized multidimensional profile
- `experiment_label` — assigned experiment arm, e.g. `quiz-flow-v2:balanced-result-copy`
- `scoring_version`
- `raw_scores`
- `response_times`
- `session_id`
- `created_at`

Table: `quiz_events`

Important columns:

- `event_type` — `start`, `complete`, or `abandon`
- `session_id`
- `experiment_label`
- `answered_count`
- `total_questions`
- `result_id`
- `metadata`
- `created_at`

## Reporting/export

There is no unauthenticated public admin page. Use server-side scripts:

```bash
npm run report
npm run export:results > results.csv
```

See `docs/validation-roadmap.md` for validation and privacy notes.

## Questions we should ask

The goal is not a clinical assessment. It is a lightweight behavioral signal.

Good questions separate:

1. **Object label vs visual specificity**
   - Picture of a horse: “horse” vs “palomino” vs “color/shape/movement.”

2. **Memory recall**
   - Do they remember scenes, timelines, dialogue, or atmosphere?

3. **Directions**
   - Do maps, landmarks, numbered steps, or mixed instructions help most?

4. **Learning style**
   - Diagrams, examples, definitions, or stories?

5. **Problem solving**
   - Draw it, list it, talk it through, or build a mental model?

6. **Description style**
   - Layout/rooms/colors vs facts/events/stories.

7. **Indirect task-style preferences**
   - Which cue would they create for recall?
   - How would they rebuild a messy process from memory?

## A/B model training ideas

Model A asks direct self-report questions.

Model B mixes direct self-report with indirect task-style scenarios.

Later task versions could:

- show an image briefly, then ask what they remembered
- ask people to choose between two explanations of the same idea
- ask them to reconstruct directions from memory
- measure whether concrete images or written labels improve recall

Store model/version and experiment assignment, then compare:

- completion rate
- abandonment rate
- score distribution
- answer consistency
- repeat-take stability
- whether detail score correlates with visual-first results
