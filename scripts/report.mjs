import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const sql = neon(databaseUrl);

const [summary] = await sql`
  select
    count(*)::int as total_results,
    min(created_at) as first_result_at,
    max(created_at) as latest_result_at
  from quiz_results
`;

const resultTypes = await sql`
  select result_type, count(*)::int as count
  from quiz_results
  group by result_type
  order by count desc, result_type asc
`;

const experiments = await sql`
  select coalesce(experiment_label, 'unassigned') as experiment_label, count(*)::int as count
  from quiz_results
  group by coalesce(experiment_label, 'unassigned')
  order by count desc, experiment_label asc
`;

let eventCounts = [];
let funnel = [];
try {
  eventCounts = await sql`
    select event_type, count(*)::int as count
    from quiz_events
    group by event_type
    order by event_type asc
  `;

  funnel = await sql`
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
} catch (error) {
  console.error('Could not read quiz_events. Run npm run db:push to add analytics tables.');
}

console.log('\nVisual Person Quiz report');
console.log('========================');
console.log(`Results: ${summary.total_results}`);
console.log(`First result: ${summary.first_result_at ?? 'n/a'}`);
console.log(`Latest result: ${summary.latest_result_at ?? 'n/a'}`);

console.log('\nResult types');
for (const row of resultTypes) {
  console.log(`- ${row.result_type}: ${row.count}`);
}

console.log('\nExperiment assignments');
for (const row of experiments) {
  console.log(`- ${row.experiment_label}: ${row.count}`);
}

if (eventCounts.length) {
  console.log('\nEvent counts');
  for (const row of eventCounts) {
    console.log(`- ${row.event_type}: ${row.count}`);
  }
}

if (funnel.length) {
  const row = funnel[0];
  const completionRate = row.started ? Math.round((row.completed / row.started) * 100) : 0;
  const abandonmentRate = row.started ? Math.round((row.abandoned_without_completion / row.started) * 100) : 0;
  console.log('\nSession funnel');
  console.log(`- Sessions: ${row.sessions}`);
  console.log(`- Started: ${row.started}`);
  console.log(`- Completed: ${row.completed} (${completionRate}%)`);
  console.log(`- Abandoned without completion: ${row.abandoned_without_completion} (${abandonmentRate}%)`);
}
