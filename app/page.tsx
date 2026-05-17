import QuizForm from '@/components/QuizForm';
import { questions } from '@/lib/questions';

export default function Home() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Thinking-style snapshot</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">How does your brain grab meaning first?</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">
            A short, experimental questionnaire about whether your first response leans toward objects, scenes, visual features, spatial structure, or words. No login. You get your profile immediately.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">What this is — and is not</h2>
          <p className="mt-2 text-slate-700">
            This is not a validated “visual thinker” diagnosis. It is a versioned response-profile prototype. The horse question is the seed: do you notice the object, the specificity, the landscape, the visual features, or the words you would use to describe it?
          </p>
        </div>

        <QuizForm questions={questions} />
      </section>
    </main>
  );
}
