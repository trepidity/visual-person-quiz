import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Communication lens prototype</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">Two people can look at the same thing and grab different handles.</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">
            Take a solo thinking-style snapshot, or start a private paired comparison that shows how two partners describe the same prompts differently — without labels, diagnosis, or compatibility scoring.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/pair/start" className="rounded-3xl border border-teal-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Couples lens</p>
            <h2 className="mt-2 text-2xl font-black text-ink">Start paired comparison</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">Both partners answer privately. The report appears only after both submit and focuses on translation moves, not scores.</p>
          </Link>

          <Link href="/solo" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Solo snapshot</p>
            <h2 className="mt-2 text-2xl font-black text-ink">Take solo quiz</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">The original experimental response-profile quiz stays available for individual exploration.</p>
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">What this is — and is not</h2>
          <p className="mt-2 text-slate-700">
            This is a relational mirror for selected answers in one round. It is not therapy, diagnosis, or compatibility scoring, and it does not tell either partner what kind of person they are.
          </p>
        </section>
      </section>
    </main>
  );
}
