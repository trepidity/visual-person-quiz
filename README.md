# Visual or Words Questionnaire

Mobile-first Next.js + TailwindCSS questionnaire backed by Neon Postgres.

## What it does

- Asks whether someone tends to process visually or verbally.
- Starts with the horse question: do they see a horse, a palomino, visual qualities, or a sentence?
- Stores results in Postgres with the question model label for A/B testing.
- Shows the participant their results immediately.
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

- `model` — question/model version, e.g. `A`
- `visual_score`
- `words_score`
- `detail_score`
- `result_type`
- `visual_pct`
- `words_pct`
- `answers` — JSONB answer payload
- `experiment_label` — A/B training label
- `created_at`

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

## A/B model training ideas

Model A asks direct self-report questions.

Model B could later ask indirect tasks:

- show an image briefly, then ask what they remembered
- ask them to choose between two explanations of the same idea
- ask them to reconstruct directions from memory
- measure whether concrete images or written labels improve recall

Store model/version in `quiz_results.model` and compare:

- completion rate
- score distribution
- answer consistency
- repeat-take stability
- whether detail score correlates with visual-first results
