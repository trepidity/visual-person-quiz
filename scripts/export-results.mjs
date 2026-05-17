import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const sql = neon(databaseUrl);

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function rawScore(row, key) {
  const scores = row.raw_scores ?? row.answers?.rawScores ?? {};
  return scores[key] ?? '';
}

const rows = await sql`
  select id, created_at, model, scoring_version, experiment_label, result_type,
         visual_pct, words_pct, raw_scores, answers
  from quiz_results
  order by created_at desc
`;

const headers = [
  'id',
  'created_at',
  'model',
  'scoring_version',
  'experiment_label',
  'result_type',
  'visual_pct',
  'words_pct',
  'object_detail',
  'scene_gist',
  'visual_features',
  'spatial_structure',
  'verbal_narrative',
  'imagery_vividness',
];

console.log(headers.join(','));
for (const row of rows) {
  const values = [
    row.id,
    row.created_at,
    row.model,
    row.scoring_version,
    row.experiment_label,
    row.result_type,
    row.visual_pct,
    row.words_pct,
    rawScore(row, 'objectDetail'),
    rawScore(row, 'sceneGist'),
    rawScore(row, 'visualFeatures'),
    rawScore(row, 'spatialStructure'),
    rawScore(row, 'verbalNarrative'),
    rawScore(row, 'imageryVividness'),
  ];
  console.log(values.map(csvCell).join(','));
}
