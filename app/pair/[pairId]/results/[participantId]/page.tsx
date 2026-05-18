import { notFound, redirect } from 'next/navigation';
import DeletePairButton from '@/components/DeletePairButton';
import { getSql } from '@/lib/db';
import { SAFETY_DISCLAIMER } from '@/lib/couples-copy';
import { recordQuizEvent } from '@/lib/quiz-events';
import { activeCouplesModel, couplesScoringVersion, type ParticipantRole } from '@/lib/couples-questions';
import { comparePairProfiles, type EnrichedCouplesAnswer, type ParticipantLensProfile } from '@/lib/couples-scoring';

function answersFromRow(row: { pair_answers?: unknown; answers?: unknown }): EnrichedCouplesAnswer[] {
  if (Array.isArray(row.pair_answers)) return row.pair_answers as EnrichedCouplesAnswer[];
  const payload = row.answers as { answers?: unknown } | null;
  if (payload && Array.isArray(payload.answers)) return payload.answers as EnrichedCouplesAnswer[];
  return [];
}

function profileFromRow(row: { lens_profile?: unknown; answers?: unknown }): ParticipantLensProfile {
  if (row.lens_profile && typeof row.lens_profile === 'object') return row.lens_profile as ParticipantLensProfile;
  const payload = row.answers as { profile?: unknown } | null;
  return payload?.profile as ParticipantLensProfile;
}

export default async function PairResultsPage({ params }: { params: Promise<{ pairId: string; participantId: string }> }) {
  const { pairId, participantId } = await params;
  const sql = getSql();
  const participants = await sql`
    select pp.id, pp.role, pp.completed_at, ps.deleted_at, ps.expires_at
    from pair_participants pp
    join pair_sessions ps on ps.id = pp.pair_id
    where pp.pair_id = ${pairId}
    order by pp.role asc
  `;
  const current = participants.find((row) => row.id === participantId);
  if (!current || current.deleted_at || new Date(current.expires_at) < new Date()) notFound();

  const partnerA = participants.find((row) => row.role === 'partner_a');
  const partnerB = participants.find((row) => row.role === 'partner_b');
  if (!partnerA?.completed_at || !partnerB?.completed_at) redirect(`/pair/${pairId}/waiting/${participantId}`);

  const rows = await sql`
    select id, participant_id, participant_role, lens_profile, pair_answers, answers
    from quiz_results
    where pair_id = ${pairId} and flow_type = 'pair' and participant_role in ('partner_a', 'partner_b')
    order by participant_role asc, created_at desc
  `;
  const resultA = rows.find((row) => row.participant_role === 'partner_a');
  const resultB = rows.find((row) => row.participant_role === 'partner_b');
  if (!resultA || !resultB) redirect(`/pair/${pairId}/waiting/${participantId}`);

  const answersA = answersFromRow(resultA);
  const answersB = answersFromRow(resultB);
  const report = comparePairProfiles({
    pairId,
    participants: [
      { role: 'partner_a', profile: profileFromRow(resultA), answers: answersA },
      { role: 'partner_b', profile: profileFromRow(resultB), answers: answersB },
    ],
  });

  await recordQuizEvent({
    eventType: 'pair_results_viewed',
    flowType: 'pair',
    pairId,
    participantId,
    participantRole: current.role as ParticipantRole,
    model: activeCouplesModel,
    scoringVersion: couplesScoringVersion,
  }).catch(() => {});

  const answerMapB = new Map(answersB.map((answer) => [answer.questionId, answer]));
  const roleLine = current.role === 'partner_a' ? 'You = Partner A. Your partner = Partner B.' : 'You = Partner B. Your partner = Partner A.';

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6">
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Couples lens report</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">Here is how each of you entered the same prompts in this round.</h1>
          <p className="mt-4 text-base leading-7 text-slate-200">{roleLine}</p>
        </div>

        <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm leading-6 text-slate-700 shadow-sm">
          <p>{SAFETY_DISCLAIMER}</p>
          <p className="mt-2">{report.frame}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Side-by-side answers</h2>
          <div className="mt-4 grid gap-4">
            {answersA.map((answerA) => {
              const answerB = answerMapB.get(answerA.questionId);
              if (!answerB) return null;
              return (
                <div key={answerA.questionId} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">{answerA.prompt}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <p className="text-xs font-bold text-slate-500">Partner A</p>
                      <p className="mt-1 font-semibold text-ink">{answerA.answerLabel}</p>
                      {answerA.freeformText ? <p className="mt-2 text-sm leading-6 text-slate-700">“{answerA.freeformText}”</p> : null}
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <p className="text-xs font-bold text-slate-500">Partner B</p>
                      <p className="mt-1 font-semibold text-ink">{answerB.answerLabel}</p>
                      {answerB.freeformText ? <p className="mt-2 text-sm leading-6 text-slate-700">“{answerB.freeformText}”</p> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Shared ground</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {report.sharedGround.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Where wires crossed in this round</h2>
          <div className="mt-4 grid gap-4">
            {report.differences.map((difference) => (
              <article key={difference.pattern} className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-lg font-extrabold text-ink">{difference.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{difference.body}</p>
                {difference.evidence.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {difference.evidence.map((item) => <li key={`${difference.pattern}-${item.questionId}`}>Partner A selected “{item.partnerAAnswer}”; Partner B selected “{item.partnerBAnswer}”.</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Assumed-similarity check</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{report.assumedSimilarity.body}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Translation moves</h2>
          <div className="mt-4 grid gap-4">
            {report.translationMoves.map((move) => (
              <article key={move.pattern} className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <p><strong>Partner A:</strong> {move.forPartnerA}</p>
                <p className="mt-2"><strong>Partner B:</strong> {move.forPartnerB}</p>
                <p className="mt-2"><strong>Shared practice:</strong> {move.sharedPractice}</p>
              </article>
            ))}
          </div>
          {report.imageryNote ? <p className="mt-4 rounded-2xl bg-teal-50 p-4 text-sm leading-6 text-slate-700">{report.imageryNote}</p> : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">What this is not</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{report.whatThisIsNot}</p>
        </section>

        <div className="mb-8">
          <DeletePairButton pairId={pairId} participantId={participantId} />
        </div>
      </section>
    </main>
  );
}
