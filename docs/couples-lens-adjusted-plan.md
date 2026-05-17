# Couples Communication Lens — Adjusted Plan

## Pivot

The project is no longer primarily a “visual person” quiz.

The root problem is relational:

> Two people can be talking about the same thing, but using completely different words because they are attending to different parts of the same reality.

Example:

- Partner A sees: “a horse.”
- Partner B sees: “landscape, trees, a horse in the country.”

The product should help couples understand how each person:

1. notices the world
2. compresses what they notice into words
3. assumes context
4. communicates meaning
5. translates across lenses

## Product North Star

Help couples say:

> “We are looking at the same thing, but our brains are choosing different handles for it.”

## What Changes

### Old frame

- Individual thinking-style quiz.
- Main question: “Are you visual or words-oriented?”
- Output: individual profile.

### New frame

- Paired communication-lens exercise.
- Main question: “How do our lenses differ when we see and describe the same thing?”
- Output: couple comparison + translation suggestions.

## Product Principles

1. **No blame**
   - Never imply one partner is more accurate or better.
   - Describe differences as lenses, not deficits.

2. **No clinical claims**
   - This is not therapy, diagnosis, personality typing, or compatibility scoring.

3. **Same stimulus, independent answers**
   - The core mechanic is both partners seeing/responding to the same prompt privately before comparing.

4. **Separate seeing from saying**
   - What someone notices first is not necessarily how they explain it.

5. **Translation over labels**
   - The report should produce actionable translation moves, not static identities.

## Constructs to Measure

The word “visual” decomposes into multiple constructs:

- **Object/category lens** — names the central object first.
- **Scene/context lens** — preserves the surrounding context.
- **Detail/features lens** — notices color, texture, shape, motion, materials.
- **Spatial/layout lens** — tracks where things are and how they relate.
- **Gist/atmosphere lens** — notices mood, vibe, emotional tone, overall scene.
- **Narrative/sequence lens** — remembers what happened and in what order.
- **Semantic anchor lens** — uses compact labels, names, tags, or categories.
- **Communication-output lens** — chooses diagrams, bullets, stories, labels, or walkthroughs to explain.

## Research Track

Kick off a research pass focused on:

- cognitive/perceptual framing without overclaiming clinical validity
- communication accommodation / perspective-taking concepts
- gist vs detail perception
- object/category labeling vs scene/context preservation
- communication mismatch and translation language for couples
- safe report wording that avoids blame

Research deliverable:

`docs/couples-communication-lens-research-brief.md`

## Implementation Track

### Phase 0 — Preserve current app

Keep the existing quiz functioning while the new paired mode is designed.

Do not delete the old data model yet.

### Phase 1 — Rebrand surface copy

Update the landing page from “visual or words questionnaire” to “communication lens snapshot.”

Primary promise:

> Take it with someone close to you and compare how each of you notices, encodes, and explains the same things.

### Phase 2 — Add paired session model

Add a couple/pair flow:

1. Partner A starts a comparison.
2. App creates a `pair_id` and invite link.
3. Partner A answers privately.
4. Partner B opens invite and answers privately.
5. When both complete, app shows a comparison report.

No login for v1.

Use anonymous pair/session IDs.

### Phase 3 — Redesign questions around paired comparison

Questions should use paired prompts and same-stimulus tasks:

- same image, different first grab
- same image, different description
- same memory/explanation prompt, different output choice
- same conflict/context prompt, different assumptions

### Phase 4 — Build comparison report

Report should show:

- where lenses match
- where lenses differ
- how each partner may experience the mismatch
- translation moves for each partner

Example:

- Partner A compresses context into central labels.
- Partner B preserves surrounding scene/context.
- Translation move for A: add one sentence of surrounding context.
- Translation move for B: name the central object/decision earlier.

### Phase 5 — Validate

Track:

- completion rate for solo vs paired flow
- invite completion rate
- most common mismatch patterns
- whether users find the report accurate/helpful
- retake stability

## Open Questions

1. Should v1 support solo mode, paired mode, or both?
2. Should partner labels be “Partner A/B” or user-provided names/nicknames?
3. Should comparison reports be shareable by link?
4. How long should pair links live?
5. Do we need a “private results first, compare when both agree” gate?
6. Should we collect optional feedback: “Did this describe your mismatch?”

## Success Criteria for v1

A successful v1 helps a couple identify at least one concrete translation move.

Not:

> You are visual. Your partner is verbal.

But:

> You tend to name the central object quickly. Your partner tends to preserve the surrounding context. When conversations get crossed, try pairing the label with one sentence of scene/context.
