# Couples Communication Lens — Research Brief

Owl / deep-research review of the pivot from a single "visual-person quiz" toward a paired couples test that helps partners understand how each of them sees, encodes, and communicates the same shared reality.

Inputs reviewed:

- `docs/couples-communication-lens-product-brief.md`
- `docs/owl-visual-verbal-anchor-review.md`
- `docs/validation-roadmap.md`
- Latest export pointer: `data/agent-review/LATEST`

This brief is product-grade research synthesis. It is not a clinical instrument and does not validate any diagnostic claim about a person or a relationship.

## Executive Summary

The pivot is sound and scientifically supportable as a **product**, not as a diagnostic. The strongest reframing is this:

> Couples are usually not arguing about the world. They are arguing about which **handle** their brain grabbed for the world first, and which **context** they assumed the other person already shared.

There is real cognitive-science scaffolding for this:

1. People genuinely differ in whether they default to **object imagery**, **spatial/scene structure**, or **verbal/semantic anchors** (Kozhevnikov's object–spatial–verbal cognitive style model). This is the single most defensible non-clinical individual-difference construct to build the product on.
2. Memory is dual-coded as **verbatim** (surface detail) and **gist** (bottom-line meaning) (fuzzy-trace theory). Couples often disagree because one partner is reporting gist and the other is reporting verbatim, and both believe they are reporting "what happened."
3. Naming an object as "a horse" is **basic-level categorization**, not a sign of verbal thinking. It is the default human labeling level (Rosch). The current quiz over-interprets it.
4. Scene perception starts with **global gist** and only then resolves local detail (Navon; Oliva & Torralba). Partners can be in the same room and have legitimately encoded different "scenes" without either being wrong.
5. Successful conversation depends on **common ground** and **audience design** — speakers tailor wording to what they believe is shared (Clark & Brennan). Most "you never told me" moments are common-ground breakdowns, not memory failures.
6. In close relationships, **assumed similarity** ("you must see it the way I see it") is typically stronger than **empathic accuracy** (actually knowing what the partner sees/feels) (Ickes and colleagues). This is the exact problem the product should target.
7. Imagery vividness varies enormously between people (aphantasia ~1%, hyperphantasia ~3% at the extremes; Zeman). One partner may literally not be able to picture what the other is picturing.

The product should therefore be positioned as a **relational mirror**, not a personality assessment. The thing being measured is **the gap between partners' encoding choices on the same stimulus**, not either partner's "type."

The biggest risks are (a) the Forer/Barnum effect making vague output feel deeply personal, (b) the compatibility-score trap where output becomes ammunition in arguments, and (c) clinical overreach. Mitigations are concrete and are below.

## Construct Model

Use a small, defensible set of constructs. Do not try to be comprehensive. Pair them so the output is always about a **gap**, not a label.

### Per-person dimensions

These are scientifically grounded individual differences. Keep each one separately scored. Do not collapse them into a single axis.

1. **Object imagery preference** — colorful, pictorial, high-resolution mental images of objects and people. Maps to Kozhevnikov's "object visualizer."
2. **Spatial / scene structure preference** — schematic layouts, maps, relationships between elements, where things are. Maps to "spatial visualizer."
3. **Verbal / semantic anchor preference** — labels, names, definitions, short handles used as the primary representation. Maps to "verbalizer."
4. **Gist vs verbatim default** — does the person remember the bottom-line meaning, or the surface details? From fuzzy-trace theory.
5. **Global vs local attention default** — does attention go to the whole scene first, or to a specific feature first? From Navon's global-precedence work and scene-gist research.
6. **Imagery vividness band** — vivid / moderate / faint / absent. Useful only as a coarse band; do not score finely. Aphantasia and hyperphantasia are real and matter here.

### Paired (couple-level) dimensions

These are the **product's actual differentiators**. They only exist with two responses to the same prompt.

1. **Lens gap** — how far apart the two partners' default lenses are on the same stimulus (object vs scene vs verbal; gist vs verbatim; global vs local).
2. **Assumed-similarity gap** — how much each partner thinks the other saw the same thing, versus what the other actually reported. A direct echo of the Ickes finding that assumed similarity often dominates over empathic accuracy.
3. **Common-ground gap** — how much context each partner assumed was already shared and therefore left unsaid. Drawn from Clark & Brennan's grounding model.
4. **Translation distance** — how easily each partner can recover the other's intended meaning when shown the other's words. Asymmetries here are usually more informative than the gap itself.

A "lens gap" is not pathology. Two partners with a large lens gap can be very compatible. The point of the product is to make the gap **visible and translatable**, not to score it.

## Task Design

Five task families, each with a paired protocol. Each task must satisfy three rules:

- **Same stimulus, both partners.**
- **Independent response, no cross-contamination** (no live chat, no shared screen during entry).
- **Comparison only after both submit.**

### 1. First-glance description

Show a moderately rich photograph for a fixed brief duration (e.g. 5 seconds), then ask each partner separately:

- "Write one sentence describing what you just saw."
- "What did you notice first?" (multi-select: an object, a scene, a feeling, a layout, a detail, words/text, a sequence)
- "What do you think the picture is about?"

Compare **length, granularity, lens type, and basic-level vs subordinate vs superordinate naming.**

This is the canonical horse-vs-landscape task, but instrumented to separate object-naming default from scene-attention default. Critically: choosing "a horse" no longer scores as "verbal." It scores as basic-level categorization, which is the human default (Rosch).

### 2. Same-memory recall

Ask each partner, independently, about a shared recent experience neither partner can re-look-up (a meal, a trip, a meeting, a movie). Use the same prompt for both:

- "Tell me what you remember in 4–6 sentences."

Then code (lightly, automated is fine):

- mostly **gist** ("it was great, we ended up talking about her job") vs mostly **verbatim** ("she ordered the salmon and the bill was $84")
- mostly **scene** vs mostly **sequence** vs mostly **dialogue** vs mostly **atmosphere**
- did the response **name the central thing first** or **set the scene first**

This separates encoding-modality preference from memory ability. It also produces material couples can immediately recognize ("oh, that's exactly how this argument usually starts").

### 3. Forced translation

Show each partner the **other partner's** description from Task 1 or 2 and ask:

- "In your own words, what do you think they meant?"
- "What do you think they noticed that you didn't?"
- "What would you have added if you'd written it?"

Translation distance is more diagnostic than raw lens difference. Two partners with very different lenses who can translate each other fluently are in great shape. Two partners with similar lenses who can't translate the other's wording are not.

### 4. Audience-design / common-ground probe

Give each partner a short situation prompt:

- "Explain how to get from your house to the grocery store, to someone who has never been to your neighborhood."
- "Explain to someone who has never been to your house: where do you keep the scissors?"

Then ask the partner separately:

- "How would you have explained that?"

The product is looking for **what each partner assumed was already shared** (street names, color of cabinets, "the drawer next to the thing"). This is grounding in action (Clark & Brennan). It is also where most "you never told me" moments live in real relationships.

### 5. Optional: imagery-vividness self-report

Two or three items adapted from the VVIQ family asking the person to picture a familiar scene and rate clarity. Bands only (vivid / moderate / faint / absent), not a fine score. Important so the report can flag: "One of you may experience mental images very differently from the other — this can quietly change a lot of disagreements about 'just picture it.'"

### What not to do

- Do **not** rely on long Likert-scale self-report batteries. They will Barnum hard and the existing data already shows scoring artifacts.
- Do **not** time partners against each other.
- Do **not** allow either partner to see the other's responses before submitting their own.
- Do **not** issue a single compatibility score.

## Report Output Model

The report is the product. It is also where almost all the harm happens if it is wrong. Treat output design with at least as much care as task design.

### Posture

- The report is a **mirror**, not a verdict.
- It describes **this round of responses**, not the people.
- It is written in the **second-person plural** ("you two"), not in the third-person ("Partner A is...").
- It always provides at least one **translation move** that either partner can try.

### Structure

Per couple, per session:

1. **One-sentence frame.** "Here is how each of you entered the same scene this round."
2. **Side-by-side first glance.** Both partners' raw first-glance description, displayed together. No commentary yet — just show them their own words next to each other.
3. **What we noticed about the gap.** Two or three short observations, each one anchored to a specific task response. Example: "On the photo task, one of you started with the central object; the other started with the surrounding scene. Both are legitimate first moves."
4. **Assumed-similarity check.** "Each of you predicted what the other would say. Here is where those predictions matched and where they diverged." This is the part couples almost never get to see otherwise.
5. **Translation move (always at least one).** "If this comes up in a real conversation: the object-first partner can add one sentence of context; the scene-first partner can name the central thing earlier."
6. **What this is not.** A short, plain reminder: this is one round, not a verdict; the same couple can produce different output on a different day; this is not therapy.

### Language guidelines

Use these phrasings; ban the others.

- Use: "in this round," "tended to," "leaned toward," "your responses suggest," "one of you," "the other"
- Use: "different door into the same scene," "different handle," "different starting point"
- Ban: "you are a visual person," "you are a verbal thinker," "your type is," "your communication style is"
- Ban: "Partner A is better at," any ranking, any score, any percentage match
- Ban: "compatible," "incompatible," "compatibility"
- Ban: any clinical framing — "diagnose," "disorder," "deficit," "assessment"

### Symmetry rule

Every observation about Partner A must be presented alongside what Partner B did **in the same task**. Never describe one partner without the other in the same paragraph. This prevents the report from becoming ammunition.

### Confidence rule

If the lens gap is small or the data is thin, **say so**, and present a "blended" report instead of an artificial contrast. The existing roadmap already has this idea for individual results — extend it to couples.

### Sample copy (illustrative)

> On the photo task this round, one of you described "a horse"; the other described "a horse in a field with trees." Both of you saw the same picture. One of you grabbed the central object first, the other set the scene first. Neither is more accurate.
>
> When each of you predicted what the other would say, you both expected your own kind of answer. That's typical — in close relationships, most of us quietly assume our partner sees what we see.
>
> Translation move for next time: the object-first partner can try adding one sentence of context ("a horse — out in the country, by some trees"). The scene-first partner can try naming the central thing earlier ("a horse, with a field and trees around it").
>
> This is one round of responses on one set of prompts. It is a snapshot, not a verdict.

## Risks and Guardrails

### 1. Barnum / Forer effect

Vague, flattering descriptions feel personally accurate to almost anyone. Couples quizzes are textbook Barnum surfaces.

Mitigations:

- Always anchor every claim to **a specific response the user just gave** ("you wrote: 'a horse'"). No free-floating personality descriptions.
- Never present an observation that could equally be made about any couple.
- Prefer "in this round" framing over trait language.

### 2. Compatibility-score trap

Any single score will be used as ammunition in arguments. There is no version of "you got 62% match" that helps a relationship.

Mitigation: **no single score, ever.** Report is structured around side-by-side comparison and translation moves. No top-line number.

### 3. Clinical overreach

Couples quizzes routinely leak into territory adjacent to therapy. This product is not therapy.

Mitigations:

- Explicit "this is not a therapeutic, diagnostic, or clinical tool" notice on intake and on the report.
- No language overlapping with mental-health vocabulary.
- A clear off-ramp: "If something here is opening a real conversation that's getting hard, please consider a licensed couples therapist." Provide a generic referral pointer, not a specific service.

### 4. False precision from small N

With small samples, scoring models will produce labels driven by item-bank shape, not the respondent (this is already documented in `owl-visual-verbal-anchor-review.md` — the "imagery vividness-leaning" label appears to be partly a normalization artifact).

Mitigations:

- Re-score existing data under at least two alternate schemes (raw share, z-scores, construct-group composites) and confirm labels are stable before showing them to couples.
- Use **blended/inconclusive** liberally. The existing 8-point threshold is reasonable; tune only after observed need.
- Track retake stability per couple and per individual. Flag profiles that flip between sessions.

### 5. Self-serving interpretation

Both partners will, independently, read the report as evidence they were right. This is the Murray/Holmes line of work on relationship cognition: people in close relationships often see what supports their existing model of the partner.

Mitigations:

- The symmetry rule above (no observation about one partner without the other in the same paragraph).
- Translation moves directed **equally to both** sides, not "what Partner A should do differently."
- Avoid any language that suggests one lens is more mature, more accurate, more empathetic, or more relational than another.

### 6. Privacy / relationship sensitivity

Paired data is meaningfully more sensitive than solo quiz data:

- A response one partner is fine sharing in isolation may feel exposing in a paired comparison.
- A session record creates a written artifact that may later be used in a fight, in a separation, or by a third party.

Mitigations:

- **No account, no name, no email** required by default. Use an ephemeral paired-session code (existing roadmap idea — extend it).
- Default to **no server retention** of free-text responses past the session, or retain only hashed/aggregated form. If retention is needed for research, make it opt-in per session, clearly explained.
- Allow either partner to **delete the session** unilaterally.
- Do not surface other people in the responses. If a free-text answer mentions a third party by name, strip it before display.

### 7. Demand characteristics and coordination

If partners can see each other's screens or coordinate verbally during the task, the data is worthless and the report becomes a guided conversation rather than a mirror.

Mitigations:

- Strong UI reminder: "please complete this independently before comparing."
- Where possible, run the two partners on separate devices and only reveal the comparison after both have submitted.
- For at-home use, accept that this will sometimes be violated; the product should still produce a useful side-by-side even when contaminated.

### 8. Stereotype / labeling effect

Saying "you're the object-first partner" in 2026 can become "you never see the whole picture" in 2027.

Mitigation: hard rule against trait language. The product describes **what happened this round**, not what kind of person you are.

### 9. Cultural and linguistic bias

The Slobin "thinking for speaking" literature is a clear reminder: how people describe scenes is shaped by the language they're describing in (verb-framed vs satellite-framed languages, for instance, differ systematically in how motion and manner are encoded). Two partners who speak different first languages, or who learned English at different ages, can produce systematically different responses for reasons that have nothing to do with cognitive style.

Mitigations:

- Capture first-language and dominant-language metadata (optional) so the report can soften claims for mixed-language couples.
- Avoid scoring grammatical patterns that are language-specific.

### 10. The "we don't match" reaction

For a non-trivial fraction of couples, seeing a large lens gap will feel bad. The product needs an immediate frame that says: gap is normal, gap is information, gap is not a problem.

Mitigation: every report containing a large gap leads with normalizing language ("most couples have at least one large gap somewhere") before showing the gap.

## Implementation Recommendations

Concrete steps for the prototype. Ordered from "do first" to "do later." All of these are reachable from the current codebase.

### Phase 1 — Restructure scoring and prevent harm

1. Stop showing single-axis "visual vs verbal" labels. The owl review already established the imagery-vividness label is likely a normalization artifact.
2. Re-score existing data with raw share, z-scores, and construct-group composites. Confirm whether any label is stable. If not, retire the label.
3. Rewrite the horse question scoring: "a horse" is basic-level categorization (Rosch), not verbal thinking. Add separate options for scene, detail, atmosphere, and narrative responses.
4. Move all result language from trait form ("you are...") to round form ("this round, you tended to..."). This is a UI-only change with high safety value.

### Phase 2 — Add the paired protocol

1. Build a paired-session code mechanism (six-character, expires in 24h, no account). One partner starts, gets the code; the other joins with the code on their device.
2. Reveal comparison only after both partners submit.
3. Implement the five task families above. Start with Tasks 1 (first-glance), 2 (shared memory), and 4 (audience design). Task 3 (forced translation) is high signal but requires Task 1 or 2 to have completed.
4. Implement the side-by-side report layout per the report model above. Anchor every observation to a specific response.

### Phase 3 — Validate before claiming

1. Run paired sessions with at least 30 couples before publishing any aggregate claims. Track per-couple retake stability over a week.
2. Run an independent A/B on report tone: trait language vs round language. Measure whether couples report the round-language version as more useful and less defensive.
3. Add the "what this is not" disclaimer to both the intake and the report. Confirm it does not depress completion rates materially. If it does, the disclaimer is doing its job and the trade-off is acceptable.

### Phase 4 — Light research instrumentation (opt-in only)

1. Opt-in research mode that retains responses (still no PII) so that:
   - Lens gaps can be analyzed across couples.
   - Assumed-similarity vs translation-distance can be measured against report usefulness ratings.
   - The set of constructs can be pruned based on what actually distinguishes couples.
2. Maintain the existing privacy posture from `validation-roadmap.md`. Do not regress.

### What to avoid in implementation

- Do not build a "couples archetype" feature. There is no scientifically defensible set of couples archetypes.
- Do not build a "your match" feature.
- Do not build a leaderboard, percentile, or comparison to "other couples like you."
- Do not let either partner export the other partner's responses without the other's consent.
- Do not integrate with social sharing as a primary CTA. (As a secondary, opt-in, post-session option, it's fine.)

## Open Questions and Falsifiable Bets

These are worth structuring the product so they can fail:

1. **Lens gap predicts perceived understanding more than lens type does.** If true, the report should foreground the gap and de-emphasize the individual types.
2. **Translation-distance asymmetry is the single most useful number for couples.** If true, the report should center on it.
3. **Couples improve more from naming the gap than from changing the gap.** If true, the product should never recommend that one partner "become more like" the other.
4. **Same-stimulus paired tasks produce more stable signal than self-report Likert items.** If true, deprecate the Likert items.
5. **Audience-design / common-ground tasks (Task 4) surface more relationship-relevant material than perception tasks (Task 1).** If true, lead with audience-design tasks even though they feel less novel.

## Source Notes

Cognitive style and imagery:

- Blajenkova, O. & Kozhevnikov, M. (2009). The new object–spatial–verbal cognitive style model: theory and measurement. [PDF](http://mariakozhevnikov.com/images/pdfs/Blazhenkova_Kozhevnikov_OSV_2009.pdf)
- Hoffler et al. (2017). More Evidence for Three Types of Cognitive Style: Validating the Object‐Spatial Imagery and Verbal Questionnaire Using Eye Tracking. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5248590/)
- Zeman, A. (2024). Aphantasia and hyperphantasia: exploring imagery vividness extremes. *Trends in Cognitive Sciences*. [Cell](https://www.cell.com/trends/cognitive-sciences/fulltext/S1364-6613(24)00034-2)
- Aphantasia — overview. [Wikipedia](https://en.wikipedia.org/wiki/Aphantasia)

Memory, gist, and verbatim encoding:

- Reyna, V. F. (2020). A scientific theory of gist communication and misinformation resistance. *PNAS*. [PNAS](https://www.pnas.org/doi/10.1073/pnas.1912441117)
- Fuzzy-trace theory — overview. [Wikipedia](https://en.wikipedia.org/wiki/Fuzzy-trace_theory)
- Brainerd & Reyna (2002). Fuzzy-Trace Theory and False Memory. [SAGE](https://journals.sagepub.com/doi/10.1111/1467-8721.00192)

Scene perception, global vs local:

- Oliva, A. & Torralba, A. (2006). Building the gist of a scene: the role of global image features in recognition. [PDF](http://olivalab.mit.edu/Papers/OlivaTorralbaPBR2006.pdf)
- Navon's classical paradigm — local vs global processing. [Nature Sci. Reports](https://www.nature.com/articles/s41598-017-18664-5)

Object categorization:

- Rosch, E. (1978). Principles of Categorization. [PDF](https://commonweb.unifr.ch/artsdean/pub/gestens/f/as/files/4610/9778_083247.pdf)

Conversation, common ground, audience design:

- Grounding in communication. [Wikipedia](https://en.wikipedia.org/wiki/Grounding_in_communication)
- Memory and Common Ground Processes in Language Use. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5813694/)

Couples, empathic accuracy, assumed similarity:

- Ickes, W. — Empathic Accuracy (overview chapter). [Greater Good PDF](https://greatergood.berkeley.edu/images/uploads/Empathic_Accuracy.pdf)
- Couples' Perceptions of Each Other's Daily Affect: Empathic Accuracy, Assumed Similarity, and Indirect Accuracy. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6512343/)
- Berlamont et al. (2024). Couple similarity in empathic accuracy and relationship well-being. [SAGE](https://journals.sagepub.com/doi/10.1177/02654075231206412)
- Empathic accuracy and relationship satisfaction: meta-analytic review. [PubMed](https://pubmed.ncbi.nlm.nih.gov/28394141/)
- Gottman — Bids for connection / turning toward. [Gottman blog](https://www.gottman.com/blog/want-to-improve-your-relationship-start-paying-more-attention-to-bids/)

Linguistic relativity:

- Slobin, D. — From "thought and language" to "thinking for speaking." [PhilArchive](https://philarchive.org/rec/SLOFTA)

Risks:

- Barnum / Forer effect — overview. [EBSCO research starter](https://www.ebsco.com/research-starters/psychology/barnum-effect)
