export type DimensionScores = {
  objectDetail: number;
  sceneGist: number;
  visualFeatures: number;
  spatialStructure: number;
  verbalNarrative: number;
  imageryVividness: number;
};

export type QuestionOption = {
  id: string;
  label: string;
  scores: DimensionScores;
};

export type Question = {
  id: string;
  model: 'A' | 'B';
  version: string;
  construct: keyof DimensionScores | 'mixed';
  prompt: string;
  helper?: string;
  kind: 'text' | 'image';
  imageUrl?: string;
  options: QuestionOption[];
};

export const activeModel = 'B' as const;
export const scoringVersion = 'multidimensional-v1';

const zero: DimensionScores = {
  objectDetail: 0,
  sceneGist: 0,
  visualFeatures: 0,
  spatialStructure: 0,
  verbalNarrative: 0,
  imageryVividness: 0,
};

function scores(partial: Partial<DimensionScores>): DimensionScores {
  return { ...zero, ...partial };
}

export const questions: Question[] = [
  {
    id: 'horse-initial-description',
    model: 'B',
    version: '1.1',
    construct: 'mixed',
    kind: 'image',
    prompt: 'When you see this image, what comes to mind first?',
    helper: 'Not what is correct. What your brain grabs first.',
    imageUrl: '/horse.png',
    options: [
      { id: 'horse', label: 'A horse', scores: scores({ verbalNarrative: 2 }) },
      { id: 'palomino', label: 'A palomino', scores: scores({ objectDetail: 3, visualFeatures: 1 }) },
      { id: 'country-landscape', label: 'The country or landscape around it', scores: scores({ sceneGist: 3, spatialStructure: 1 }) },
      { id: 'color-shape', label: 'Color, shape, movement, or texture', scores: scores({ visualFeatures: 3 }) },
      { id: 'sentence', label: 'A sentence or description about the image', scores: scores({ verbalNarrative: 3 }) },
    ],
  },
  {
    id: 'mental-image-vividness',
    model: 'B',
    version: '1.0',
    construct: 'imageryVividness',
    kind: 'text',
    prompt: 'Picture a close friend walking into a room. What is the image like?',
    helper: 'This is a lightweight vividness item, not a clinical measure.',
    options: [
      { id: 'clear', label: 'Clear, detailed, almost like seeing it', scores: scores({ imageryVividness: 3, visualFeatures: 1 }) },
      { id: 'rough', label: 'A rough picture with some details', scores: scores({ imageryVividness: 2 }) },
      { id: 'concept', label: 'More like knowing the facts than seeing an image', scores: scores({ verbalNarrative: 2 }) },
      { id: 'words', label: 'Mostly words, names, or descriptions', scores: scores({ verbalNarrative: 3 }) },
    ],
  },
  {
    id: 'memory-recall',
    model: 'B',
    version: '1.0',
    construct: 'mixed',
    kind: 'text',
    prompt: 'When you remember yesterday, what appears first?',
    options: [
      { id: 'scene', label: 'A scene or snapshot', scores: scores({ sceneGist: 2, imageryVividness: 2 }) },
      { id: 'timeline', label: 'A timeline of what happened', scores: scores({ verbalNarrative: 2, spatialStructure: 1 }) },
      { id: 'dialogue', label: 'Words people said', scores: scores({ verbalNarrative: 3 }) },
      { id: 'feeling', label: 'A feeling or atmosphere', scores: scores({ sceneGist: 2, verbalNarrative: 1 }) },
    ],
  },
  {
    id: 'directions',
    model: 'B',
    version: '1.0',
    construct: 'spatialStructure',
    kind: 'text',
    prompt: 'Which directions help you most?',
    options: [
      { id: 'map', label: 'Show me a map or visual route', scores: scores({ spatialStructure: 3, visualFeatures: 1 }) },
      { id: 'landmarks', label: 'Tell me landmarks to look for', scores: scores({ sceneGist: 2, spatialStructure: 1 }) },
      { id: 'steps', label: 'Give me numbered steps', scores: scores({ verbalNarrative: 3 }) },
      { id: 'both', label: 'Map plus short written steps', scores: scores({ spatialStructure: 2, verbalNarrative: 2 }) },
    ],
  },
  {
    id: 'learning',
    model: 'B',
    version: '1.0',
    construct: 'mixed',
    kind: 'text',
    prompt: 'When learning a new idea, what clicks first?',
    options: [
      { id: 'diagram', label: 'A diagram or sketch', scores: scores({ spatialStructure: 2, visualFeatures: 2 }) },
      { id: 'example', label: 'A concrete example', scores: scores({ objectDetail: 1, sceneGist: 1, verbalNarrative: 1 }) },
      { id: 'definition', label: 'A clear definition', scores: scores({ verbalNarrative: 3 }) },
      { id: 'story', label: 'A story that explains it', scores: scores({ verbalNarrative: 2, sceneGist: 1 }) },
    ],
  },
  {
    id: 'problem-solving',
    model: 'B',
    version: '1.0',
    construct: 'mixed',
    kind: 'text',
    prompt: 'When solving a problem, what do you do first?',
    options: [
      { id: 'draw', label: 'Draw it or picture the system', scores: scores({ spatialStructure: 3, visualFeatures: 1 }) },
      { id: 'list', label: 'Write a list of facts or steps', scores: scores({ verbalNarrative: 3 }) },
      { id: 'talk', label: 'Talk it through in words', scores: scores({ verbalNarrative: 3 }) },
      { id: 'model', label: 'Build a mental model of pieces and relationships', scores: scores({ spatialStructure: 2, verbalNarrative: 1 }) },
    ],
  },
  {
    id: 'description-style',
    model: 'B',
    version: '1.0',
    construct: 'mixed',
    kind: 'text',
    prompt: 'If asked to describe your childhood home, where do you start?',
    options: [
      { id: 'layout', label: 'The layout, rooms, colors, or where things were', scores: scores({ spatialStructure: 2, objectDetail: 2 }) },
      { id: 'facts', label: 'Facts: location, years, people, events', scores: scores({ verbalNarrative: 3 }) },
      { id: 'walkthrough', label: 'A walkthrough from room to room', scores: scores({ spatialStructure: 3, imageryVividness: 1 }) },
      { id: 'stories', label: 'Stories that happened there', scores: scores({ verbalNarrative: 3, sceneGist: 1 }) },
    ],
  },
  {
    id: 'detail-vs-gist',
    model: 'B',
    version: '1.0',
    construct: 'mixed',
    kind: 'text',
    prompt: 'When looking at a new place, what do you notice first?',
    options: [
      { id: 'specifics', label: 'Specific objects, colors, materials, or small details', scores: scores({ objectDetail: 3, visualFeatures: 2 }) },
      { id: 'layout', label: 'How the space is arranged', scores: scores({ spatialStructure: 3 }) },
      { id: 'vibe', label: 'The overall scene or atmosphere', scores: scores({ sceneGist: 3 }) },
      { id: 'explain', label: 'How I would describe it to someone', scores: scores({ verbalNarrative: 3 }) },
    ],
  },
];

export const dimensionLabels: Record<keyof DimensionScores, string> = {
  objectDetail: 'Object/detail',
  sceneGist: 'Scene/gist',
  visualFeatures: 'Visual features',
  spatialStructure: 'Spatial/structure',
  verbalNarrative: 'Verbal/narrative',
  imageryVividness: 'Imagery vividness',
};

export function emptyScores(): DimensionScores {
  return { ...zero };
}

export function addScores(a: DimensionScores, b: DimensionScores): DimensionScores {
  return {
    objectDetail: a.objectDetail + b.objectDetail,
    sceneGist: a.sceneGist + b.sceneGist,
    visualFeatures: a.visualFeatures + b.visualFeatures,
    spatialStructure: a.spatialStructure + b.spatialStructure,
    verbalNarrative: a.verbalNarrative + b.verbalNarrative,
    imageryVividness: a.imageryVividness + b.imageryVividness,
  };
}

export function profileFromScores(rawScores: DimensionScores) {
  const entries = Object.entries(rawScores) as Array<[keyof DimensionScores, number]>;
  const max = Math.max(...entries.map(([, value]) => value), 1);
  const dimensions = entries
    .map(([key, value]) => ({ key, label: dimensionLabels[key], value, pct: Math.round((value / max) * 100) }))
    .sort((a, b) => b.value - a.value);
  const top = dimensions[0];
  const second = dimensions[1];
  const resultType = top.value === second.value ? 'Blended response profile' : `${top.label}-leaning response profile`;
  return { resultType, dimensions, top, second };
}
