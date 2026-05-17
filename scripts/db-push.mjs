import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required. Copy .env.example to .env.local or set it in your host.');
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`create extension if not exists pgcrypto`;

await sql`
  create table if not exists quiz_results (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    model text not null,
    visual_score integer,
    words_score integer,
    detail_score integer default 0,
    result_type text not null,
    visual_pct integer,
    words_pct integer,
    answers jsonb not null,
    user_agent text,
    experiment_label text
  )
`;

await sql`alter table quiz_results alter column visual_score drop not null`;
await sql`alter table quiz_results alter column words_score drop not null`;
await sql`alter table quiz_results alter column detail_score drop not null`;
await sql`alter table quiz_results alter column visual_pct drop not null`;
await sql`alter table quiz_results alter column words_pct drop not null`;

await sql`alter table quiz_results add column if not exists scoring_version text`;
await sql`alter table quiz_results add column if not exists raw_scores jsonb`;
await sql`alter table quiz_results add column if not exists response_times jsonb`;
await sql`alter table quiz_results add column if not exists session_id text`;

await sql`
  create table if not exists pair_sessions (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '7 days'),
    deleted_at timestamptz,
    status text not null default 'open',
    invite_token text,
    scoring_version text not null default 'couples-lens-mvp-v1',
    metadata jsonb not null default '{}'::jsonb,
    constraint pair_sessions_status_check check (status in ('open', 'one_complete', 'complete', 'expired', 'deleted'))
  )
`;

await sql`alter table pair_sessions add column if not exists scoring_version text not null default 'couples-lens-mvp-v1'`;
await sql`alter table pair_sessions add column if not exists metadata jsonb not null default '{}'::jsonb`;
await sql`alter table pair_sessions drop column if exists research_opt_in`;
await sql`alter table pair_sessions drop column if exists experiment_label`;
await sql`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'pair_sessions_status_check'
        and conrelid = 'pair_sessions'::regclass
    ) then
      alter table pair_sessions
        add constraint pair_sessions_status_check
        check (status in ('open', 'one_complete', 'complete', 'expired', 'deleted'));
    end if;
  end
  $$
`;

await sql`alter table quiz_results add column if not exists flow_type text not null default 'solo'`;
await sql`alter table quiz_results add column if not exists pair_id uuid`;
await sql`alter table quiz_results add column if not exists participant_id uuid`;
await sql`alter table quiz_results add column if not exists participant_role text`;
await sql`alter table quiz_results add column if not exists deleted_at timestamptz`;
await sql`alter table quiz_results add column if not exists lens_scores jsonb`;
await sql`alter table quiz_results add column if not exists lens_profile jsonb`;
await sql`alter table quiz_results add column if not exists pair_answers jsonb`;

await sql`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'quiz_results_pair_id_fkey'
        and conrelid = 'quiz_results'::regclass
    ) then
      alter table quiz_results
        add constraint quiz_results_pair_id_fkey
        foreign key (pair_id) references pair_sessions(id) on delete set null;
    end if;
  end
  $$
`;
await sql`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'quiz_results_flow_type_check'
        and conrelid = 'quiz_results'::regclass
    ) then
      alter table quiz_results
        add constraint quiz_results_flow_type_check
        check (flow_type in ('solo', 'pair'));
    end if;
  end
  $$
`;
await sql`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'quiz_results_participant_role_check'
        and conrelid = 'quiz_results'::regclass
    ) then
      alter table quiz_results
        add constraint quiz_results_participant_role_check
        check (participant_role is null or participant_role in ('partner_a', 'partner_b'));
    end if;
  end
  $$
`;

await sql`
  create table if not exists pair_participants (
    id uuid primary key default gen_random_uuid(),
    pair_id uuid not null references pair_sessions(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    role text not null,
    display_label text,
    client_session_id text,
    result_id uuid references quiz_results(id) on delete set null,
    completed_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    constraint pair_participants_role_check check (role in ('partner_a', 'partner_b'))
  )
`;
await sql`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'pair_participants_role_check'
        and conrelid = 'pair_participants'::regclass
    ) then
      alter table pair_participants
        add constraint pair_participants_role_check
        check (role in ('partner_a', 'partner_b'));
    end if;
  end
  $$
`;

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
    flow_type text not null default 'solo',
    pair_id uuid,
    participant_id uuid,
    participant_role text,
    metadata jsonb not null default '{}'::jsonb
  )
`;

await sql`alter table quiz_events add column if not exists flow_type text not null default 'solo'`;
await sql`alter table quiz_events add column if not exists pair_id uuid`;
await sql`alter table quiz_events add column if not exists participant_id uuid`;
await sql`alter table quiz_events add column if not exists participant_role text`;
await sql`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'quiz_events_flow_type_check'
        and conrelid = 'quiz_events'::regclass
    ) then
      alter table quiz_events
        add constraint quiz_events_flow_type_check
        check (flow_type in ('solo', 'pair'));
    end if;
  end
  $$
`;
await sql`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint
      where conname = 'quiz_events_participant_role_check'
        and conrelid = 'quiz_events'::regclass
    ) then
      alter table quiz_events
        add constraint quiz_events_participant_role_check
        check (participant_role is null or participant_role in ('partner_a', 'partner_b'));
    end if;
  end
  $$
`;

await sql`create index if not exists quiz_results_created_at_idx on quiz_results(created_at desc)`;
await sql`create index if not exists quiz_results_model_idx on quiz_results(model)`;
await sql`create index if not exists quiz_results_result_type_idx on quiz_results(result_type)`;
await sql`create index if not exists quiz_results_experiment_label_idx on quiz_results(experiment_label)`;
await sql`create index if not exists quiz_results_session_id_idx on quiz_results(session_id)`;
await sql`create index if not exists quiz_results_flow_type_idx on quiz_results(flow_type)`;
await sql`create index if not exists quiz_results_pair_id_idx on quiz_results(pair_id)`;
await sql`create index if not exists quiz_results_participant_id_idx on quiz_results(participant_id)`;
await sql`create index if not exists quiz_results_participant_role_idx on quiz_results(participant_role)`;
await sql`create index if not exists quiz_results_deleted_at_idx on quiz_results(deleted_at)`;
await sql`
  create unique index if not exists quiz_results_pair_participant_unique_idx
  on quiz_results(pair_id, participant_id)
  where flow_type = 'pair' and participant_id is not null
`;

await sql`create index if not exists pair_sessions_created_at_idx on pair_sessions(created_at desc)`;
await sql`create index if not exists pair_sessions_status_idx on pair_sessions(status)`;
await sql`create index if not exists pair_sessions_expires_at_idx on pair_sessions(expires_at)`;
await sql`create unique index if not exists pair_sessions_invite_token_idx on pair_sessions(invite_token) where invite_token is not null`;

await sql`create index if not exists pair_participants_pair_id_idx on pair_participants(pair_id)`;
await sql`create index if not exists pair_participants_result_id_idx on pair_participants(result_id)`;
await sql`create unique index if not exists pair_participants_pair_role_unique_idx on pair_participants(pair_id, role)`;

await sql`create index if not exists quiz_events_created_at_idx on quiz_events(created_at desc)`;
await sql`create index if not exists quiz_events_event_type_idx on quiz_events(event_type)`;
await sql`create index if not exists quiz_events_session_id_idx on quiz_events(session_id)`;
await sql`create index if not exists quiz_events_experiment_label_idx on quiz_events(experiment_label)`;
await sql`create index if not exists quiz_events_flow_type_idx on quiz_events(flow_type)`;
await sql`create index if not exists quiz_events_pair_id_idx on quiz_events(pair_id)`;
await sql`create index if not exists quiz_events_participant_id_idx on quiz_events(participant_id)`;

console.log('Database schema is ready.');
