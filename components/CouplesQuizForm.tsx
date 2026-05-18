'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { submitPairedQuiz } from '@/app/pair-actions';
import CopyInviteLink from '@/components/CopyInviteLink';
import { couplesQuestions, activeCouplesModel, couplesScoringVersion, type CouplesQuestion, type ParticipantRole } from '@/lib/couples-questions';
import { INDEPENDENT_RESPONSE_REMINDER, SAFETY_DISCLAIMER } from '@/lib/couples-copy';
import { alternateCouplesAnswerId } from '@/lib/couples-scoring';

type Props = {
  pairId: string;
  participantId: string;
  role: ParticipantRole;
  inviteUrl?: string | null;
  questions?: CouplesQuestion[];
};

const sessionKey = 'visual-person-quiz:couples-session-id:v1';

function randomId(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `${prefix}_${randomUuid}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function readSessionId() {
  if (typeof window === 'undefined') return randomId('pair');
  let sessionId = window.sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = randomId('pair');
    window.sessionStorage.setItem(sessionKey, sessionId);
  }
  return sessionId;
}

function sendPairEvent(payload: Record<string, unknown>, preferBeacon = false) {
  const body = JSON.stringify(payload);
  if (preferBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/quiz-events', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/quiz-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: preferBeacon,
  }).catch(() => {});
}

export default function CouplesQuizForm({ pairId, participantId, role, inviteUrl, questions = couplesQuestions }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [alternateAnswers, setAlternateAnswers] = useState<Record<string, string>>({});
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [sessionId, setSessionId] = useState(() => readSessionId());
  const startedAt = useRef<Record<string, number>>({});
  const quizStartedRef = useRef(false);
  const completedRef = useRef(false);
  const answeredCountRef = useRef(0);
  const [isPending, startTransition] = useTransition();
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === questions.length;
  const progress = useMemo(() => Math.round((answeredCount / questions.length) * 100), [answeredCount, questions.length]);
  const canSubmit = isComplete && privacyAcknowledged && !isPending;

  useEffect(() => setSessionId(readSessionId()), []);
  useEffect(() => {
    answeredCountRef.current = Object.keys(answers).length;
  }, [answers]);

  useEffect(() => {
    function handlePageHide() {
      if (!quizStartedRef.current || completedRef.current || answeredCountRef.current >= questions.length) return;
      sendPairEvent({
        eventType: 'abandon',
        flowType: 'pair',
        sessionId,
        model: activeCouplesModel,
        scoringVersion: couplesScoringVersion,
        pairId,
        participantId,
        participantRole: role,
        answeredCount: answeredCountRef.current,
        totalQuestions: questions.length,
      }, true);
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [pairId, participantId, questions.length, role, sessionId]);

  function trackStart(questionId?: string) {
    if (quizStartedRef.current) return;
    quizStartedRef.current = true;
    sendPairEvent({
      eventType: 'pair_started',
      flowType: 'pair',
      sessionId,
      model: activeCouplesModel,
      scoringVersion: couplesScoringVersion,
      pairId,
      participantId,
      participantRole: role,
      questionId,
      answeredCount: answeredCountRef.current,
      totalQuestions: questions.length,
    });
  }

  function markSeen(questionId: string) {
    trackStart(questionId);
    if (!startedAt.current[questionId]) startedAt.current[questionId] = performance.now();
  }

  function choose(questionId: string, optionId: string) {
    trackStart(questionId);
    const start = startedAt.current[questionId] || performance.now();
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
    setResponseTimes((current) => ({ ...current, [questionId]: Math.round(performance.now() - start) }));
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        completedRef.current = true;
        startTransition(() => submitPairedQuiz({ pairId, participantId, answers, alternateAnswers, responseTimes, sessionId, privacyAcknowledged: true }));
      }}
    >
      {role === 'partner_a' && inviteUrl ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-ink">Invite Partner B</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">Send this private link to your partner. Do not answer together; the comparison opens only after both submit.</p>
          <CopyInviteLink inviteUrl={inviteUrl} />
        </section>
      ) : null}

      <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-ink">Private first, compare second</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{INDEPENDENT_RESPONSE_REMINDER}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{SAFETY_DISCLAIMER}</p>
      </section>

      <div className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
          <span>{answeredCount} of {questions.length} answered</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-visual to-words transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {questions.map((question, index) => (
        <fieldset
          key={question.id}
          onMouseEnter={() => markSeen(question.id)}
          onFocus={() => markSeen(question.id)}
          onTouchStart={() => markSeen(question.id)}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <legend className="mb-4 text-lg font-extrabold text-ink"><span className="text-slate-400">{index + 1}. </span>{question.prompt}</legend>
          {question.helper ? <p className="mb-4 text-sm text-slate-600">{question.helper}</p> : null}
          {question.imageUrl ? (
            <div className="mb-4 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
              <Image src={question.imageUrl} alt="A horse standing in a country landscape" width={900} height={520} className="h-auto w-full" priority={index === 0} />
            </div>
          ) : null}
          <div className="grid gap-3">
            {question.options.map((option) => {
              const selected = answers[question.id] === option.id;
              return (
                <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${selected ? 'border-visual bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white active:scale-[0.99]'}`}>
                  <input type="radio" name={question.id} value={option.id} checked={selected} onChange={() => choose(question.id, option.id)} className="mt-1 h-5 w-5 accent-visual" />
                  <span className="text-base font-semibold leading-6 text-ink">{option.label}</span>
                </label>
              );
            })}
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${answers[question.id] === alternateCouplesAnswerId ? 'border-visual bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white active:scale-[0.99]'}`}>
              <input type="radio" name={question.id} value={alternateCouplesAnswerId} checked={answers[question.id] === alternateCouplesAnswerId} onChange={() => choose(question.id, alternateCouplesAnswerId)} className="mt-1 h-5 w-5 accent-visual" />
              <span className="text-base font-semibold leading-6 text-ink">Other / I’d answer differently</span>
            </label>
            {answers[question.id] === alternateCouplesAnswerId ? (
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <label className="text-sm font-bold text-ink" htmlFor={`${question.id}-alternate`}>What would you say instead?</label>
                <textarea
                  id={`${question.id}-alternate`}
                  value={alternateAnswers[question.id] ?? ''}
                  onChange={(event) => setAlternateAnswers((current) => ({ ...current, [question.id]: event.target.value.slice(0, 500) }))}
                  rows={3}
                  maxLength={500}
                  placeholder="Short answer. Avoid names or private details."
                  className="mt-2 w-full rounded-2xl border border-violet-100 bg-white p-3 text-sm leading-6 text-ink outline-none ring-0 focus:border-visual"
                />
                <p className="mt-2 text-xs leading-5 text-slate-600">This free-form note is stored for research/context and does not affect scoring.</p>
              </div>
            ) : null}
          </div>
        </fieldset>
      ))}

      <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-ink">Before you submit</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">This paired prototype stores selected answers, timing, anonymous session IDs, and generated comparison data. It does not ask for names, email, or login.</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-ink ring-1 ring-teal-100">
          <input type="checkbox" checked={privacyAcknowledged} onChange={(event) => setPrivacyAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 accent-words" />
          <span>I understand the data-use note and want to submit my private answers.</span>
        </label>
      </section>

      <button type="submit" disabled={!canSubmit} className="mb-8 rounded-2xl bg-ink px-5 py-4 text-lg font-black text-white shadow-lg transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300">
        {isPending ? 'Saving…' : !isComplete ? 'Answer all questions' : !privacyAcknowledged ? 'Review the data-use note' : 'Submit private answers'}
      </button>
    </form>
  );
}
