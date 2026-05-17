import { createPairSession } from '@/app/pair-actions';
import { EXPIRY_NOTICE, INDEPENDENT_RESPONSE_REMINDER, SAFETY_DISCLAIMER } from '@/lib/couples-copy';

export default async function PairStartPage({ searchParams }: { searchParams?: Promise<{ deleted?: string }> }) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Couples communication lens</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">See the different handles you each grab first.</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">Same prompts. Private answers. Side-by-side comparison only after both submit.</p>
        </div>

        {params?.deleted ? <div className="rounded-3xl border border-green-200 bg-green-50 p-5 text-sm font-semibold text-green-800">That comparison was deleted.</div> : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">Ground rules</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>{INDEPENDENT_RESPONSE_REMINDER}</li>
            <li>{SAFETY_DISCLAIMER}</li>
            <li>No names, emails, accounts, or relationship-status questions.</li>
            <li>{EXPIRY_NOTICE}</li>
          </ul>
        </section>

        <form action={createPairSession}>
          <button className="w-full rounded-2xl bg-ink px-5 py-4 text-lg font-black text-white shadow-lg transition active:scale-[0.99]">Create private comparison</button>
        </form>
      </section>
    </main>
  );
}
