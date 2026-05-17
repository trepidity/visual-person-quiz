# Validation and Reporting Roadmap

This quiz is a prototype, not a diagnostic instrument. The near-term goal is to learn whether the item set produces stable, useful response profiles without overstating certainty.

## Implemented now

- **Normalized dimension bars**: result bars use raw points divided by the maximum available points for each dimension in the current item set.
- **Blended/inconclusive threshold**: top-two dimensions within 8 normalized percentage points are reported as blended/inconclusive.
- **Experiment assignment**: each browser is assigned to a persisted `quiz-flow-v2` arm instead of sending a static label.
- **Lightweight funnel events**: start, completion, and pagehide abandonment events can be stored in `quiz_events`.
- **Practical takeaways**: result pages translate the leading dimensions into usable study/planning/communication suggestions.
- **Indirect task-style items**: the item set now includes memory-cue and process-rebuild scenarios in addition to direct self-report.

## Admin/reporting without exposing raw data publicly

There is intentionally no public admin page yet. Use server-side scripts with `DATABASE_URL`:

```bash
npm run report
npm run export:results > results.csv
```

The export script omits user-agent, session IDs, response times, and raw answer text. Keep raw answer JSON inside the database unless there is a specific research need and a privacy review.

## Next validation steps

1. **Funnel sanity check**
   - Compare starts, completions, and abandonments by experiment arm.
   - Watch for any arm with materially worse completion.

2. **Distribution check**
   - Look for dimensions that almost never win or always win.
   - Check whether normalized scoring reduced structural bias from uneven item coverage.

3. **Close-score handling**
   - Review how often results are blended/inconclusive.
   - Adjust the 8-point threshold only after enough samples show it is too strict or too loose.

4. **Retake stability**
   - Add an optional anonymous retake code or signed short-lived token.
   - Compare dimension ranks and top-two gaps across repeat submissions.

5. **Task-validity improvement**
   - Add actual timed tasks when the product can support them well: brief image recall, route reconstruction, and paired visual-vs-verbal explanations.
   - Keep direct self-report and task items separate in analysis.

6. **Privacy and governance**
   - Keep the submit-time data-use note prominent.
   - Do not collect names/emails unless there is a clear user benefit and explicit consent.
   - Add authenticated admin access before any web-based raw-data views.
