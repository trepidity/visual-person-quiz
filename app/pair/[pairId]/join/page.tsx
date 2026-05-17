import { notFound } from 'next/navigation';
import { joinPairSession } from '@/app/pair-actions';
import InviteOpenedTracker from '@/components/InviteOpenedTracker';
import { getSql } from '@/lib/db';
import { INDEPENDENT_RESPONSE_REMINDER, SAFETY_DISCLAIMER } from '@/lib/couples-copy';

export default async function JoinPairPage({ params, searchParams }: { params: Promise<{ pairId: string }>; searchParams: Promise<{ invite?: string }> }) {
  const { pairId } = await params;
  const { invite } = await searchParams;
  if (!invite) notFound();

  const sql = getSql();
  const rows = await sql`
    select ps.id, ps.invite_token, ps.deleted_at, ps.expires_at,
      exists(select 1 from pair_participants pp where pp.pair_id = ps.id and pp.role = 'partner_b') as has_partner_b
    from pair_sessions ps
    where ps.id = ${pairId}
    limit 1
  `;
  const pair = rows[0];
  const valid = pair && !pair.deleted_at && new Date(pair.expires_at) > new Date() && pair.invite_token === invite && !pair.has_partner_b;
  if (!valid) {
    return (
      <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-ink">This invite is not available</h1>
          <p className="mt-3 text-slate-700">It may already have been used, deleted, expired, or copied incorrectly. Ask your partner to start a new comparison if needed.</p>
        </section>
      </main>
    );
  }

  const joinAction = joinPairSession.bind(null, { pairId, inviteToken: invite });

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <InviteOpenedTracker pairId={pairId} inviteToken={invite} />
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Partner B invite</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">Join the private comparison.</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">You’ll answer the same prompts privately. Your partner will not see the comparison until both of you submit.</p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">Before you join</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>{INDEPENDENT_RESPONSE_REMINDER}</li>
            <li>{SAFETY_DISCLAIMER}</li>
          </ul>
        </section>

        <form action={joinAction}>
          <button className="w-full rounded-2xl bg-ink px-5 py-4 text-lg font-black text-white shadow-lg transition active:scale-[0.99]">Join privately as Partner B</button>
        </form>
      </section>
    </main>
  );
}
