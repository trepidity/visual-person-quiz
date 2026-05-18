'use server';

import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSql } from '@/lib/db';
import { recordQuizEvent } from '@/lib/quiz-events';
import { activeCouplesModel, couplesQuestions, couplesScoringVersion, type ParticipantRole } from '@/lib/couples-questions';
import { alternateCouplesAnswerId, buildCouplesProfile } from '@/lib/couples-scoring';

const submitPairSchema = z.object({
  pairId: z.string().uuid(),
  participantId: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
  alternateAnswers: z.record(z.string(), z.string().max(500)).optional(),
  responseTimes: z.record(z.string(), z.number().nonnegative()).optional(),
  sessionId: z.string().min(1).max(128).optional(),
  privacyAcknowledged: z.boolean().optional().default(true),
});

const joinPairSchema = z.object({
  pairId: z.string().uuid(),
  inviteToken: z.string().min(16).max(256),
});

const deletePairSchema = z.object({
  pairId: z.string().uuid(),
  participantId: z.string().uuid(),
});

function makeInviteToken() {
  return crypto.randomBytes(18).toString('base64url');
}

export async function createPairSession() {
  const sql = getSql();
  const inviteToken = makeInviteToken();

  const [pair] = await sql`
    insert into pair_sessions (invite_token, scoring_version)
    values (${inviteToken}, ${couplesScoringVersion})
    returning id, invite_token
  `;

  const [participant] = await sql`
    insert into pair_participants (pair_id, role, display_label)
    values (${pair.id}, 'partner_a', 'Partner A')
    returning id
  `;

  await recordQuizEvent({
    eventType: 'pair_created',
    flowType: 'pair',
    pairId: pair.id,
    participantId: participant.id,
    participantRole: 'partner_a',
    model: activeCouplesModel,
    scoringVersion: couplesScoringVersion,
  }).catch((error) => console.error('Failed to record pair_created.', error instanceof Error ? error.message : error));

  redirect(`/pair/${pair.id}/take/${participant.id}`);
}

export async function joinPairSession(input: unknown) {
  const parsed = joinPairSchema.parse(input);
  const sql = getSql();

  const results = await sql.transaction((tx) => [
    tx`select id from pair_sessions where id = ${parsed.pairId} for update`,
    tx`
      insert into pair_participants (pair_id, role, display_label)
      select ps.id, 'partner_b', 'Partner B'
      from pair_sessions ps
      where ps.id = ${parsed.pairId}
        and ps.invite_token = ${parsed.inviteToken}
        and ps.deleted_at is null
        and ps.expires_at > now()
        and not exists(select 1 from pair_participants pp where pp.pair_id = ps.id and pp.role = 'partner_b')
      returning id
    `,
    tx`
      update pair_sessions
      set invite_token = null, updated_at = now()
      where id = ${parsed.pairId}
        and exists(select 1 from pair_participants pp where pp.pair_id = ${parsed.pairId} and pp.role = 'partner_b')
      returning id
    `,
  ]);

  const participantRows = results[1] as Array<{ id: string }>;
  const participant = participantRows[0];
  if (!participant) {
    const [pair] = await sql`
      select ps.id, ps.invite_token, ps.deleted_at, ps.expires_at,
        exists(select 1 from pair_participants pp where pp.pair_id = ps.id and pp.role = 'partner_b') as has_partner_b
      from pair_sessions ps
      where ps.id = ${parsed.pairId}
      limit 1
    `;
    if (pair?.has_partner_b) throw new Error('This comparison already has two participants.');
    throw new Error('This invite link is no longer valid.');
  }

  await recordQuizEvent({
    eventType: 'pair_joined',
    flowType: 'pair',
    pairId: parsed.pairId,
    participantId: participant.id,
    participantRole: 'partner_b',
    model: activeCouplesModel,
    scoringVersion: couplesScoringVersion,
  }).catch((error) => console.error('Failed to record pair_joined.', error instanceof Error ? error.message : error));

  redirect(`/pair/${parsed.pairId}/take/${participant.id}`);
}

export async function recordInviteOpened(input: unknown) {
  const parsed = joinPairSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const sql = getSql();
  const rows = await sql`
    select ps.id
    from pair_sessions ps
    where ps.id = ${parsed.data.pairId}
      and ps.invite_token = ${parsed.data.inviteToken}
      and ps.deleted_at is null
      and ps.expires_at > now()
      and not exists(select 1 from pair_participants pp where pp.pair_id = ps.id and pp.role = 'partner_b')
      and not exists(select 1 from quiz_events qe where qe.pair_id = ps.id and qe.event_type = 'invite_opened')
    limit 1
  `;
  if (!rows[0]) return { ok: false };
  await recordQuizEvent({
    eventType: 'invite_opened',
    flowType: 'pair',
    pairId: parsed.data.pairId,
    model: activeCouplesModel,
    scoringVersion: couplesScoringVersion,
  }).catch(() => {});
  return { ok: true };
}

export async function submitPairedQuiz(input: unknown) {
  const parsed = submitPairSchema.parse(input);
  const missingAnswers = couplesQuestions.filter((question) => !parsed.answers[question.id]);
  const invalidAnswers = couplesQuestions.filter((question) => {
    const answerId = parsed.answers[question.id];
    if (!answerId || answerId === alternateCouplesAnswerId) return false;
    return !question.options.some((option) => option.id === answerId);
  });
  if (missingAnswers.length > 0 || invalidAnswers.length > 0) {
    throw new Error('Please answer every question before submitting.');
  }

  const sql = getSql();
  const profileResult = buildCouplesProfile(parsed.answers, parsed.responseTimes ?? {}, couplesQuestions, {
    requireComplete: true,
    alternateAnswers: parsed.alternateAnswers ?? {},
  });
  const h = await headers();
  const userAgent = h.get('user-agent');

  const [participantRow] = await sql`
    select pp.id, pp.role, pp.completed_at, ps.id as pair_id, ps.status, ps.deleted_at, ps.expires_at, ps.scoring_version
    from pair_participants pp
    join pair_sessions ps on ps.id = pp.pair_id
    where pp.id = ${parsed.participantId} and pp.pair_id = ${parsed.pairId}
    limit 1
  `;

  if (!participantRow || participantRow.deleted_at || new Date(participantRow.expires_at) < new Date()) {
    throw new Error('This comparison is no longer available.');
  }
  if (participantRow.completed_at) {
    redirect(`/pair/${parsed.pairId}/waiting/${parsed.participantId}`);
  }
  if (participantRow.scoring_version !== couplesScoringVersion) {
    throw new Error('This comparison was started under an older version. Please start a new one.');
  }

  const role = participantRow.role as ParticipantRole;

  const results = await sql.transaction((tx) => [
    tx`select id from pair_sessions where id = ${parsed.pairId} for update`,
    tx`
      insert into quiz_results (
        model, visual_score, words_score, detail_score, result_type,
        visual_pct, words_pct, answers, user_agent, experiment_label,
        scoring_version, raw_scores, response_times, session_id,
        flow_type, pair_id, participant_id, participant_role, lens_scores, lens_profile, pair_answers
      )
      select
        ${activeCouplesModel}, null, null, null, 'couples_lens',
        null, null, ${JSON.stringify({
          scoringVersion: couplesScoringVersion,
          rawScores: profileResult.rawScores,
          profile: profileResult.profile,
          answers: profileResult.answers,
          privacyAcknowledged: parsed.privacyAcknowledged,
        })}, ${userAgent}, null,
        ${couplesScoringVersion}, ${JSON.stringify(profileResult.rawScores)}, ${JSON.stringify(parsed.responseTimes || {})}, ${parsed.sessionId ?? null},
        'pair', ${parsed.pairId}, ${parsed.participantId}, ${role}, ${JSON.stringify(profileResult.rawScores)}, ${JSON.stringify(profileResult.profile)}, ${JSON.stringify(profileResult.answers)}
      from pair_participants pp
      where pp.id = ${parsed.participantId}
        and pp.pair_id = ${parsed.pairId}
        and pp.completed_at is null
        and not exists (
          select 1 from quiz_results qr
          where qr.flow_type = 'pair'
            and qr.pair_id = ${parsed.pairId}
            and qr.participant_id = ${parsed.participantId}
        )
      returning id
    `,
    tx`
      update pair_participants
      set result_id = (select id from quiz_results where pair_id = ${parsed.pairId} and participant_id = ${parsed.participantId} order by created_at desc limit 1),
          completed_at = now(), updated_at = now(), client_session_id = ${parsed.sessionId ?? null}
      where id = ${parsed.participantId} and completed_at is null
      returning id
    `,
    tx`
      update pair_sessions
      set status = case
          when (select count(*) from pair_participants where pair_id = ${parsed.pairId} and (completed_at is not null or id = ${parsed.participantId})) >= 2 then 'complete'
          else 'one_complete'
        end,
        updated_at = now()
      where id = ${parsed.pairId}
      returning status
    `,
  ]);

  const insertedRows = results[1] as Array<{ id: string }>;
  const statusRows = results[3] as Array<{ status: string }>;
  const resultId = insertedRows[0]?.id;
  const status = statusRows[0]?.status ?? 'one_complete';

  if (!resultId) {
    if (status === 'complete') redirect(`/pair/${parsed.pairId}/results/${parsed.participantId}`);
    redirect(`/pair/${parsed.pairId}/waiting/${parsed.participantId}`);
  }

  await recordQuizEvent({
    eventType: 'pair_completed',
    flowType: 'pair',
    sessionId: parsed.sessionId,
    model: activeCouplesModel,
    scoringVersion: couplesScoringVersion,
    answeredCount: couplesQuestions.length,
    totalQuestions: couplesQuestions.length,
    resultId,
    pairId: parsed.pairId,
    participantId: parsed.participantId,
    participantRole: role,
    metadata: { confidence: profileResult.profile.confidence },
  }).catch((error) => console.error('Failed to record pair_completed.', error instanceof Error ? error.message : error));

  if (status === 'complete') redirect(`/pair/${parsed.pairId}/results/${parsed.participantId}`);
  redirect(`/pair/${parsed.pairId}/waiting/${parsed.participantId}`);
}

export async function deletePairSession(input: unknown) {
  const parsed = deletePairSchema.parse(input);
  const sql = getSql();
  const participant = await sql`
    select id, role from pair_participants where id = ${parsed.participantId} and pair_id = ${parsed.pairId} limit 1
  `;
  if (!participant[0]) throw new Error('Comparison not found.');

  await sql.transaction((tx) => [
    tx`delete from quiz_events where pair_id = ${parsed.pairId}`,
    tx`delete from quiz_results where pair_id = ${parsed.pairId}`,
    tx`delete from pair_participants where pair_id = ${parsed.pairId}`,
    tx`update pair_sessions set status = 'deleted', deleted_at = now(), invite_token = null, updated_at = now() where id = ${parsed.pairId}`,
  ]);

  await recordQuizEvent({
    eventType: 'pair_deleted',
    flowType: 'pair',
    pairId: parsed.pairId,
    model: activeCouplesModel,
    scoringVersion: couplesScoringVersion,
  }).catch(() => {});

  redirect('/pair/start?deleted=1');
}
