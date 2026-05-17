import QuizForm from '@/components/QuizForm';
import { questions } from '@/lib/questions';

export default function Home() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Visual or words?</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">How does your brain grab meaning first?</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">
            A short questionnaire about whether you think first in images, labels, details, or words. No login. You get your result immediately.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">Why this exists</h2>
          <p className="mt-2 text-slate-700">
            The horse question is the seed: does someone see “a horse,” “a palomino,” a shape/color, or a sentence? Those answers become data we can compare across question models.
          </p>
        </div>

        <QuizForm questions={questions} />
      </section>
    </main>
  );
}
