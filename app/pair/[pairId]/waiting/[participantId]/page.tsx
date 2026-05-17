import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import CopyInviteLink from '@/components/CopyInviteLink';
import DeletePairButton from '@/components/DeletePairButton';
import { getSql } from '@/lib/db';
import { EXPIRY_NOTICE, SAFETY_DISCLAIMER } from '@/lib/couples-copy';

function originFromHeaders(h: Headers) {
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

function statusText(role: string, currentRole: string, completedAt: string | null, joined: boolean, inviteOpened: boolean) {
  if (completedAt) return 'complete';
  if (role === 'partner_b' && !joined) return inviteOpened && currentRole === 'partner_a' ? 'invite opened, not joined' : 'not joined';
  if (joined) return 'joined, taking quiz';
  return 'waiting';
}

export default async function WaitingPage({ params }: { params: Promise<{ pairId: string; participantId: string }> }) {
  const { pairId, participantId } = await params;
  const sql = getSql();
  const participants = await sql`
    select pp.id, pp.role, pp.completed_at, ps.invite_token, ps.deleted_at, ps.expires_at, ps.status
    from pair_participants pp
    join pair_sessions ps on ps.id = pp.pair_id
    where pp.pair_id = ${pairId}
    order by pp.role asc
  `;
  const current = participants.find((row) => row.id === participantId);
  if (!current || current.deleted_at || new Date(current.expires_at) < new Date()) notFound();
  const partnerA = participants.find((row) => row.role === 'partner_a');
  const partnerB = participants.find((row) => row.role === 'partner_b');
  const bothComplete = Boolean(partnerA?.completed_at && partnerB?.completed_at);
  if (bothComplete) redirect(`/pair/${pairId}/results/${participantId}`);

  const inviteEvents = await sql`
    select count(*)::int as count
    from quiz_events
    where pair_id = ${pairId} and event_type = 'invite_opened'
  `;
  const inviteOpened = (inviteEvents[0]?.count ?? 0) > 0;
  const h = await headers();
  const inviteUrl = current.role === 'partner_a' && current.invite_token
    ? `${originFromHeaders(h)}/pair/${pairId}/join?invite=${current.invite_token}`
    : null;

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Waiting room</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">You’re done. Waiting for the other response.</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">Answers stay hidden until both partners submit.</p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">Progress</h2>
          <dl className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <dt className="font-bold text-ink">Partner A</dt>
              <dd className="text-sm font-semibold text-slate-700">{statusText('partner_a', current.role, partnerA?.completed_at ?? null, Boolean(partnerA), inviteOpened)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <dt className="font-bold text-ink">Partner B</dt>
              <dd className="text-sm font-semibold text-slate-700">{statusText('partner_b', current.role, partnerB?.completed_at ?? null, Boolean(partnerB), inviteOpened)}</dd>
            </div>
          </dl>
        </section>

        {inviteUrl ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-ink">Partner B has not joined yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Share this private invite link. If the wrong person joins, delete this comparison and start a new one.</p>
            <CopyInviteLink inviteUrl={inviteUrl} />
          </section>
        ) : null}

        <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm leading-6 text-slate-700 shadow-sm">
          <p>{SAFETY_DISCLAIMER}</p>
          <p className="mt-2">{EXPIRY_NOTICE}</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href={`/pair/${pairId}/waiting/${participantId}`} className="rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-sm">Refresh status</Link>
          <DeletePairButton pairId={pairId} participantId={participantId} />
        </div>
      </section>
    </main>
  );
}
