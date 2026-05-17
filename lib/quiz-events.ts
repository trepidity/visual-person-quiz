import { z } from 'zod';
import { getSql } from '@/lib/db';

export const quizEventTypes = [
  'start',
  'abandon',
  'complete',
  'pair_created',
  'invite_opened',
  'pair_joined',
  'pair_started',
  'pair_completed',
  'pair_waiting_viewed',
  'pair_results_viewed',
  'pair_deleted',
] as const;

export const participantRoleSchema = z.enum(['partner_a', 'partner_b']);
export const flowTypeSchema = z.enum(['solo', 'pair']);

export const quizEventSchema = z.object({
  eventType: z.enum(quizEventTypes),
  flowType: flowTypeSchema.optional(),
  sessionId: z.string().min(1).max(128).optional(),
  experimentLabel: z.string().max(160).optional(),
  model: z.string().max(32).optional(),
  scoringVersion: z.string().max(80).optional(),
  questionId: z.string().max(120).optional(),
  answerId: z.string().max(120).optional(),
  answeredCount: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(1).optional(),
  resultId: z.string().uuid().optional(),
  pairId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
  participantRole: participantRoleSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type QuizEventInput = z.infer<typeof quizEventSchema>;

export async function recordQuizEvent(input: QuizEventInput) {
  const event = quizEventSchema.parse(input);
  const sql = getSql();
  const metadata = {
    ...(event.metadata ?? {}),
    ...(event.flowType ? { flowType: event.flowType } : {}),
    ...(event.participantRole ? { participantRole: event.participantRole } : {}),
  };

  await sql`
    insert into quiz_events (
      event_type, session_id, experiment_label, model, scoring_version,
      question_id, answer_id, answered_count, total_questions, result_id,
      flow_type, pair_id, participant_id, participant_role, metadata
    ) values (
      ${event.eventType}, ${event.sessionId ?? null}, ${event.experimentLabel ?? null}, ${event.model ?? null}, ${event.scoringVersion ?? null},
      ${event.questionId ?? null}, ${event.answerId ?? null}, ${event.answeredCount ?? null}, ${event.totalQuestions ?? null}, ${event.resultId ?? null},
      ${event.flowType ?? 'solo'}, ${event.pairId ?? null}, ${event.participantId ?? null}, ${event.participantRole ?? null}, ${JSON.stringify(metadata)}
    )
  `;
}
