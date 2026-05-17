'use client';

import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';
import { submitQuiz } from '@/app/actions';
import type { Question } from '@/lib/questions';

export default function QuizForm({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === questions.length;
  const progress = useMemo(() => Math.round((answeredCount / questions.length) * 100), [answeredCount, questions.length]);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isComplete) return;
        startTransition(() => submitQuiz({ answers, experimentLabel: 'mobile-first-v1' }));
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
        <fieldset key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <legend className="mb-4 text-lg font-extrabold text-ink">
            <span className="text-slate-400">{index + 1}. </span>{question.prompt}
          </legend>
          {question.helper ? <p className="mb-4 text-sm text-slate-600">{question.helper}</p> : null}
          {question.imageUrl ? (
            <div className="mb-4 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
              <Image src={question.imageUrl} alt="Illustration of a golden horse" width={900} height={520} className="h-auto w-full" priority={index === 0} />
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
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                    className="mt-1 h-5 w-5 accent-visual"
                  />
                  <span className="text-base font-semibold leading-6 text-ink">{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <button
        type="submit"
        disabled={!isComplete || isPending}
        className="mb-8 rounded-2xl bg-ink px-5 py-4 text-lg font-black text-white shadow-lg transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isPending ? 'Saving…' : isComplete ? 'See my result' : 'Answer all questions'}
      </button>
    </form>
  );
}
