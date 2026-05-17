import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSql } from '@/lib/db';
import type { DimensionScores } from '@/lib/questions';

type Answer = { questionId: string; prompt: string; answerLabel: string | null; construct?: string; responseTimeMs?: number | null };
type Dimension = { key: keyof DimensionScores; label: string; value: number; pct: number };
type StoredAnswers = {
  scoringVersion?: string;
  rawScores?: DimensionScores;
  profile?: { resultType: string; dimensions: Dimension[] };
  answers?: Answer[];
};

type ResultRow = {
  id: string;
  created_at: string;
  model: string;
  result_type: string;
  visual_pct: number;
  words_pct: number;
  answers: StoredAnswers | Answer[];
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getSql();
  const rows = await sql`select * from quiz_results where id = ${id} limit 1`;
  const result = rows[0] as ResultRow | undefined;
  if (!result) notFound();

  const stored = Array.isArray(result.answers) ? { answers: result.answers } : result.answers;
  const dimensions = stored.profile?.dimensions || [
    { key: 'visualFeatures' as const, label: 'Visual leaning', value: result.visual_pct, pct: result.visual_pct },
    { key: 'verbalNarrative' as const, label: 'Words leaning', value: result.words_pct, pct: result.words_pct },
  ];
  const answers = stored.answers || [];

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] bg-ink p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Your response profile</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">{result.result_type}</h1>
          <p className="mt-4 text-slate-200">
            This is an early thinking-style snapshot, not a validated diagnosis. It shows what your answers favored in this version of the questionnaire.
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">Dimension profile</h2>
          <p className="mt-2 text-sm text-slate-600">Higher bars mean your answers leaned more strongly toward that response style.</p>
          <div className="mt-5 grid gap-4">
            {dimensions.map((dimension) => (
              <DimensionBar key={dimension.key} label={dimension.label} value={dimension.value} pct={dimension.pct} />
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">How to read this</h2>
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

        <Link href="/" className="mt-6 block rounded-2xl bg-ink px-5 py-4 text-center text-lg font-black text-white shadow-lg">
          Take it again
        </Link>
      </section>
    </main>
  );
}

function DimensionBar({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="font-bold text-ink">{label}</span>
        <span className="text-sm font-semibold text-slate-500">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-visual to-words" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
