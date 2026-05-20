'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { submitQuiz } from '@/app/actions';
import { activeModel, alternateAnswerId, alternateAnswerLabel, scoringVersion, type Question } from '@/lib/questions';
import { assignExperimentArm, type ExperimentAssignment } from '@/lib/experiments';

type ClientMeta = {
  sessionId: string;
  assignment: ExperimentAssignment;
};

const assignmentStorageKey = 'visual-person-quiz:experiment-assignment:v2';
const sessionStorageKey = 'visual-person-quiz:session-id:v2';

function randomId(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `${prefix}_${randomUuid}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function makeClientAssignment(): ExperimentAssignment {
  return assignExperimentArm(Math.random(), 'client-random-v1');
}

function readOrCreateClientMeta(): ClientMeta {
  const fallback = {
    sessionId: randomId('quiz'),
    assignment: makeClientAssignment(),
  };

  if (typeof window === 'undefined') return fallback;

  let sessionId = window.sessionStorage.getItem(sessionStorageKey);
  if (!sessionId) {
    sessionId = fallback.sessionId;
    window.sessionStorage.setItem(sessionStorageKey, sessionId);
  }

  const storedAssignment = window.localStorage.getItem(assignmentStorageKey);
  if (storedAssignment) {
    try {
      const parsed = JSON.parse(storedAssignment) as ExperimentAssignment;
      if (parsed.name && parsed.arm && parsed.label) {
        return { sessionId, assignment: parsed };
      }
    } catch {
      window.localStorage.removeItem(assignmentStorageKey);
    }
  }

  window.localStorage.setItem(assignmentStorageKey, JSON.stringify(fallback.assignment));
  return { sessionId, assignment: fallback.assignment };
}

function sendQuizEvent(payload: Record<string, unknown>, preferBeacon = false) {
  const body = JSON.stringify(payload);

  if (preferBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/quiz-events', blob);
    return;
  }

  void fetch('/api/quiz-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: preferBeacon,
  }).catch(() => {
    // Non-critical analytics only.
  });
}

export default function QuizForm({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [alternateAnswers, setAlternateAnswers] = useState<Record<string, string>>({});
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [clientMeta, setClientMeta] = useState<ClientMeta>(() => readOrCreateClientMeta());
  const startedAt = useRef<Record<string, number>>({});
  const answersRef = useRef(answers);
  const answeredCountRef = useRef(0);
  const quizStartedRef = useRef(false);
  const completedRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === questions.length;
  const canSubmit = isComplete && privacyAcknowledged && !isPending;
  const progress = useMemo(() => Math.round((answeredCount / questions.length) * 100), [answeredCount, questions.length]);

  useEffect(() => {
    setClientMeta(readOrCreateClientMeta());
  }, []);

  useEffect(() => {
    answersRef.current = answers;
    answeredCountRef.current = Object.keys(answers).length;
  }, [answers]);

  useEffect(() => {
    function handlePageHide() {
      if (!quizStartedRef.current || completedRef.current || answeredCountRef.current >= questions.length) return;
      sendQuizEvent({
        eventType: 'abandon',
        sessionId: clientMeta.sessionId,
        experimentLabel: clientMeta.assignment.label,
        model: activeModel,
        scoringVersion,
        answeredCount: answeredCountRef.current,
        totalQuestions: questions.length,
      }, true);
    }

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [clientMeta.assignment.label, clientMeta.sessionId, questions.length]);

  function trackStart(questionId?: string) {
    if (quizStartedRef.current) return;
    quizStartedRef.current = true;
    sendQuizEvent({
      eventType: 'start',
      sessionId: clientMeta.sessionId,
      experimentLabel: clientMeta.assignment.label,
      model: activeModel,
      scoringVersion,
      questionId,
      answeredCount: answeredCountRef.current,
      totalQuestions: questions.length,
    });
  }

  function markSeen(questionId: string) {
    trackStart(questionId);
    if (!startedAt.current[questionId]) {
      startedAt.current[questionId] = performance.now();
    }
  }

  function choose(questionId: string, optionId: string) {
    trackStart(questionId);
    const start = startedAt.current[questionId] || performance.now();
    setAnswers((current) => {
      const next = { ...current, [questionId]: optionId };
      answersRef.current = next;
      answeredCountRef.current = Object.keys(next).length;
      return next;
    });
    setResponseTimes((current) => ({ ...current, [questionId]: Math.round(performance.now() - start) }));
    if (optionId !== alternateAnswerId) {
      setAlternateAnswers((current) => {
        if (!(questionId in current)) return current;
        const next = { ...current };
        delete next[questionId];
        return next;
      });
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        completedRef.current = true;
        startTransition(() => submitQuiz({
          answers,
          alternateAnswers,
          responseTimes,
          experimentLabel: clientMeta.assignment.label,
          sessionId: clientMeta.sessionId,
          // canSubmit already requires acknowledgement; send a stable literal to avoid
          // a stale client-state race causing a server-action 500.
          privacyAcknowledged: true,
        }));
      }}
    >
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
          <legend className="mb-4 text-lg font-extrabold text-ink">
            <span className="text-slate-400">{index + 1}. </span>{question.prompt}
          </legend>
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
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    selected ? 'border-visual bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white active:scale-[0.99]'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={selected}
                    onChange={() => choose(question.id, option.id)}
                    className="mt-1 h-5 w-5 accent-visual"
                  />
                  <span className="text-base font-semibold leading-6 text-ink">{option.label}</span>
                </label>
              );
            })}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                answers[question.id] === alternateAnswerId ? 'border-visual bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white active:scale-[0.99]'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={alternateAnswerId}
                checked={answers[question.id] === alternateAnswerId}
                onChange={() => choose(question.id, alternateAnswerId)}
                className="mt-1 h-5 w-5 accent-visual"
              />
              <span className="text-base font-semibold leading-6 text-ink">{alternateAnswerLabel}</span>
            </label>
            {answers[question.id] === alternateAnswerId ? (
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <label className="text-sm font-bold text-ink" htmlFor={`${question.id}-alternate`}>Optional: write your alternate answer</label>
                <textarea
                  id={`${question.id}-alternate`}
                  value={alternateAnswers[question.id] ?? ''}
                  onChange={(event) => setAlternateAnswers((current) => ({ ...current, [question.id]: event.target.value.slice(0, 500) }))}
                  rows={3}
                  maxLength={500}
                  placeholder="If this choice is close but not exact, say how you’d put it. Avoid names or private details."
                  className="mt-2 w-full rounded-2xl border border-violet-100 bg-white p-3 text-sm leading-6 text-ink outline-none ring-0 focus:border-visual"
                />
                <p className="mt-2 text-xs leading-5 text-slate-600">This note is stored for context/research and does not affect scoring.</p>
              </div>
            ) : null}
          </div>
        </fieldset>
      ))}

      <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-ink">Before you submit: data use and privacy</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          This prototype stores your selected answers, per-question response times, anonymous session ID, experiment assignment, browser user-agent, and generated profile so the questionnaire can be improved. It does not ask for your name, email, or login. Do not submit if you are not comfortable with that use.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-ink ring-1 ring-teal-100">
          <input
            type="checkbox"
            checked={privacyAcknowledged}
            onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
            className="mt-1 h-5 w-5 accent-words"
          />
          <span>I understand the data-use note and want to submit my answers.</span>
        </label>
      </section>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mb-8 rounded-2xl bg-ink px-5 py-4 text-lg font-black text-white shadow-lg transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isPending ? 'Saving…' : !isComplete ? 'Answer all questions' : !privacyAcknowledged ? 'Review the data-use note' : 'See my response profile'}
      </button>
    </form>
  );
}
