export type DimensionScores = {
  objectDetail: number;
  sceneGist: number;
  visualFeatures: number;
  spatialStructure: number;
  verbalNarrative: number;
  imageryVividness: number;
};

export type DimensionKey = keyof DimensionScores;

export type QuestionOption = {
  id: string;
  label: string;
  scores: DimensionScores;
};

export type Question = {
  id: string;
  model: 'A' | 'B';
  version: string;
  construct: DimensionKey | 'mixed';
  prompt: string;
  helper?: string;
  kind: 'text' | 'image';
  imageUrl?: string;
  options: QuestionOption[];
};

export type DimensionProfileItem = {
  key: DimensionKey;
  label: string;
  rawValue: number;
  maxValue: number;
  /** Normalized against the maximum available score for this dimension. Use this for bars. */
  normalizedPct: number;
  /** Backward-compatible bar percentage alias. */
  pct: number;
  /** Share of all raw points. Useful for analysis, not primary result UI. */
  sharePct: number;
  /** Backward-compatible value alias; intentionally normalized, not a raw total. */
  value: number;
};

export type ProfileTakeaway = {
  title: string;
  body: string;
  tryThis: string[];
  watchFor?: string;
};

export type ResponseProfile = {
  resultType: string;
  dimensions: DimensionProfileItem[];
  top: DimensionProfileItem;
  second: DimensionProfileItem;
  isInconclusive: boolean;
  gapPct: number;
  blendThresholdPct: number;
  confidence: 'blended' | 'moderate' | 'clear';
  summary: string;
  takeaways: ProfileTakeaway[];
};

export const activeModel = 'B' as const;
export const scoringVersion = 'multidimensional-v2';
export const blendThresholdPct = 8;

export const dimensionKeys = [
  'objectDetail',
  'sceneGist',
  'visualFeatures',
  'spatialStructure',
  'verbalNarrative',
  'imageryVividness',
] as const satisfies readonly DimensionKey[];

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
  {
    id: 'recall-cue-task',
    model: 'B',
    version: '1.0',
    construct: 'mixed',
    kind: 'text',
    prompt: 'Task-style item: you need to remember five unfamiliar items for tomorrow. Which cue would you make first?',
    helper: 'Choose the tool you would actually reach for, not the one that sounds smartest.',
    options: [
      { id: 'sketch-positions', label: 'A quick sketch showing where each item sits', scores: scores({ spatialStructure: 3, visualFeatures: 1 }) },
      { id: 'color-tags', label: 'Color or shape tags for each item', scores: scores({ visualFeatures: 3, objectDetail: 1 }) },
      { id: 'named-list', label: 'A named list with short labels', scores: scores({ verbalNarrative: 3, objectDetail: 1 }) },
      { id: 'mini-story', label: 'A tiny story connecting the items', scores: scores({ verbalNarrative: 2, sceneGist: 2 }) },
    ],
  },
  {
    id: 'rebuild-task',
    model: 'B',
    version: '1.0',
    construct: 'mixed',
    kind: 'text',
    prompt: 'Task-style item: you are given a messy process and must rebuild it from memory. What helps most?',
    options: [
      { id: 'flowchart', label: 'Turn it into a flowchart or diagram', scores: scores({ spatialStructure: 3, visualFeatures: 1 }) },
      { id: 'numbered-sequence', label: 'Write the exact ordered steps', scores: scores({ verbalNarrative: 3, spatialStructure: 1 }) },
      { id: 'example-scene', label: 'Imagine one concrete example happening', scores: scores({ sceneGist: 2, imageryVividness: 2 }) },
      { id: 'key-objects', label: 'Anchor on the important objects or entities', scores: scores({ objectDetail: 3 }) },
    ],
  },
];

export const dimensionLabels: Record<DimensionKey, string> = {
  objectDetail: 'Object/detail',
  sceneGist: 'Scene/gist',
  visualFeatures: 'Visual features',
  spatialStructure: 'Spatial/structure',
  verbalNarrative: 'Verbal/narrative',
  imageryVividness: 'Imagery vividness',
};

export const dimensionInterpretations: Record<DimensionKey, ProfileTakeaway> = {
  objectDetail: {
    title: 'You may anchor on concrete specifics.',
    body: 'Your answers favored labels, entities, and distinguishing details over a broad first impression.',
    tryThis: [
      'When learning, start with concrete examples before abstract rules.',
      'For decisions, list the few details that would actually change the answer.',
      'Pair details with a one-line gist so the bigger frame does not get lost.',
    ],
    watchFor: 'Details can feel decisive even when the overall pattern matters more.',
  },
  sceneGist: {
    title: 'You may catch the whole scene early.',
    body: 'Your answers leaned toward atmosphere, setting, and overall meaning before isolated parts.',
    tryThis: [
      'Begin notes with the big-picture takeaway, then add supporting facts.',
      'Use examples and scenarios when explaining ideas to someone else.',
      'Add a quick checklist for details you might skip once the gist feels clear.',
    ],
    watchFor: 'A strong gist can hide missing specifics, so verify key details before acting.',
  },
  visualFeatures: {
    title: 'You may notice visual qualities quickly.',
    body: 'Color, shape, texture, movement, and visual contrast showed up as a strong route into meaning.',
    tryThis: [
      'Use highlights, sketches, icons, or visual grouping when studying.',
      'Turn dense text into marked-up examples or visual comparisons.',
      'For verbal tasks, translate the visual impression into explicit words before handing it off.',
    ],
    watchFor: 'Visual salience can pull attention toward what stands out, not always what matters most.',
  },
  spatialStructure: {
    title: 'You may think in layout and relationships.',
    body: 'Your answers favored maps, systems, order, and how parts connect.',
    tryThis: [
      'Use diagrams, timelines, mind maps, or architecture sketches for complex topics.',
      'When planning, block dependencies and paths before writing detailed steps.',
      'For communication, add a short written walkthrough so others can follow the map.',
    ],
    watchFor: 'A structure can feel complete before the contents are fully validated.',
  },
  verbalNarrative: {
    title: 'You may organize meaning through words.',
    body: 'Definitions, labels, steps, dialogue, and stories were a primary way your answers made sense of things.',
    tryThis: [
      'Use concise written summaries, checklists, and talk-throughs when learning or deciding.',
      'Name the concept first, then attach an example or sketch if the idea is complex.',
      'For visual material, write the caption you would give someone else.',
    ],
    watchFor: 'Words can become tidy before the underlying picture or system is fully checked.',
  },
  imageryVividness: {
    title: 'Your mental imagery report mattered here.',
    body: 'You reported more or less vivid internal pictures, which can change how memory and planning feel.',
    tryThis: [
      'If imagery is vivid, use mental rehearsal plus written checkpoints.',
      'If imagery is faint, lean on external notes, diagrams, photos, or labels without treating that as a flaw.',
      'For memory tasks, combine the image/fact with one retrieval cue you can reuse later.',
    ],
    watchFor: 'Vividness is not ability or intelligence; it is one input style among several.',
  },
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

export function maxScoresForQuestions(items: Question[] = questions): DimensionScores {
  return items.reduce((totals, question) => {
    const next = { ...totals };
    for (const key of dimensionKeys) {
      next[key] += Math.max(...question.options.map((option) => option.scores[key]), 0);
    }
    return next;
  }, emptyScores());
}

export const maxPossibleScores = maxScoresForQuestions(questions);

export function normalizeDimensionScores(rawScores: DimensionScores, maximums: DimensionScores = maxPossibleScores): DimensionProfileItem[] {
  const rawTotal = dimensionKeys.reduce((total, key) => total + rawScores[key], 0) || 1;

  return dimensionKeys
    .map((key) => {
      const rawValue = rawScores[key] ?? 0;
      const maxValue = maximums[key] || 1;
      const normalizedPct = Math.min(100, Math.round((rawValue / maxValue) * 100));
      const sharePct = Math.round((rawValue / rawTotal) * 100);

      return {
        key,
        label: dimensionLabels[key],
        rawValue,
        maxValue,
        normalizedPct,
        pct: normalizedPct,
        sharePct,
        value: normalizedPct,
      };
    })
    .sort((a, b) => b.normalizedPct - a.normalizedPct || b.rawValue - a.rawValue || a.label.localeCompare(b.label));
}

function confidenceFromGap(gapPct: number, isInconclusive: boolean): ResponseProfile['confidence'] {
  if (isInconclusive) return 'blended';
  return gapPct >= 18 ? 'clear' : 'moderate';
}

function buildSummary(top: DimensionProfileItem, second: DimensionProfileItem, isInconclusive: boolean, gapPct: number): string {
  if (isInconclusive) {
    return `Your top two normalized dimensions (${top.label} and ${second.label}) were only ${gapPct} percentage points apart, so this should be read as a blended or inconclusive profile rather than a single dominant style.`;
  }

  return `Your strongest normalized signal was ${top.label}. The next closest dimension was ${second.label}, ${gapPct} percentage points lower, so this is a useful leaning—not a fixed identity or diagnosis.`;
}

function buildTakeaways(top: DimensionProfileItem, second: DimensionProfileItem, isInconclusive: boolean): ProfileTakeaway[] {
  if (isInconclusive) {
    return [
      {
        title: `${top.label} and ${second.label} both matter for you here.`,
        body: 'The result is close enough that the most honest read is mixed. Try combining both styles rather than forcing one label.',
        tryThis: [
          ...dimensionInterpretations[top.key].tryThis.slice(0, 2),
          ...dimensionInterpretations[second.key].tryThis.slice(0, 2),
        ],
        watchFor: 'Close scores are especially sensitive to wording and item mix; retake stability matters before drawing a strong conclusion.',
      },
    ];
  }

  return [dimensionInterpretations[top.key], {
    title: `Your secondary route: ${second.label}.`,
    body: `This was the next strongest normalized signal, so it may be a useful backup strategy even if ${top.label} led this run.`,
    tryThis: dimensionInterpretations[second.key].tryThis.slice(0, 2),
    watchFor: dimensionInterpretations[second.key].watchFor,
  }];
}

export function profileFromScores(rawScores: DimensionScores): ResponseProfile {
  const dimensions = normalizeDimensionScores(rawScores);
  const top = dimensions[0];
  const second = dimensions[1];
  const gapPct = Math.max(0, top.normalizedPct - second.normalizedPct);
  const isInconclusive = gapPct <= blendThresholdPct;
  const resultType = isInconclusive
    ? `Blended / inconclusive profile: ${top.label} + ${second.label}`
    : `${top.label}-leaning response profile`;

  return {
    resultType,
    dimensions,
    top,
    second,
    isInconclusive,
    gapPct,
    blendThresholdPct,
    confidence: confidenceFromGap(gapPct, isInconclusive),
    summary: buildSummary(top, second, isInconclusive, gapPct),
    takeaways: buildTakeaways(top, second, isInconclusive),
  };
}
