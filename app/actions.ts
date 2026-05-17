'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { activeModel, classify, questions } from '@/lib/questions';

const schema = z.object({
  answers: z.record(z.string(), z.string()),
  experimentLabel: z.string().optional(),
});

export async function submitQuiz(input: unknown) {
  const parsed = schema.parse(input);
  let visualScore = 0;
  let wordsScore = 0;
  let detailScore = 0;

  const enrichedAnswers = questions.map((q) => {
    const selected = q.options.find((o) => o.id === parsed.answers[q.id]);
    if (selected) {
      visualScore += selected.visualScore;
      wordsScore += selected.wordsScore;
      detailScore += selected.detailScore || 0;
    }
    return {
      questionId: q.id,
      model: q.model,
      prompt: q.prompt,
      answerId: selected?.id || null,
      answerLabel: selected?.label || null,
      visualScore: selected?.visualScore || 0,
      wordsScore: selected?.wordsScore || 0,
      detailScore: selected?.detailScore || 0,
    };
  });

  const result = classify(visualScore, wordsScore);
  const h = await headers();
  const userAgent = h.get('user-agent');

  const rows = await sql`
    insert into quiz_results (
      model, visual_score, words_score, detail_score, result_type,
      visual_pct, words_pct, answers, user_agent, experiment_label
    ) values (
      ${activeModel}, ${visualScore}, ${wordsScore}, ${detailScore}, ${result.type},
      ${result.visualPct}, ${result.wordsPct}, ${JSON.stringify(enrichedAnswers)},
      ${userAgent}, ${parsed.experimentLabel || null}
    )
    returning id
  `;

  redirect(`/results/${rows[0].id}`);
}
