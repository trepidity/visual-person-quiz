'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSql } from '@/lib/db';
import { assignExperimentArm } from '@/lib/experiments';
import { recordQuizEvent } from '@/lib/quiz-events';
import { activeModel, addScores, alternateAnswerId, alternateAnswerLabel, emptyScores, profileFromScores, questions, scoringVersion } from '@/lib/questions';

const schema = z.object({
  answers: z.record(z.string(), z.string()),
  alternateAnswers: z.record(z.string(), z.string().max(500)).optional(),
  responseTimes: z.record(z.string(), z.number().nonnegative()).optional(),
  experimentLabel: z.string().max(160).optional(),
  sessionId: z.string().min(1).max(128).optional(),
  // Client requires this before submit. Keep server tolerant so stale clients or
  // hydration races don't crash the page with a generic 500.
  privacyAcknowledged: z.boolean().optional().default(true),
});

function sanitizeFreeform(value: string | undefined) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, 500) : undefined;
}

export async function submitQuiz(input: unknown) {
  const parsed = schema.parse(input);
  const missingAnswers = questions.filter((question) => !parsed.answers[question.id]);
  const invalidAnswers = questions.filter((question) => {
    const answerId = parsed.answers[question.id];
    return answerId && answerId !== alternateAnswerId && !question.options.some((option) => option.id === answerId);
  });
  if (missingAnswers.length > 0 || invalidAnswers.length > 0) {
    throw new Error('Please answer every question before submitting.');
  }

  let rawScores = emptyScores();

  const enrichedAnswers = questions.map((q, index) => {
    const isAlternate = parsed.answers[q.id] === alternateAnswerId;
    const selected = isAlternate ? null : q.options.find((o) => o.id === parsed.answers[q.id]);
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
      answerId: isAlternate ? alternateAnswerId : selected?.id || null,
      answerLabel: isAlternate ? alternateAnswerLabel : selected?.label || null,
      freeformText: isAlternate ? sanitizeFreeform(parsed.alternateAnswers?.[q.id]) : undefined,
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
  const experimentLabel = parsed.experimentLabel || assignExperimentArm(undefined, 'server-fallback-v1').label;

  const rows = await sql`
    insert into quiz_results (
      model, visual_score, words_score, detail_score, result_type,
      visual_pct, words_pct, answers, user_agent, experiment_label,
      scoring_version, raw_scores, response_times, session_id
    ) values (
      ${activeModel}, ${legacyVisualScore}, ${legacyWordsScore}, ${rawScores.objectDetail}, ${profile.resultType},
      ${visualPct}, ${wordsPct}, ${JSON.stringify({
        scoringVersion,
        rawScores,
        profile,
        answers: enrichedAnswers,
        privacyAcknowledged: parsed.privacyAcknowledged,
      })},
      ${userAgent}, ${experimentLabel},
      ${scoringVersion}, ${JSON.stringify(rawScores)}, ${JSON.stringify(parsed.responseTimes || {})}, ${parsed.sessionId ?? null}
    )
    returning id
  `;

  const resultId = rows[0].id as string;

  await recordQuizEvent({
    eventType: 'complete',
    sessionId: parsed.sessionId,
    experimentLabel,
    model: activeModel,
    scoringVersion,
    answeredCount: questions.length,
    totalQuestions: questions.length,
    resultId,
    metadata: {
      resultType: profile.resultType,
      confidence: profile.confidence,
      isInconclusive: profile.isInconclusive,
    },
  }).catch((error) => {
    console.error('Failed to record completion event.', error instanceof Error ? error.message : error);
  });

  redirect(`/results/${resultId}`);
}
