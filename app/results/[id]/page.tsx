import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSql } from '@/lib/db';
import { dimensionInterpretations, type DimensionKey, type DimensionScores, type ProfileTakeaway } from '@/lib/questions';

type Answer = { questionId: string; prompt: string; answerLabel: string | null; construct?: string; responseTimeMs?: number | null };
type Dimension = {
  key: DimensionKey;
  label: string;
  value?: number;
  pct?: number;
  rawValue?: number;
  maxValue?: number;
  normalizedPct?: number;
  sharePct?: number;
};
type StoredProfile = {
  resultType: string;
  dimensions: Dimension[];
  summary?: string;
  takeaways?: ProfileTakeaway[];
  isInconclusive?: boolean;
  gapPct?: number;
  blendThresholdPct?: number;
  confidence?: string;
};
type StoredAnswers = {
  scoringVersion?: string;
  rawScores?: DimensionScores;
  profile?: StoredProfile;
  answers?: Answer[];
};

type ResultRow = {
  id: string;
  created_at: string;
  model: string;
  result_type: string;
  visual_pct: number;
  words_pct: number;
  experiment_label?: string | null;
  answers: StoredAnswers | Answer[];
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getSql();
  const rows = await sql`select * from quiz_results where id = ${id} limit 1`;
  const result = rows[0] as ResultRow | undefined;
  if (!result) notFound();

  const stored = Array.isArray(result.answers) ? { answers: result.answers } : result.answers;
  const profile = stored.profile;
  const dimensions = profile?.dimensions || [
    { key: 'visualFeatures' as const, label: 'Visual leaning', value: result.visual_pct, pct: result.visual_pct, normalizedPct: result.visual_pct },
    { key: 'verbalNarrative' as const, label: 'Words leaning', value: result.words_pct, pct: result.words_pct, normalizedPct: result.words_pct },
  ];
  const answers = stored.answers || [];
  const takeaways = profile?.takeaways?.length ? profile.takeaways : fallbackTakeaways(dimensions);

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] bg-ink p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Your response profile</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">{profile?.resultType || result.result_type}</h1>
          <p className="mt-4 text-slate-200">
            {profile?.summary || 'This is an early thinking-style snapshot, not a validated diagnosis. It shows what your answers favored in this version of the questionnaire.'}
          </p>
          {profile ? (
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em]">
              <span className="rounded-full bg-white/10 px-3 py-2 text-teal-100">Confidence: {profile.confidence || 'prototype'}</span>
              {typeof profile.gapPct === 'number' ? <span className="rounded-full bg-white/10 px-3 py-2 text-teal-100">Top-two gap: {profile.gapPct} pts</span> : null}
              {profile.isInconclusive ? <span className="rounded-full bg-amber-300 px-3 py-2 text-ink">Blended / inconclusive</span> : null}
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">Dimension profile</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Bars show normalized percentages: raw points divided by the maximum available points for that dimension in this item set. This keeps dimensions with more scoring opportunities from looking stronger just because they had more raw points available.
          </p>
          <div className="mt-5 grid gap-4">
            {dimensions.map((dimension) => (
              <DimensionBar key={dimension.key} dimension={dimension} />
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">Practical takeaways</h2>
          <div className="mt-4 grid gap-4">
            {takeaways.map((takeaway) => (
              <article key={takeaway.title} className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-extrabold text-ink">{takeaway.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{takeaway.body}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {takeaway.tryThis.map((item) => <li key={item}>{item}</li>)}
                </ul>
                {takeaway.watchFor ? <p className="mt-3 text-sm font-semibold text-slate-600">Watch for: {takeaway.watchFor}</p> : null}
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">How to read each dimension</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li><strong>Object/detail</strong>: specific labels and concrete visual details, like “palomino.”</li>
            <li><strong>Scene/gist</strong>: the whole setting, atmosphere, or landscape.</li>
            <li><strong>Visual features</strong>: color, shape, movement, and texture.</li>
            <li><strong>Spatial/structure</strong>: layout, maps, routes, and relationships between parts.</li>
            <li><strong>Verbal/narrative</strong>: words, labels, definitions, steps, dialogue, and stories.</li>
            <li><strong>Imagery vividness</strong>: how clearly you report picturing things in your mind.</li>
          </ul>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">Your answers</h2>
          <div className="mt-4 grid gap-3">
            {answers.map((answer) => (
              <div key={answer.questionId} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{answer.prompt}</p>
                <p className="mt-1 font-bold text-ink">{answer.answerLabel}</p>
                {answer.responseTimeMs ? <p className="mt-1 text-xs text-slate-500">Response time: {Math.round(answer.responseTimeMs / 100) / 10}s</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          <h2 className="text-lg font-extrabold text-ink">Prototype note</h2>
          <p className="mt-2">
            This result is exploratory. Close top-two scores are intentionally shown as blended/inconclusive instead of being forced into a single label.
            {result.experiment_label ? <> Experiment assignment: <span className="font-semibold text-ink">{result.experiment_label}</span>.</> : null}
          </p>
        </div>

        <Link href="/" className="mt-6 block rounded-2xl bg-ink px-5 py-4 text-center text-lg font-black text-white shadow-lg">
          Take it again
        </Link>
      </section>
    </main>
  );
}

function normalizedPercent(dimension: Dimension) {
  return Math.max(0, Math.min(100, Math.round(dimension.normalizedPct ?? dimension.pct ?? dimension.value ?? 0)));
}

function fallbackTakeaways(dimensions: Dimension[]): ProfileTakeaway[] {
  const [top, second] = [...dimensions].sort((a, b) => normalizedPercent(b) - normalizedPercent(a));
  const first = top?.key ? dimensionInterpretations[top.key] : null;
  const backup = second?.key ? dimensionInterpretations[second.key] : null;
  return [first, backup].filter(Boolean) as ProfileTakeaway[];
}

function DimensionBar({ dimension }: { dimension: Dimension }) {
  const pct = normalizedPercent(dimension);

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="font-bold text-ink">{dimension.label}</span>
        <span className="text-sm font-semibold text-slate-500">{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200" aria-label={`${dimension.label}: ${pct}% normalized`}>
        <div className="h-full rounded-full bg-gradient-to-r from-visual to-words" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
