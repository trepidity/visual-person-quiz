import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import CouplesQuizForm from '@/components/CouplesQuizForm';
import DeletePairButton from '@/components/DeletePairButton';
import { getSql } from '@/lib/db';
import { couplesQuestions, type ParticipantRole } from '@/lib/couples-questions';

function originFromHeaders(h: Headers) {
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export default async function TakePairPage({ params }: { params: Promise<{ pairId: string; participantId: string }> }) {
  const { pairId, participantId } = await params;
  const sql = getSql();
  const rows = await sql`
    select pp.id, pp.role, pp.completed_at, ps.id as pair_id, ps.invite_token, ps.deleted_at, ps.expires_at
    from pair_participants pp
    join pair_sessions ps on ps.id = pp.pair_id
    where pp.id = ${participantId} and pp.pair_id = ${pairId}
    limit 1
  `;
  const row = rows[0];
  if (!row || row.deleted_at || new Date(row.expires_at) < new Date()) notFound();
  if (row.completed_at) redirect(`/pair/${pairId}/waiting/${participantId}`);

  const h = await headers();
  const inviteUrl = row.role === 'partner_a' && row.invite_token
    ? `${originFromHeaders(h)}/pair/${pairId}/join?invite=${row.invite_token}`
    : null;

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">{row.role === 'partner_a' ? 'Partner A' : 'Partner B'}</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">Answer from your own first reaction.</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">No result is shown until both private answer sets are submitted.</p>
        </div>

        <CouplesQuizForm pairId={pairId} participantId={participantId} role={row.role as ParticipantRole} inviteUrl={inviteUrl} questions={couplesQuestions} />

        <div className="mb-8">
          <DeletePairButton pairId={pairId} participantId={participantId} />
        </div>
      </section>
    </main>
  );
}
