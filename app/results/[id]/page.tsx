import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSql } from '@/lib/db';

type ResultRow = {
  id: string;
  created_at: string;
  model: string;
  visual_score: number;
  words_score: number;
  detail_score: number;
  result_type: string;
  visual_pct: number;
  words_pct: number;
  answers: Array<{ questionId: string; prompt: string; answerLabel: string | null }>;
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getSql();
  const rows = await sql`select * from quiz_results where id = ${id} limit 1`;
  const result = rows[0] as ResultRow | undefined;
  if (!result) notFound();

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] bg-ink p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Your result</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">{result.result_type}</h1>
          <p className="mt-4 text-slate-200">This is a directional signal, not a diagnosis. It tells us what your answers favored in this model.</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ScoreCard label="Visual" value={result.visual_pct} color="bg-visual" />
          <ScoreCard label="Words" value={result.words_pct} color="bg-words" />
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">What this means</h2>
          <p className="mt-2 text-slate-700">
            Visual-first answers tend to grab scenes, shapes, diagrams, layout, and concrete details first. Words-first answers tend to grab labels, definitions, sequences, dialogue, and verbal explanations first.
          </p>
          <p className="mt-3 text-slate-700">
            Detail score: <strong>{result.detail_score}</strong>. A higher detail score suggests you noticed specificity, like “palomino” instead of “horse.”
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">Your answers</h2>
          <div className="mt-4 grid gap-3">
            {result.answers.map((answer) => (
              <div key={answer.questionId} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{answer.prompt}</p>
                <p className="mt-1 font-bold text-ink">{answer.answerLabel}</p>
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

function ScoreCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-extrabold text-ink">{label}</h2>
        <span className="text-3xl font-black text-ink">{value}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
