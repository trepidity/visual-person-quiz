export type QuestionOption = {
  id: string;
  label: string;
  visualScore: number;
  wordsScore: number;
  detailScore?: number;
};

export type Question = {
  id: string;
  model: 'A' | 'B';
  prompt: string;
  helper?: string;
  kind: 'text' | 'image';
  imageUrl?: string;
  options: QuestionOption[];
};

export const activeModel = 'A' as const;

export const questions: Question[] = [
  {
    id: 'horse-specificity',
    model: 'A',
    kind: 'image',
    prompt: 'When you see this image, what comes to mind first?',
    helper: 'The point is not being right. It is what your brain grabs first.',
    imageUrl: '/horse.svg',
    options: [
      { id: 'horse', label: 'A horse', visualScore: 1, wordsScore: 2, detailScore: 0 },
      { id: 'palomino', label: 'A palomino', visualScore: 3, wordsScore: 0, detailScore: 2 },
      { id: 'color-shape', label: 'Color, shape, movement, or texture', visualScore: 3, wordsScore: 0, detailScore: 1 },
      { id: 'sentence', label: 'A sentence or description about the image', visualScore: 0, wordsScore: 3, detailScore: 0 },
    ],
  },
  {
    id: 'memory-recall',
    model: 'A',
    kind: 'text',
    prompt: 'When you remember yesterday, what appears first?',
    options: [
      { id: 'scene', label: 'A scene or snapshot', visualScore: 3, wordsScore: 0 },
      { id: 'timeline', label: 'A timeline of what happened', visualScore: 1, wordsScore: 2 },
      { id: 'dialogue', label: 'Words people said', visualScore: 0, wordsScore: 3 },
      { id: 'feeling', label: 'A feeling or atmosphere', visualScore: 2, wordsScore: 1 },
    ],
  },
  {
    id: 'directions',
    model: 'A',
    kind: 'text',
    prompt: 'Which directions help you most?',
    options: [
      { id: 'map', label: 'Show me a map or visual route', visualScore: 3, wordsScore: 0 },
      { id: 'landmarks', label: 'Tell me landmarks to look for', visualScore: 2, wordsScore: 1 },
      { id: 'steps', label: 'Give me numbered steps', visualScore: 0, wordsScore: 3 },
      { id: 'both', label: 'Map plus short written steps', visualScore: 2, wordsScore: 2 },
    ],
  },
  {
    id: 'learning',
    model: 'A',
    kind: 'text',
    prompt: 'When learning a new idea, what clicks first?',
    options: [
      { id: 'diagram', label: 'A diagram or sketch', visualScore: 3, wordsScore: 0 },
      { id: 'example', label: 'A concrete example', visualScore: 2, wordsScore: 1 },
      { id: 'definition', label: 'A clear definition', visualScore: 0, wordsScore: 3 },
      { id: 'story', label: 'A story that explains it', visualScore: 1, wordsScore: 2 },
    ],
  },
  {
    id: 'problem-solving',
    model: 'A',
    kind: 'text',
    prompt: 'When solving a problem, what do you do first?',
    options: [
      { id: 'draw', label: 'Draw it or picture the system', visualScore: 3, wordsScore: 0 },
      { id: 'list', label: 'Write a list of facts or steps', visualScore: 0, wordsScore: 3 },
      { id: 'talk', label: 'Talk it through in words', visualScore: 0, wordsScore: 3 },
      { id: 'model', label: 'Build a mental model of pieces and relationships', visualScore: 2, wordsScore: 2 },
    ],
  },
  {
    id: 'description-style',
    model: 'A',
    kind: 'text',
    prompt: 'If asked to describe your childhood home, where do you start?',
    options: [
      { id: 'layout', label: 'The layout, rooms, colors, or where things were', visualScore: 3, wordsScore: 0 },
      { id: 'facts', label: 'Facts: location, years, people, events', visualScore: 0, wordsScore: 3 },
      { id: 'walkthrough', label: 'A walkthrough from room to room', visualScore: 3, wordsScore: 1 },
      { id: 'stories', label: 'Stories that happened there', visualScore: 1, wordsScore: 3 },
    ],
  },
];

export function classify(visualScore: number, wordsScore: number) {
  const total = visualScore + wordsScore || 1;
  const visualPct = Math.round((visualScore / total) * 100);
  const wordsPct = 100 - visualPct;
  const delta = Math.abs(visualPct - wordsPct);

  if (delta < 15) {
    return { type: 'Blended thinker', visualPct, wordsPct };
  }
  if (visualPct > wordsPct) {
    return { type: 'Visual-first thinker', visualPct, wordsPct };
  }
  return { type: 'Words-first thinker', visualPct, wordsPct };
}
