# Visual Person Quiz — Owl / Deep-Research Review

## Executive Summary

The current dataset is too small for population claims, but it is already useful for finding structural problems in the quiz and sharper hypotheses to falsify.

Three major findings:

1. **The current “Imagery vividness-leaning” label may be a scoring artifact.**
   - `imageryVividness` has fewer possible scoring routes than `verbalNarrative`.
   - Normalizing by max can over-weight dimensions with fewer possible points.
   - The current labels may describe the item bank as much as the respondent.

2. **“Visual” is not one thing.**
   The quiz currently mixes perception, mental imagery, spatial thinking, object labeling, memory format, encoding, and communication.

3. **The early behavioral pattern looks like “visual input + verbal output.”**
   Respondents often prefer visual/spatial intake — maps, scenes, diagrams, vibe/layout — but use verbal/semantic anchors for recall, problem solving, and communication.

This directly addresses the original questions:

- When someone says they are visual, that may be true in one dimension but false in another.
- Being visual does not necessarily mean they communicate visually.
- “Visual” may mean objects, scenes, maps, vivid imagery, spatial structure, or just “I need a picture before I can name the thing.”

## Original Questions

1. When someone says they are a visual person, is that really true?
2. When someone says they are a visual person, is that also how they communicate?
3. When someone says they are visual, does that mean they communicate in objects or in words?

## Working Hypothesis

People may not be using the term “visual” precisely.

“Visual” can mean many different constructs:

- vivid mental imagery
- visual perception
- object/detail attention
- scene/gist awareness
- spatial mapping
- diagram preference
- memory representation
- communication style
- verbal labels attached to visual memories

The sharper hypothesis is not “visual people use verbal anchors.”

It is:

> People who report primarily visual thought may still rely on compact verbal or semantic anchors when retrieving, organizing, or communicating complex visual concepts.

## Key Dataset Findings

Current local export:

`data/agent-review/LATEST`

Counts at export:

- Results: 13
- Events: 24
- Sessions: 12
- Completed sessions: 10
- Abandoned without completion: 0

Top answer patterns:

- Directions: `map` was dominant.
- Recall cue task: `named-list` was dominant.
- Memory recall: `scene` was dominant.
- Detail vs gist: `vibe` was dominant.

This suggests a split:

- Visual/spatial input is common.
- Verbal/semantic encoding is also common.
- The same person may use both.

## Structural Concerns

### 1. Scoring normalization may distort labels

The result label “Imagery vividness-leaning” may be inflated because the dimension has fewer maximum available points than other dimensions.

Recommended test:

- Re-score using raw point share.
- Re-score using z-scores.
- Re-score using construct-group composites.
- Compare whether result labels remain stable.

If labels change materially, the current scoring model is not reliable enough for interpretation.

### 2. The horse question may be mis-scored

Choosing “A horse” may not mean verbal/narrative thinking.

It may mean:

- object/category recognition
- obvious noun naming
- fast semantic labeling
- the prompt forced a label-like answer

Treating “horse” as a verbal-thinking signal is probably wrong.

Better distinction:

- object/category label
- visual feature noticing
- scene/gist noticing
- verbal sentence/description

### 3. “Visual” needs separate constructs

The quiz should not collapse these into one visual-vs-words axis.

## Construct Taxonomy for “Visual”

Separate at least these constructs:

1. **Visual perceptual preference**
   - What someone notices in a real scene: gist, layout, objects, color, motion.

2. **Mental imagery vividness**
   - How clearly someone can internally picture people, places, objects, or scenes.

3. **Spatial / map cognition**
   - Maps, routes, layouts, relationship structures.

4. **Visual feature attention**
   - Color, shape, texture, movement, material, fine visual properties.

5. **Object/category labeling default**
   - Whether the brain grabs the noun/category first: “horse,” “chair,” “server,” “app.”

6. **Memory representation modality**
   - Scene, timeline, dialogue, atmosphere, facts.

7. **Encoding preference for self-use**
   - What tool someone creates to remember: sketch, list, color tags, story, labels.

8. **Communication modality for others**
   - How someone explains: diagram, bullet list, story, walkthrough, definition.

## Falsifiable Hypotheses

### H1 — Vivid imagery does not imply visual encoding

People who report clear or rough mental imagery may still choose verbal cues for recall tasks.

Reject if visual-imagery respondents overwhelmingly choose sketch/position/color cues over named-list/numbered-sequence cues.

### H2 — “Horse first” reflects category labeling, not low visual cognition

People who answer “horse” should not automatically be treated as less visual.

Reject if horse-first respondents consistently score much lower on independent imagery/detail/spatial tasks.

### H3 — Visual perception and verbal encoding may be independent

A person may prefer maps/scenes for input and named lists/steps for output.

Reject if visual-input scores strongly negatively correlate with verbal-encoding choices.

### H4 — Current result labels are scoring-model dependent

If alternate scoring sharply reduces “Imagery vividness-leaning” results, the label is an artifact.

Reject if alternate scoring preserves the same labels.

### H5 — Self-report “I’m visual” weakly predicts behavior

Self-description may correlate weakly with actual task choices.

Reject if self-report strongly predicts independent visual recall, reconstruction, and communication tasks.

### H6 — One quiz pass may not be stable

A retake showed major profile movement.

Reject if test-retest profile correlations are high across a larger sample.

### H7 — Named-list may be a universal cheap encoding default

Named lists may not mean someone is a “word person.” They may simply be the fastest cheap memory tool.

Reject if named-list preference remains stable under time, delay, and task changes and strongly tracks verbal-only profiles.

## Recommended Next Quiz / Research Items

### Add direct self-report, then test against behavior

Example:

> Do you consider yourself a visual thinker?

Options:

- Yes, strongly
- Somewhat
- Not really
- I use mixed strategies
- I am not sure what “visual thinker” means

Then compare to behavior.

### Separate input from output

Ask paired questions:

**Input:**

> When understanding a new system, what helps first?

- diagram
- example
- written description
- table/list
- conversation

**Output:**

> When explaining that system to someone else, what do you produce first?

- diagram
- bullet list
- story/walkthrough
- precise definition
- annotated example

### Add visual recall task

Show a simple diagram/image briefly, then ask:

- What do you remember first?
- What cue would help you recreate it tomorrow?
- What would you tell someone else about it?

### Add delayed recall if feasible

Even a lightweight “come back later” mechanic would be more informative than immediate self-report.

### Add communication-specific items

Example:

> You need to explain a system outage to another engineer. What do you send first?

- sequence of events
- architecture diagram
- list of impacted services
- narrative of what happened
- annotated screenshot

## Recommended Scoring / Model Changes

1. Stop presenting a single “visual vs words” axis as the main truth.
2. Split scoring into construct groups:
   - visual perception
   - imagery vividness
   - spatial mapping
   - semantic/category labeling
   - verbal narrative
   - self-encoding
   - other-communication
3. Rework the horse question so object/category labeling is not treated as pure verbal thinking.
4. Add reliability tracking for retakes.
5. Add confidence language: “your response pattern suggests,” not “you are.”
6. Show mixed profiles as first-class results.
7. Treat “visual input + verbal output” as a meaningful archetype.

## Proposed GitHub Issue Comment

```markdown
Owl review from the current export:

The dataset is too small for population claims, but it already reveals a sharper direction.

The current quiz should not try to answer “are visual people really visual?” as a single-axis question. “Visual” is overloaded.

We need to separate at least:

- visual perception/input
- mental imagery vividness
- spatial/map cognition
- object/category labeling
- memory representation
- self-encoding strategy
- communication/output strategy

The early pattern is not “visual vs words.” It looks more like:

> visual/spatial input + verbal/semantic output

Examples from the export:

- map is common for directions
- scene/vibe are common for memory/place perception
- named-list is common for recall cueing
- list/talk/numbered sequence show up in problem solving/rebuild tasks

That directly supports the idea that someone can reasonably call themselves “visual” while still communicating or encoding through words.

Important scoring concern: the current “Imagery vividness-leaning” label may be a normalization artifact because imagery vividness has fewer available scoring routes than verbal narrative or spatial structure. Before collecting much more data, we should re-score the existing data using alternate schemes and see if labels remain stable.

Recommended next steps:

1. Split the model into separate constructs rather than one visual-vs-words axis.
2. Add a direct “do you consider yourself visual?” item, then compare it to task behavior.
3. Separate input questions from output/communication questions.
4. Rework the horse question so “horse” is treated as object/category labeling, not pure verbal thinking.
5. Add tasks that test visual recall, self-created memory cues, and communication choice separately.
6. Track retakes because the current sample already shows one same-session retake with a very different profile.

Best next hypothesis to falsify:

> People who report visual thinking may still rely on compact verbal/semantic anchors when retrieving, organizing, or communicating complex visual concepts.

Do not try to prove it. Design the next quiz version so this can fail.
```
