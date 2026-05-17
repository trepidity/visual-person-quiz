import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const sql = neon(databaseUrl);

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

const hasResultsFlowType = await columnExists('quiz_results', 'flow_type');
const hasEvents = await tableExists('quiz_events');
const hasEventsFlowType = hasEvents && await columnExists('quiz_events', 'flow_type');
const hasEventsPairColumns = hasEvents && await columnExists('quiz_events', 'pair_id') && await columnExists('quiz_events', 'participant_role');
const hasPairSessions = await tableExists('pair_sessions');
const hasPairParticipants = await tableExists('pair_participants');

const [summary] = hasResultsFlowType
  ? await sql`
      select
        count(*)::int as total_results,
        count(*) filter (where flow_type = 'solo')::int as solo_results,
        count(*) filter (where flow_type = 'pair')::int as pair_participant_results,
        min(created_at) as first_result_at,
        max(created_at) as latest_result_at
      from quiz_results
    `
  : await sql`
      select
        count(*)::int as total_results,
        count(*)::int as solo_results,
        0::int as pair_participant_results,
        min(created_at) as first_result_at,
        max(created_at) as latest_result_at
      from quiz_results
    `;

const resultTypes = hasResultsFlowType
  ? await sql`
      select result_type, count(*)::int as count
      from quiz_results
      where flow_type = 'solo'
      group by result_type
      order by count desc, result_type asc
    `
  : await sql`
      select result_type, count(*)::int as count
      from quiz_results
      group by result_type
      order by count desc, result_type asc
    `;

const experiments = hasResultsFlowType
  ? await sql`
      select coalesce(experiment_label, 'unassigned') as experiment_label, count(*)::int as count
      from quiz_results
      where flow_type = 'solo'
      group by coalesce(experiment_label, 'unassigned')
      order by count desc, experiment_label asc
    `
  : await sql`
      select coalesce(experiment_label, 'unassigned') as experiment_label, count(*)::int as count
      from quiz_results
      group by coalesce(experiment_label, 'unassigned')
      order by count desc, experiment_label asc
    `;

let eventCounts = [];
let soloFunnel = [];
let pairEventSummary = {
  pair_created: 0,
  invite_opened: 0,
  pair_joined: 0,
  pair_started: 0,
  pair_completed: 0,
  pair_deleted: 0,
};
let pairSessionSummary = {
  pair_sessions: 0,
  pairs_with_partner_b_joined: 0,
  one_complete_pairs: 0,
  complete_pairs: 0,
  expired_pairs: 0,
  deleted_pairs: 0,
};
let pairAbandonmentByRole = [];

if (hasEvents) {
  try {
    eventCounts = await sql`
      select event_type, count(*)::int as count
      from quiz_events
      group by event_type
      order by event_type asc
    `;

    soloFunnel = hasEventsFlowType
      ? await sql`
          with sessions as (
            select
              session_id,
              bool_or(event_type = 'start') as started,
              bool_or(event_type = 'complete') as completed,
              bool_or(event_type = 'abandon') as abandoned
            from quiz_events
            where session_id is not null
              and flow_type = 'solo'
            group by session_id
          )
          select
            count(*)::int as sessions,
            count(*) filter (where started)::int as started,
            count(*) filter (where completed)::int as completed,
            count(*) filter (where abandoned and not completed)::int as abandoned_without_completion
          from sessions
        `
      : await sql`
          with sessions as (
            select
              session_id,
              bool_or(event_type = 'start') as started,
              bool_or(event_type = 'complete') as completed,
              bool_or(event_type = 'abandon') as abandoned
            from quiz_events
            where session_id is not null
            group by session_id
          )
          select
            count(*)::int as sessions,
            count(*) filter (where started)::int as started,
            count(*) filter (where completed)::int as completed,
            count(*) filter (where abandoned and not completed)::int as abandoned_without_completion
          from sessions
        `;

    const [events] = hasEventsPairColumns
      ? await sql`
          select
            count(*) filter (where event_type = 'pair_created')::int as pair_created,
            count(*) filter (where event_type = 'invite_opened')::int as invite_opened,
            count(*) filter (where event_type = 'pair_joined')::int as pair_joined,
            count(*) filter (where event_type in ('pair_started', 'start') and (flow_type = 'pair' or pair_id is not null or metadata->>'flowType' = 'pair'))::int as pair_started,
            count(*) filter (where event_type in ('pair_completed', 'complete') and (flow_type = 'pair' or pair_id is not null or metadata->>'flowType' = 'pair'))::int as pair_completed,
            count(*) filter (where event_type = 'pair_deleted')::int as pair_deleted
          from quiz_events
        `
      : await sql`
          select
            count(*) filter (where event_type = 'pair_created')::int as pair_created,
            count(*) filter (where event_type = 'invite_opened')::int as invite_opened,
            count(*) filter (where event_type = 'pair_joined')::int as pair_joined,
            count(*) filter (where event_type = 'pair_started' or (event_type = 'start' and metadata->>'flowType' = 'pair'))::int as pair_started,
            count(*) filter (where event_type = 'pair_completed' or (event_type = 'complete' and metadata->>'flowType' = 'pair'))::int as pair_completed,
            count(*) filter (where event_type = 'pair_deleted')::int as pair_deleted
          from quiz_events
        `;
    pairEventSummary = events ?? pairEventSummary;

    pairAbandonmentByRole = hasEventsPairColumns
      ? await sql`
          select
            coalesce(participant_role, metadata->>'participantRole', 'unknown') as participant_role,
            count(*) filter (where event_type in ('pair_started', 'start'))::int as started_events,
            count(*) filter (where event_type = 'abandon')::int as abandon_events,
            count(*) filter (where event_type in ('pair_completed', 'complete'))::int as completed_events
          from quiz_events
          where flow_type = 'pair'
             or pair_id is not null
             or metadata->>'flowType' = 'pair'
          group by coalesce(participant_role, metadata->>'participantRole', 'unknown')
          order by participant_role asc
        `
      : await sql`
          select
            coalesce(metadata->>'participantRole', 'unknown') as participant_role,
            count(*) filter (where event_type in ('pair_started', 'start'))::int as started_events,
            count(*) filter (where event_type = 'abandon')::int as abandon_events,
            count(*) filter (where event_type in ('pair_completed', 'complete'))::int as completed_events
          from quiz_events
          where metadata->>'flowType' = 'pair'
          group by coalesce(metadata->>'participantRole', 'unknown')
          order by participant_role asc
        `;
  } catch (error) {
    console.error('Could not read quiz_events. Run npm run db:push to add analytics tables.');
  }
}

if (hasPairSessions && hasPairParticipants) {
  const [pairs] = await sql`
    with pair_rollup as (
      select
        ps.id,
        ps.status,
        count(pp.*) filter (where pp.role = 'partner_b') as partner_b_count,
        count(pp.*) filter (where pp.completed_at is not null) as completed_count
      from pair_sessions ps
      left join pair_participants pp on pp.pair_id = ps.id
      group by ps.id, ps.status
    )
    select
      count(*)::int as pair_sessions,
      count(*) filter (where partner_b_count > 0)::int as pairs_with_partner_b_joined,
      count(*) filter (where completed_count = 1 or status = 'one_complete')::int as one_complete_pairs,
      count(*) filter (where completed_count >= 2 or status = 'complete')::int as complete_pairs,
      count(*) filter (where status = 'expired')::int as expired_pairs,
      count(*) filter (where status = 'deleted')::int as deleted_pairs
    from pair_rollup
  `;
  pairSessionSummary = pairs ?? pairSessionSummary;
}

console.log('\nVisual Person Quiz report');
console.log('========================');
console.log(`Results: ${summary.total_results}`);
console.log(`Solo results: ${summary.solo_results}`);
console.log(`Pair participant results: ${summary.pair_participant_results}`);
console.log(`First result: ${summary.first_result_at ?? 'n/a'}`);
console.log(`Latest result: ${summary.latest_result_at ?? 'n/a'}`);

console.log('\nSolo result types');
for (const row of resultTypes) {
  console.log(`- ${row.result_type}: ${row.count}`);
}

console.log('\nSolo experiment assignments');
for (const row of experiments) {
  console.log(`- ${row.experiment_label}: ${row.count}`);
}

if (eventCounts.length) {
  console.log('\nEvent counts (all flows)');
  for (const row of eventCounts) {
    console.log(`- ${row.event_type}: ${row.count}`);
  }
}

if (soloFunnel.length) {
  const row = soloFunnel[0];
  const completionRate = row.started ? Math.round((row.completed / row.started) * 100) : 0;
  const abandonmentRate = row.started ? Math.round((row.abandoned_without_completion / row.started) * 100) : 0;
  console.log('\nSolo session funnel');
  console.log(`- Sessions: ${row.sessions}`);
  console.log(`- Started: ${row.started}`);
  console.log(`- Completed: ${row.completed} (${completionRate}%)`);
  console.log(`- Abandoned without completion: ${row.abandoned_without_completion} (${abandonmentRate}%)`);
}

const pairCreatedDenominator = pairEventSummary.pair_created || pairSessionSummary.pair_sessions;
const pairJoinedNumerator = pairEventSummary.pair_joined || pairSessionSummary.pairs_with_partner_b_joined;
const joinedPairsDenominator = pairSessionSummary.pairs_with_partner_b_joined;
const inviteConversionRate = pairCreatedDenominator ? Math.round((pairJoinedNumerator / pairCreatedDenominator) * 100) : 0;
const pairCompletionRate = joinedPairsDenominator ? Math.round((pairSessionSummary.complete_pairs / joinedPairsDenominator) * 100) : 0;

console.log('\nPair funnel');
console.log(`- Pair sessions created: ${pairSessionSummary.pair_sessions}`);
console.log(`- Pair created events: ${pairEventSummary.pair_created}`);
console.log(`- Invite opened events: ${pairEventSummary.invite_opened}`);
console.log(`- Pair joined events: ${pairEventSummary.pair_joined}`);
console.log(`- Pair sessions with Partner B joined: ${pairSessionSummary.pairs_with_partner_b_joined}`);
console.log(`- Pair sessions with one completion: ${pairSessionSummary.one_complete_pairs}`);
console.log(`- Pair sessions complete: ${pairSessionSummary.complete_pairs}`);
console.log(`- Pair sessions expired: ${pairSessionSummary.expired_pairs}`);
console.log(`- Pair sessions deleted: ${pairSessionSummary.deleted_pairs}`);
console.log(`- Invite conversion rate: ${inviteConversionRate}%`);
console.log(`- Pair completion rate after Partner B joined: ${pairCompletionRate}%`);

if (pairAbandonmentByRole.length) {
  console.log('\nPair participant abandonment by role');
  for (const row of pairAbandonmentByRole) {
    const rate = row.started_events ? Math.round((row.abandon_events / row.started_events) * 100) : 0;
    console.log(`- ${row.participant_role}: ${row.abandon_events}/${row.started_events} abandoned (${rate}%), ${row.completed_events} completed events`);
  }
}
