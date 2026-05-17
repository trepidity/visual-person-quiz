import { z } from 'zod';
import { getSql } from '@/lib/db';

export const quizEventTypes = ['start', 'abandon', 'complete'] as const;

export const quizEventSchema = z.object({
  eventType: z.enum(quizEventTypes),
  sessionId: z.string().min(1).max(128).optional(),
  experimentLabel: z.string().max(160).optional(),
  model: z.string().max(32).optional(),
  scoringVersion: z.string().max(80).optional(),
  questionId: z.string().max(120).optional(),
  answerId: z.string().max(120).optional(),
  answeredCount: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(1).optional(),
  resultId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type QuizEventInput = z.infer<typeof quizEventSchema>;

export async function recordQuizEvent(input: QuizEventInput) {
  const event = quizEventSchema.parse(input);
  const sql = getSql();

  await sql`
    insert into quiz_events (
      event_type, session_id, experiment_label, model, scoring_version,
      question_id, answer_id, answered_count, total_questions, result_id, metadata
    ) values (
      ${event.eventType}, ${event.sessionId ?? null}, ${event.experimentLabel ?? null}, ${event.model ?? null}, ${event.scoringVersion ?? null},
      ${event.questionId ?? null}, ${event.answerId ?? null}, ${event.answeredCount ?? null}, ${event.totalQuestions ?? null}, ${event.resultId ?? null}, ${JSON.stringify(event.metadata ?? {})}
    )
  `;
}
