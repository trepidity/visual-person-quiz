import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function loadEnvFile(file) {
  return fs.readFile(file, 'utf8')
    .then((text) => {
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;
        const [, key, raw] = match;
        if (process.env[key]) continue;
        process.env[key] = raw.trim().replace(/^["']|["']$/g, '');
      }
    })
    .catch(() => {});
}

await loadEnvFile('.env.local');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required. Run `npx vercel env pull .env.local --environment=production` first.');
  process.exit(1);
}

const exportRoot = process.argv[2] || 'data/agent-review';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(exportRoot, `visual-person-quiz-${stamp}`);
const sql = neon(databaseUrl);
const hashSalt = `visual-person-quiz-agent-export-v2:${stamp}`;

function anon(value, prefix) {
  if (!value) return null;
  return `${prefix}_${crypto.createHash('sha256').update(`${hashSalt}:${value}`).digest('hex').slice(0, 12)}`;
}

function hashFrom(map, value, prefix) {
  if (!value) return null;
  if (!map.has(value)) map.set(value, anon(value, prefix));
  return map.get(value);
}

async function tableExists(tableName) {
  const [row] = await sql`
    select to_regclass(${`public.${tableName}`}) is not null as exists
  `;
  return Boolean(row?.exists);
}

async function columnExists(tableName, columnName) {
  const [row] = await sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${tableName}
        and column_name = ${columnName}
    ) as exists
  `;
  return Boolean(row?.exists);
}

function scoreObject(row) {
  return row.raw_scores ?? row.answers?.rawScores ?? {};
}

function selectedAnswersFromPayload(payload) {
  if (!payload) return {};
  if (Array.isArray(payload)) {
    return Object.fromEntries(
      payload
        .filter((answer) => answer?.questionId)
        .map((answer) => [answer.questionId, answer.answerId ?? answer.selectedAnswerId ?? answer.value ?? null]),
    );
  }
  if (typeof payload === 'object') {
    return Object.fromEntries(Object.entries(payload).map(([questionId, value]) => {
      if (value && typeof value === 'object') {
        return [questionId, value.answerId ?? value.selectedAnswerId ?? value.id ?? value.value ?? null];
      }
      return [questionId, value];
    }));
  }
  return {};
}

function answerRowsFromPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object') {
    return Object.entries(payload).map(([questionId, value]) => {
      if (value && typeof value === 'object') {
        return {
          questionId,
          answerId: value.answerId ?? value.selectedAnswerId ?? value.id ?? value.value ?? null,
          answerLabel: value.answerLabel ?? value.label ?? null,
          prompt: value.prompt ?? questionId,
          scores: value.scores ?? null,
          responseTimeMs: value.responseTimeMs ?? null,
        };
      }
      return { questionId, answerId: value, answerLabel: null, prompt: questionId, scores: null, responseTimeMs: null };
    });
  }
  return [];
}

function lensKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.lens ?? value.construct ?? value.id ?? value.key ?? value.name ?? null;
  return null;
}

function topLensesFromProfile(profile) {
  if (!profile || typeof profile !== 'object') return [];
  if (Array.isArray(profile.topLenses)) return profile.topLenses.map(lensKey).filter(Boolean);
  if (profile.topLens) return [lensKey(profile.topLens)].filter(Boolean);
  if (Array.isArray(profile.dimensions)) {
    return [...profile.dimensions]
      .sort((a, b) => Number(b.normalizedPct ?? b.score ?? 0) - Number(a.normalizedPct ?? a.score ?? 0))
      .map(lensKey)
      .filter(Boolean)
      .slice(0, 3);
  }
  return [];
}

function imageryBandFromProfile(profile) {
  return profile?.imageryBand ?? profile?.imagery?.band ?? profile?.tags?.imageryBand ?? null;
}

function isBlendedProfile(profile) {
  return Boolean(profile?.isBlended || profile?.confidence === 'blended' || profile?.confidence === 'low' || profile?.isLowContrast);
}

function inferPatterns(profileA, profileB, selectedA, selectedB) {
  const topA = topLensesFromProfile(profileA)[0];
  const topB = topLensesFromProfile(profileB)[0];
  const pairKey = [topA, topB].sort().join('|');
  const patternByLensPair = new Map([
    ['objectCategory|sceneContext', 'object_vs_scene'],
    ['sceneContext|semanticAnchor', 'label_vs_context'],
    ['gistAtmosphere|narrativeSequence', 'sequence_vs_gist'],
    ['narrativeSequence|spatialLayout', 'layout_vs_story'],
    ['detailFeatures|gistAtmosphere', 'detail_vs_atmosphere'],
  ]);
  const patterns = [];
  const topLensPattern = patternByLensPair.get(pairKey);
  if (topLensPattern) patterns.push(topLensPattern);
  if (selectedA.c10_crossed_wire_repair && selectedB.c10_crossed_wire_repair && selectedA.c10_crossed_wire_repair !== selectedB.c10_crossed_wire_repair) {
    patterns.push('different_repair_moves');
  }
  return patterns.length ? patterns : ['blended_or_low_contrast'];
}

function assumedSimilarityFromSelected(selectedA, selectedB) {
  const aPrediction = selectedA.c3_predict_partner_first_grab;
  const bPrediction = selectedB.c3_predict_partner_first_grab;
  const aActual = selectedA.c1_image_first_grab;
  const bActual = selectedB.c1_image_first_grab;
  if (!aPrediction || !bPrediction || !aActual || !bActual) return 'not_available';
  const aMatched = aPrediction === bActual;
  const bMatched = bPrediction === aActual;
  if (aMatched && bMatched) return 'both_matched';
  if (!aMatched && !bMatched) return 'both_diverged';
  return 'mixed';
}

function sharedGroundCount(selectedA, selectedB) {
  return Object.entries(selectedA).filter(([questionId, answerId]) => questionId !== 'c3_predict_partner_first_grab' && selectedB[questionId] === answerId).length;
}

function sanitizeMetadata(value, maps) {
  if (Array.isArray(value)) return value.map((item) => sanitizeMetadata(item, maps));
  if (!value || typeof value !== 'object') return value;

  const out = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[_-]/g, '');
    if (normalized.includes('invitetoken') || normalized.includes('inviteurl') || normalized.includes('invitelink')) {
      continue;
    }
    if (normalized === 'pairid' && typeof rawValue === 'string') {
      out[key] = hashFrom(maps.pairIdMap, rawValue, 'pair');
      continue;
    }
    if (normalized === 'participantid' && typeof rawValue === 'string') {
      out[key] = hashFrom(maps.participantIdMap, rawValue, 'participant');
      continue;
    }
    if (normalized === 'resultid' && typeof rawValue === 'string') {
      out[key] = hashFrom(maps.resultIdMap, rawValue, 'result');
      continue;
    }
    if (normalized === 'eventid' && typeof rawValue === 'string') {
      out[key] = hashFrom(maps.eventIdMap, rawValue, 'event');
      continue;
    }
    if ((normalized === 'sessionid' || normalized === 'clientsessionid') && typeof rawValue === 'string') {
      out[key] = hashFrom(maps.sessionIdMap, rawValue, 'session');
      continue;
    }
    out[key] = sanitizeMetadata(rawValue, maps);
  }
  return out;
}

function writeJsonl(file, rows) {
  return fs.writeFile(file, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

const hasResultPairColumns = await columnExists('quiz_results', 'flow_type')
  && await columnExists('quiz_results', 'pair_id')
  && await columnExists('quiz_results', 'participant_id')
  && await columnExists('quiz_results', 'participant_role')
  && await columnExists('quiz_results', 'lens_scores')
  && await columnExists('quiz_results', 'lens_profile')
  && await columnExists('quiz_results', 'pair_answers');
const hasEvents = await tableExists('quiz_events');
const hasEventPairColumns = hasEvents
  && await columnExists('quiz_events', 'flow_type')
  && await columnExists('quiz_events', 'pair_id')
  && await columnExists('quiz_events', 'participant_id')
  && await columnExists('quiz_events', 'participant_role');
const hasPairSessions = await tableExists('pair_sessions');
const hasPairParticipants = await tableExists('pair_participants');
const hasPairSessionScoringVersion = hasPairSessions && await columnExists('pair_sessions', 'scoring_version');

const results = hasResultPairColumns
  ? await sql`
      select id, created_at, model, scoring_version, experiment_label, result_type,
             visual_score, words_score, detail_score, visual_pct, words_pct,
             raw_scores, response_times, session_id, answers,
             flow_type, pair_id, participant_id, participant_role, deleted_at,
             lens_scores, lens_profile, pair_answers
      from quiz_results
      order by created_at asc
    `
  : await sql`
      select id, created_at, model, scoring_version, experiment_label, result_type,
             visual_score, words_score, detail_score, visual_pct, words_pct,
             raw_scores, response_times, session_id, answers,
             'solo'::text as flow_type, null::uuid as pair_id, null::uuid as participant_id,
             null::text as participant_role, null::timestamptz as deleted_at,
             null::jsonb as lens_scores, null::jsonb as lens_profile, null::jsonb as pair_answers
      from quiz_results
      order by created_at asc
    `;

const events = !hasEvents
  ? []
  : hasEventPairColumns
    ? await sql`
        select id, created_at, event_type, session_id, experiment_label, model, scoring_version,
               question_id, answer_id, answered_count, total_questions, result_id,
               flow_type, pair_id, participant_id, participant_role, metadata
        from quiz_events
        order by created_at asc
      `
    : await sql`
        select id, created_at, event_type, session_id, experiment_label, model, scoring_version,
               question_id, answer_id, answered_count, total_questions, result_id,
               'solo'::text as flow_type, null::uuid as pair_id, null::uuid as participant_id,
               null::text as participant_role, metadata
        from quiz_events
        order by created_at asc
      `;

const pairSessions = !hasPairSessions
  ? []
  : hasPairSessionScoringVersion
    ? await sql`
        select id, created_at, updated_at, expires_at, deleted_at, status, scoring_version
        from pair_sessions
        order by created_at asc
      `
    : await sql`
        select id, created_at, updated_at, expires_at, deleted_at, status, null::text as scoring_version
        from pair_sessions
        order by created_at asc
      `;

const pairParticipants = !hasPairParticipants
  ? []
  : await sql`
      select id, pair_id, created_at, updated_at, role, result_id, completed_at
      from pair_participants
      order by created_at asc
    `;

await fs.mkdir(path.join(outDir, 'raw'), { recursive: true });
await fs.mkdir(path.join(outDir, 'derived'), { recursive: true });

const resultIdMap = new Map();
const eventIdMap = new Map();
const sessionIdMap = new Map();
const pairIdMap = new Map();
const participantIdMap = new Map();

for (const row of results) hashFrom(resultIdMap, row.id, 'result');
for (const row of events) {
  hashFrom(eventIdMap, row.id, 'event');
  hashFrom(resultIdMap, row.result_id, 'result');
  hashFrom(sessionIdMap, row.session_id, 'session');
  hashFrom(pairIdMap, row.pair_id, 'pair');
  hashFrom(participantIdMap, row.participant_id, 'participant');
}
for (const row of results) {
  hashFrom(sessionIdMap, row.session_id, 'session');
  hashFrom(pairIdMap, row.pair_id, 'pair');
  hashFrom(participantIdMap, row.participant_id, 'participant');
}
for (const row of pairSessions) hashFrom(pairIdMap, row.id, 'pair');
for (const row of pairParticipants) {
  hashFrom(participantIdMap, row.id, 'participant');
  hashFrom(pairIdMap, row.pair_id, 'pair');
  hashFrom(resultIdMap, row.result_id, 'result');
}

const maps = { resultIdMap, eventIdMap, sessionIdMap, pairIdMap, participantIdMap };

const sanitizedResults = results.map((row) => {
  const flowType = row.flow_type ?? 'solo';
  const safeAnswersContainer = sanitizeMetadata(row.answers ?? {}, maps);
  const answers = safeAnswersContainer?.answers ?? [];
  const pairAnswers = row.pair_answers ?? safeAnswersContainer?.pairAnswers ?? answers;
  const lensProfile = row.lens_profile ?? safeAnswersContainer?.lensProfile ?? safeAnswersContainer?.profile ?? null;
  return {
    resultId: resultIdMap.get(row.id),
    createdAt: row.created_at,
    flowType,
    model: row.model,
    scoringVersion: row.scoring_version,
    experimentLabel: row.experiment_label,
    resultType: row.result_type,
    pairId: pairIdMap.get(row.pair_id) ?? null,
    participantId: participantIdMap.get(row.participant_id) ?? null,
    participantRole: row.participant_role ?? null,
    deletedAt: row.deleted_at ?? null,
    legacyScores: {
      visualScore: flowType === 'solo' ? row.visual_score : null,
      wordsScore: flowType === 'solo' ? row.words_score : null,
      detailScore: flowType === 'solo' ? row.detail_score : null,
      visualPct: flowType === 'solo' ? row.visual_pct : null,
      wordsPct: flowType === 'solo' ? row.words_pct : null,
    },
    rawScores: scoreObject(row),
    lensScores: row.lens_scores ?? safeAnswersContainer?.lensScores ?? (flowType === 'pair' ? scoreObject(row) : null),
    lensProfile,
    responseTimes: row.response_times ?? {},
    sessionId: sessionIdMap.get(row.session_id) ?? null,
    profile: safeAnswersContainer?.profile ?? null,
    answers,
    pairAnswers: flowType === 'pair' ? pairAnswers : [],
  };
});

const sanitizedEvents = events.map((row) => ({
  eventId: eventIdMap.get(row.id),
  createdAt: row.created_at,
  eventType: row.event_type,
  flowType: row.flow_type ?? row.metadata?.flowType ?? 'solo',
  sessionId: sessionIdMap.get(row.session_id) ?? null,
  experimentLabel: row.experiment_label,
  model: row.model,
  scoringVersion: row.scoring_version,
  questionId: row.question_id,
  answerId: row.answer_id,
  answeredCount: row.answered_count,
  totalQuestions: row.total_questions,
  resultId: resultIdMap.get(row.result_id) ?? null,
  pairId: pairIdMap.get(row.pair_id) ?? null,
  participantId: participantIdMap.get(row.participant_id) ?? null,
  participantRole: row.participant_role ?? row.metadata?.participantRole ?? null,
  metadata: sanitizeMetadata(row.metadata ?? {}, maps),
}));

const sanitizedPairSessions = pairSessions.map((row) => ({
  pairId: pairIdMap.get(row.id),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  expiresAt: row.expires_at,
  deletedAt: row.deleted_at,
  status: row.status,
  scoringVersion: row.scoring_version,
}));

const sanitizedPairParticipants = pairParticipants.map((row) => ({
  participantId: participantIdMap.get(row.id),
  pairId: pairIdMap.get(row.pair_id),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  role: row.role,
  resultId: resultIdMap.get(row.result_id) ?? null,
  completedAt: row.completed_at,
}));

const pairResults = sanitizedResults.filter((result) => result.flowType === 'pair');
const soloResults = sanitizedResults.filter((result) => result.flowType === 'solo');
const soloEvents = sanitizedEvents.filter((event) => event.flowType === 'solo');
const pairEvents = sanitizedEvents.filter((event) => event.flowType === 'pair' || event.pairId || event.eventType.startsWith('pair_') || event.eventType === 'invite_opened');

const participantsByPair = new Map();
for (const participant of sanitizedPairParticipants) {
  const list = participantsByPair.get(participant.pairId) ?? [];
  list.push(participant);
  participantsByPair.set(participant.pairId, list);
}
const pairResultsByParticipant = new Map(pairResults.filter((result) => result.participantId).map((result) => [result.participantId, result]));
const pairResultsByResultId = new Map(pairResults.map((result) => [result.resultId, result]));

const pairComparisons = [];
for (const session of sanitizedPairSessions) {
  const participants = participantsByPair.get(session.pairId) ?? [];
  const participantA = participants.find((participant) => participant.role === 'partner_a');
  const participantB = participants.find((participant) => participant.role === 'partner_b');
  const resultA = pairResultsByParticipant.get(participantA?.participantId) ?? pairResultsByResultId.get(participantA?.resultId);
  const resultB = pairResultsByParticipant.get(participantB?.participantId) ?? pairResultsByResultId.get(participantB?.resultId);
  if (!participantA || !participantB || !resultA || !resultB) continue;
  if (session.status !== 'complete' && (!participantA.completedAt || !participantB.completedAt)) continue;

  const selectedA = selectedAnswersFromPayload(resultA.pairAnswers?.length ? resultA.pairAnswers : resultA.answers);
  const selectedB = selectedAnswersFromPayload(resultB.pairAnswers?.length ? resultB.pairAnswers : resultB.answers);
  const patterns = inferPatterns(resultA.lensProfile, resultB.lensProfile, selectedA, selectedB);
  const completedAt = [participantA.completedAt, participantB.completedAt, resultA.createdAt, resultB.createdAt]
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  pairComparisons.push({
    pairId: session.pairId,
    status: session.status,
    createdAt: session.createdAt,
    completedAt,
    participantA: {
      participantId: participantA.participantId,
      resultId: resultA.resultId,
      topLenses: topLensesFromProfile(resultA.lensProfile),
      isBlended: isBlendedProfile(resultA.lensProfile),
      imageryBand: imageryBandFromProfile(resultA.lensProfile),
      selected: selectedA,
    },
    participantB: {
      participantId: participantB.participantId,
      resultId: resultB.resultId,
      topLenses: topLensesFromProfile(resultB.lensProfile),
      isBlended: isBlendedProfile(resultB.lensProfile),
      imageryBand: imageryBandFromProfile(resultB.lensProfile),
      selected: selectedB,
    },
    comparison: {
      isLowContrast: patterns.length === 1 && patterns[0] === 'blended_or_low_contrast',
      patterns,
      sharedGroundCount: sharedGroundCount(selectedA, selectedB),
      translationMoveCount: patterns.filter((pattern) => pattern !== 'blended_or_low_contrast').length,
      assumedSimilarity: assumedSimilarityFromSelected(selectedA, selectedB),
    },
  });
}

await writeJsonl(path.join(outDir, 'raw', 'quiz_results.jsonl'), sanitizedResults);
await writeJsonl(path.join(outDir, 'raw', 'quiz_events.jsonl'), sanitizedEvents);
await writeJsonl(path.join(outDir, 'raw', 'pair_sessions.jsonl'), sanitizedPairSessions);
await writeJsonl(path.join(outDir, 'raw', 'pair_participants.jsonl'), sanitizedPairParticipants);
await writeJsonl(path.join(outDir, 'raw', 'pair_comparisons.jsonl'), pairComparisons);
await fs.writeFile(path.join(outDir, 'raw', 'quiz_results.json'), JSON.stringify(sanitizedResults, null, 2));
await fs.writeFile(path.join(outDir, 'raw', 'quiz_events.json'), JSON.stringify(sanitizedEvents, null, 2));
await fs.writeFile(path.join(outDir, 'raw', 'pair_sessions.json'), JSON.stringify(sanitizedPairSessions, null, 2));
await fs.writeFile(path.join(outDir, 'raw', 'pair_participants.json'), JSON.stringify(sanitizedPairParticipants, null, 2));
await fs.writeFile(path.join(outDir, 'raw', 'pair_comparisons.json'), JSON.stringify(pairComparisons, null, 2));

function buildAnswerMatrix(resultsForMatrix, answersKey = 'answers') {
  return resultsForMatrix.map((result) => {
    const selected = {};
    const labels = {};
    const responseTimes = {};
    for (const answer of answerRowsFromPayload(result[answersKey])) {
      selected[answer.questionId] = answer.answerId;
      labels[answer.questionId] = answer.answerLabel;
      responseTimes[answer.questionId] = answer.responseTimeMs;
    }
    return {
      resultId: result.resultId,
      sessionId: result.sessionId,
      pairId: result.pairId,
      participantId: result.participantId,
      participantRole: result.participantRole,
      createdAt: result.createdAt,
      resultType: result.resultType,
      experimentLabel: result.experimentLabel,
      rawScores: result.rawScores,
      lensScores: result.lensScores,
      legacyScores: result.legacyScores,
      selected,
      labels,
      responseTimes,
    };
  });
}

function buildQuestionCounts(resultsForCounts, answersKey = 'answers') {
  const counts = new Map();
  for (const result of resultsForCounts) {
    for (const answer of answerRowsFromPayload(result[answersKey])) {
      if (!answer.questionId) continue;
      const key = `${answer.questionId}\t${answer.answerId}`;
      const current = counts.get(key) ?? {
        questionId: answer.questionId,
        prompt: answer.prompt ?? answer.questionId,
        answerId: answer.answerId,
        answerLabel: answer.answerLabel,
        count: 0,
        scores: answer.scores,
      };
      current.count += 1;
      counts.set(key, current);
    }
  }
  return [...counts.values()].sort((a, b) => a.questionId.localeCompare(b.questionId) || b.count - a.count || String(a.answerId).localeCompare(String(b.answerId)));
}

const answerMatrix = buildAnswerMatrix(soloResults);
const questionAnswerCounts = buildQuestionCounts(soloResults);
const pairAnswerMatrix = buildAnswerMatrix(pairResults, 'pairAnswers');
const pairQuestionAnswerCounts = buildQuestionCounts(pairResults, 'pairAnswers');

const bySession = new Map();
for (const event of soloEvents) {
  if (!event.sessionId) continue;
  const current = bySession.get(event.sessionId) ?? {
    sessionId: event.sessionId,
    firstSeenAt: event.createdAt,
    lastSeenAt: event.createdAt,
    events: [],
    started: false,
    completed: false,
    abandoned: false,
    resultId: null,
  };
  current.firstSeenAt = current.firstSeenAt < event.createdAt ? current.firstSeenAt : event.createdAt;
  current.lastSeenAt = current.lastSeenAt > event.createdAt ? current.lastSeenAt : event.createdAt;
  current.events.push(event);
  current.started ||= event.eventType === 'start';
  current.completed ||= event.eventType === 'complete';
  current.abandoned ||= event.eventType === 'abandon';
  current.resultId ||= event.resultId;
  bySession.set(event.sessionId, current);
}
for (const result of soloResults) {
  if (!result.sessionId) continue;
  const current = bySession.get(result.sessionId) ?? {
    sessionId: result.sessionId,
    firstSeenAt: result.createdAt,
    lastSeenAt: result.createdAt,
    events: [],
    started: false,
    completed: false,
    abandoned: false,
    resultId: result.resultId,
  };
  current.result = result;
  current.completed ||= true;
  current.resultId ||= result.resultId;
  bySession.set(result.sessionId, current);
}

const sessions = [...bySession.values()].sort((a, b) => String(a.firstSeenAt).localeCompare(String(b.firstSeenAt)));

const dimensionKeys = ['objectDetail', 'sceneGist', 'visualFeatures', 'spatialStructure', 'verbalNarrative', 'imageryVividness'];
const dimensionSummary = Object.fromEntries(dimensionKeys.map((key) => [key, { values: [], sum: 0, mean: 0, min: null, max: null }]));
for (const result of soloResults) {
  const scores = result.rawScores ?? {};
  for (const key of dimensionKeys) {
    const value = Number(scores[key] ?? 0);
    const bucket = dimensionSummary[key];
    bucket.values.push(value);
    bucket.sum += value;
    bucket.min = bucket.min === null ? value : Math.min(bucket.min, value);
    bucket.max = bucket.max === null ? value : Math.max(bucket.max, value);
  }
}
for (const key of dimensionKeys) {
  const bucket = dimensionSummary[key];
  bucket.mean = bucket.values.length ? bucket.sum / bucket.values.length : 0;
  delete bucket.values;
}

const resultTypeCounts = {};
for (const result of soloResults) resultTypeCounts[result.resultType] = (resultTypeCounts[result.resultType] ?? 0) + 1;

const eventCounts = {};
for (const event of sanitizedEvents) eventCounts[event.eventType] = (eventCounts[event.eventType] ?? 0) + 1;

const pairPatternCounts = {};
for (const row of pairComparisons) {
  for (const pattern of row.comparison.patterns) pairPatternCounts[pattern] = (pairPatternCounts[pattern] ?? 0) + 1;
}

const pairSessionDetails = sanitizedPairSessions.map((session) => {
  const participants = participantsByPair.get(session.pairId) ?? [];
  const completedCount = participants.filter((participant) => participant.completedAt).length;
  return {
    ...session,
    participantCount: participants.length,
    hasPartnerB: participants.some((participant) => participant.role === 'partner_b'),
    completedCount,
    isComplete: session.status === 'complete' || completedCount >= 2,
  };
});

const pairFunnel = {
  pairSessions: sanitizedPairSessions.length,
  pairCreatedEvents: pairEvents.filter((event) => event.eventType === 'pair_created').length,
  inviteOpenedEvents: pairEvents.filter((event) => event.eventType === 'invite_opened').length,
  pairJoinedEvents: pairEvents.filter((event) => event.eventType === 'pair_joined').length,
  pairsWithPartnerBJoined: pairSessionDetails.filter((session) => session.hasPartnerB).length,
  oneCompletePairs: pairSessionDetails.filter((session) => session.completedCount === 1 || session.status === 'one_complete').length,
  completePairs: pairSessionDetails.filter((session) => session.isComplete).length,
  deletedPairs: pairSessionDetails.filter((session) => session.status === 'deleted').length,
  expiredPairs: pairSessionDetails.filter((session) => session.status === 'expired').length,
  participantAbandonmentByRole: ['partner_a', 'partner_b', 'unknown'].map((role) => {
    const roleEvents = pairEvents.filter((event) => (event.participantRole ?? 'unknown') === role);
    const started = roleEvents.filter((event) => event.eventType === 'pair_started' || event.eventType === 'start').length;
    const abandoned = roleEvents.filter((event) => event.eventType === 'abandon').length;
    const completed = roleEvents.filter((event) => event.eventType === 'pair_completed' || event.eventType === 'complete').length;
    return { role, started, abandoned, completed, abandonmentRate: started ? abandoned / started : 0 };
  }).filter((row) => row.started || row.abandoned || row.completed),
};

const topAnswers = questionAnswerCounts
  .reduce((acc, row) => {
    acc[row.questionId] ??= [];
    acc[row.questionId].push(row);
    return acc;
  }, {});

const manifest = {
  dataset: 'visual-person-quiz-agent-review',
  exportedAt: new Date().toISOString(),
  source: 'Neon Postgres DATABASE_URL from environment/local Vercel env file',
  privacy: {
    userAgentOmitted: true,
    inviteTokenOmitted: true,
    resultIdsHashed: true,
    sessionIdsHashed: true,
    eventIdsHashed: true,
    pairIdsHashed: true,
    participantIdsHashed: true,
    hashSaltStored: false,
  },
  counts: {
    results: sanitizedResults.length,
    soloResults: soloResults.length,
    pairParticipantResults: pairResults.length,
    events: sanitizedEvents.length,
    sessions: sessions.length,
    completedSessions: sessions.filter((s) => s.completed).length,
    abandonedWithoutCompletion: sessions.filter((s) => s.abandoned && !s.completed).length,
    pairSessions: pairFunnel.pairSessions,
    pairsWithPartnerBJoined: pairFunnel.pairsWithPartnerBJoined,
    completePairs: pairFunnel.completePairs,
    oneCompletePairs: pairFunnel.oneCompletePairs,
    deletedPairs: pairFunnel.deletedPairs,
    expiredPairs: pairFunnel.expiredPairs,
  },
  files: {
    rawResultsJsonl: 'raw/quiz_results.jsonl',
    rawEventsJsonl: 'raw/quiz_events.jsonl',
    rawPairSessionsJsonl: 'raw/pair_sessions.jsonl',
    rawPairParticipantsJsonl: 'raw/pair_participants.jsonl',
    rawPairComparisonsJsonl: 'raw/pair_comparisons.jsonl',
    answerMatrix: 'derived/answer_matrix.json',
    questionAnswerCounts: 'derived/question_answer_counts.json',
    sessions: 'derived/sessions.json',
    dimensionSummary: 'derived/dimension_summary.json',
    pairSessions: 'derived/pair_sessions.json',
    pairFunnel: 'derived/pair_funnel.json',
    pairAnswerMatrix: 'derived/pair_answer_matrix.json',
    pairPatternCounts: 'derived/pair_pattern_counts.json',
    pairQuestionAnswerCounts: 'derived/pair_question_answer_counts.json',
    discoveryBrief: 'discovery_brief.md',
  },
};

await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'answer_matrix.json'), JSON.stringify(answerMatrix, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'question_answer_counts.json'), JSON.stringify(questionAnswerCounts, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'sessions.json'), JSON.stringify(sessions, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'dimension_summary.json'), JSON.stringify(dimensionSummary, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'pair_sessions.json'), JSON.stringify(pairSessionDetails, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'pair_funnel.json'), JSON.stringify(pairFunnel, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'pair_answer_matrix.json'), JSON.stringify(pairAnswerMatrix, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'pair_pattern_counts.json'), JSON.stringify(pairPatternCounts, null, 2));
await fs.writeFile(path.join(outDir, 'derived', 'pair_question_answer_counts.json'), JSON.stringify(pairQuestionAnswerCounts, null, 2));

const brief = `# Visual Person Quiz — Agent Discovery Export\n\nExported: ${manifest.exportedAt}\n\n## Purpose\n\nLocal, agent-readable export of quiz results for discovery, review, and hypothesis generation. This is not a clinical dataset. Treat it as a tiny early behavioral/preference signal.\n\n## Privacy / Safety\n\n- User agents omitted.\n- Result IDs, event IDs, session IDs, pair IDs, and participant IDs are hashed per export.\n- Invite tokens are omitted.\n- Do not commit raw exports publicly without review.\n- Do not overfit or make population claims from this small sample.\n\n## Counts\n\n- Results: ${manifest.counts.results}\n- Solo results: ${manifest.counts.soloResults}\n- Pair participant results: ${manifest.counts.pairParticipantResults}\n- Events: ${manifest.counts.events}\n- Solo sessions: ${manifest.counts.sessions}\n- Completed solo sessions: ${manifest.counts.completedSessions}\n- Abandoned solo sessions without completion: ${manifest.counts.abandonedWithoutCompletion}\n- Pair sessions: ${manifest.counts.pairSessions}\n- Pairs with Partner B joined: ${manifest.counts.pairsWithPartnerBJoined}\n- One-complete pairs: ${manifest.counts.oneCompletePairs}\n- Complete pairs: ${manifest.counts.completePairs}\n- Deleted pairs: ${manifest.counts.deletedPairs}\n- Expired pairs: ${manifest.counts.expiredPairs}\n\n## Solo Result Types\n\n${Object.entries(resultTypeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- none'}\n\n## Event Counts\n\n${Object.entries(eventCounts).sort().map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- none'}\n\n## Pair Pattern Counts\n\n${Object.entries(pairPatternCounts).sort().map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- none'}\n\n## Solo Dimension Summary\n\n${Object.entries(dimensionSummary).map(([key, value]) => `- ${key}: mean ${value.mean.toFixed(2)}, min ${value.min}, max ${value.max}`).join('\n')}\n\n## Top Solo Answer Counts by Question\n\n${Object.entries(topAnswers).map(([questionId, rows]) => {
  const prompt = rows[0]?.prompt ?? questionId;
  return `### ${questionId}\n\n${prompt}\n\n${rows.map((r) => `- ${r.answerId}: ${r.count} — ${r.answerLabel}`).join('\n')}`;
}).join('\n\n') || '- none'}\n\n## Discovery Prompts for Reviewing Agents\n\n1. Look for visual/spatial dominance vs mixed verbal/semantic anchoring in solo rows only.\n2. Keep paired communication-lens rows separate from solo Model B aggregate metrics.\n3. Specifically test whether “named list with short labels” behaves like a verbal anchor signal rather than a pure verbal-thinking signal.\n4. Separate vividness, spatial route preference, object detail, scene gist, and verbal narrative; do not collapse them into visual vs words too early.\n5. Treat self-report as weak evidence. Prefer task-style items and response-time patterns when available.\n6. Generate falsifiable hypotheses, not flattering interpretations.\n7. For pair rows, analyze pattern IDs and selected options; do not infer compatibility or diagnoses.\n\n## Candidate Hypotheses to Falsify\n\n- H1: High imagery-vividness respondents still choose verbal/semantic anchors for delayed recall tasks.\n- H2: Spatial-route preference and verbal-label preference are not mutually exclusive; mixed strategies may dominate.\n- H3: “A horse” first-response may indicate object/category labeling, not low visual cognition.\n- H4: Current result labels may hide meaningful subtypes: vivid image, spatial mapper, scene-gist, object-detail, verbal narrator, hybrid anchorer.\n- H5: Response times may expose confidence/automaticity differences between visual and verbal tasks.\n`;

await fs.writeFile(path.join(outDir, 'discovery_brief.md'), brief);
await fs.writeFile(path.join(exportRoot, 'LATEST'), outDir + '\n');

console.log(JSON.stringify({ outDir, manifest }, null, 2));
