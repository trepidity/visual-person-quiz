'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSql } from '@/lib/db';
import { activeModel, addScores, emptyScores, profileFromScores, questions, scoringVersion } from '@/lib/questions';

const schema = z.object({
  answers: z.record(z.string(), z.string()),
  responseTimes: z.record(z.string(), z.number().nonnegative()).optional(),
  experimentLabel: z.string().optional(),
});

export async function submitQuiz(input: unknown) {
  const parsed = schema.parse(input);
  let rawScores = emptyScores();

  const enrichedAnswers = questions.map((q, index) => {
    const selected = q.options.find((o) => o.id === parsed.answers[q.id]);
    if (selected) {
      rawScores = addScores(rawScores, selected.scores);
    }
    return {
      questionId: q.id,
      itemVersion: q.version,
      model: q.model,
      construct: q.construct,
      prompt: q.prompt,
      displayOrder: index + 1,
      answerId: selected?.id || null,
      answerLabel: selected?.label || null,
      scores: selected?.scores || emptyScores(),
      responseTimeMs: parsed.responseTimes?.[q.id] ?? null,
    };
  });

  const profile = profileFromScores(rawScores);
  const legacyVisualScore = rawScores.objectDetail + rawScores.sceneGist + rawScores.visualFeatures + rawScores.spatialStructure + rawScores.imageryVividness;
  const legacyWordsScore = rawScores.verbalNarrative;
  const totalLegacy = legacyVisualScore + legacyWordsScore || 1;
  const visualPct = Math.round((legacyVisualScore / totalLegacy) * 100);
  const wordsPct = 100 - visualPct;
  const h = await headers();
  const userAgent = h.get('user-agent');
  const sql = getSql();

  const rows = await sql`
    insert into quiz_results (
      model, visual_score, words_score, detail_score, result_type,
      visual_pct, words_pct, answers, user_agent, experiment_label,
      scoring_version, raw_scores, response_times
    ) values (
      ${activeModel}, ${legacyVisualScore}, ${legacyWordsScore}, ${rawScores.objectDetail}, ${profile.resultType},
      ${visualPct}, ${wordsPct}, ${JSON.stringify({
        scoringVersion,
        rawScores,
        profile,
        answers: enrichedAnswers,
      })},
      ${userAgent}, ${parsed.experimentLabel || 'multidimensional-v1'},
      ${scoringVersion}, ${JSON.stringify(rawScores)}, ${JSON.stringify(parsed.responseTimes || {})}
    )
    returning id
  `;

  redirect(`/results/${rows[0].id}`);
}
