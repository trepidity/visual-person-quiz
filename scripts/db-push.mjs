import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required. Copy .env.example to .env.local or set it in your host.');
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`
  create table if not exists quiz_results (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    model text not null,
    visual_score integer not null,
    words_score integer not null,
    detail_score integer not null default 0,
    result_type text not null,
    visual_pct integer not null,
    words_pct integer not null,
    answers jsonb not null,
    user_agent text,
    experiment_label text
  )
`;

await sql`alter table quiz_results add column if not exists scoring_version text`;
await sql`alter table quiz_results add column if not exists raw_scores jsonb`;
await sql`alter table quiz_results add column if not exists response_times jsonb`;
await sql`alter table quiz_results add column if not exists session_id text`;

await sql`
  create table if not exists quiz_events (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    event_type text not null,
    session_id text,
    experiment_label text,
    model text,
    scoring_version text,
    question_id text,
    answer_id text,
    answered_count integer,
    total_questions integer,
    result_id uuid,
    metadata jsonb not null default '{}'::jsonb
  )
`;

await sql`create index if not exists quiz_results_created_at_idx on quiz_results(created_at desc)`;
await sql`create index if not exists quiz_results_model_idx on quiz_results(model)`;
await sql`create index if not exists quiz_results_result_type_idx on quiz_results(result_type)`;
await sql`create index if not exists quiz_results_experiment_label_idx on quiz_results(experiment_label)`;
await sql`create index if not exists quiz_results_session_id_idx on quiz_results(session_id)`;

await sql`create index if not exists quiz_events_created_at_idx on quiz_events(created_at desc)`;
await sql`create index if not exists quiz_events_event_type_idx on quiz_events(event_type)`;
await sql`create index if not exists quiz_events_session_id_idx on quiz_events(session_id)`;
await sql`create index if not exists quiz_events_experiment_label_idx on quiz_events(experiment_label)`;

console.log('Database schema is ready.');
