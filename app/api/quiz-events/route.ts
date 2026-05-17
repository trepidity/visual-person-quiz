import { NextResponse } from 'next/server';
import { quizEventSchema, recordQuizEvent } from '@/lib/quiz-events';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = quizEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid quiz event.' }, { status: 400 });
  }

  try {
    await recordQuizEvent(parsed.data);
  } catch (error) {
    // Analytics should never block the participant experience. Keep the log generic: no payload or secrets.
    console.error('Failed to record quiz event.', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
