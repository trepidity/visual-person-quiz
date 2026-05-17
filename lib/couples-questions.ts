export const activeCouplesModel = 'C' as const;
export const couplesScoringVersion = 'couples-lens-mvp-v1';
export const couplesBlendThresholdPct = 8;

export type LensConstruct =
  | 'objectCategory'
  | 'sceneContext'
  | 'detailFeatures'
  | 'spatialLayout'
  | 'gistAtmosphere'
  | 'narrativeSequence'
  | 'semanticAnchor'
  | 'communicationOutput';

export type LensScores = Record<LensConstruct, number>;

export type ParticipantRole = 'partner_a' | 'partner_b';
export type FlowType = 'solo' | 'pair';

export const lensConstructs = [
  'objectCategory',
  'sceneContext',
  'detailFeatures',
  'spatialLayout',
  'gistAtmosphere',
  'narrativeSequence',
  'semanticAnchor',
  'communicationOutput',
] as const satisfies readonly LensConstruct[];

export const lensLabels: Record<LensConstruct, string> = {
  objectCategory: 'Object/category',
  sceneContext: 'Scene/context',
  detailFeatures: 'Detail/features',
  spatialLayout: 'Spatial/layout',
  gistAtmosphere: 'Gist/atmosphere',
  narrativeSequence: 'Narrative/sequence',
  semanticAnchor: 'Semantic anchor',
  communicationOutput: 'Communication output',
};

export type CouplesQuestionKind = 'image' | 'scenario' | 'memory' | 'repair' | 'imagery';

export type ImageryBand = 'vivid' | 'moderate' | 'faint' | 'absent';
export type RepairMove = 'nameMainThing' | 'addContext' | 'giveSequence' | 'nameEmotion' | 'showLayout';

export type CouplesAnswerTag =
  | { type: 'lens'; lens: LensConstruct }
  | { type: 'partnerPrediction'; lens: LensConstruct }
  | { type: 'imageryBand'; band: ImageryBand }
  | { type: 'repairMove'; move: RepairMove };

export type CouplesQuestionOption = {
  id: string;
  label: string;
  scores: LensScores;
  tags?: CouplesAnswerTag[];
};

export type CouplesQuestion = {
  id: string;
  model: typeof activeCouplesModel;
  version: string;
  construct: LensConstruct | 'mixed' | 'partnerPrediction' | 'imageryBand';
  kind: CouplesQuestionKind;
  prompt: string;
  helper?: string;
  imageUrl?: string;
  options: CouplesQuestionOption[];
  reportAnchor?: string;
};

const zeroLensScores: LensScores = {
  objectCategory: 0,
  sceneContext: 0,
  detailFeatures: 0,
  spatialLayout: 0,
  gistAtmosphere: 0,
  narrativeSequence: 0,
  semanticAnchor: 0,
  communicationOutput: 0,
};

export function emptyLensScores(): LensScores {
  return { ...zeroLensScores };
}

export function lensScores(partial: Partial<LensScores>): LensScores {
  return { ...zeroLensScores, ...partial };
}

const lensTag = (lens: LensConstruct): CouplesAnswerTag => ({ type: 'lens', lens });
const partnerPredictionTag = (lens: LensConstruct): CouplesAnswerTag => ({ type: 'partnerPrediction', lens });
const imageryBandTag = (band: ImageryBand): CouplesAnswerTag => ({ type: 'imageryBand', band });
const repairMoveTag = (move: RepairMove): CouplesAnswerTag => ({ type: 'repairMove', move });

// Scoring-weight rationale: C5/C7/C8/C10 intentionally repeat communication and repair
// situations because the pair report needs evidence from actual explanation/repair moments, not
// only first-glance image preferences. The scoring engine still withholds `clear` confidence unless
// the evidence is consistent across distinct task families; split answers across these repeated
// items should stay blended or moderate rather than creating an arbitrary dominant lens.
export const couplesQuestions: CouplesQuestion[] = [
  {
    id: 'c1_image_first_grab',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'mixed',
    kind: 'image',
    imageUrl: '/horse.png',
    prompt: 'When you first see this image, what does your brain grab first?',
    reportAnchor: 'image task',
    options: [
      {
        id: 'main-object',
        label: 'The main object/person/thing',
        scores: lensScores({ objectCategory: 3, semanticAnchor: 1 }),
        tags: [lensTag('objectCategory')],
      },
      {
        id: 'surrounding-scene',
        label: 'The surrounding scene or context',
        scores: lensScores({ sceneContext: 3, gistAtmosphere: 1 }),
        tags: [lensTag('sceneContext')],
      },
      {
        id: 'specific-details',
        label: 'Specific details like color, shape, texture, or movement',
        scores: lensScores({ detailFeatures: 3 }),
        tags: [lensTag('detailFeatures')],
      },
      {
        id: 'layout',
        label: 'Where things are in relation to each other',
        scores: lensScores({ spatialLayout: 3 }),
        tags: [lensTag('spatialLayout')],
      },
      {
        id: 'mood',
        label: 'The mood or atmosphere of the whole image',
        scores: lensScores({ gistAtmosphere: 3 }),
        tags: [lensTag('gistAtmosphere')],
      },
    ],
  },
  {
    id: 'c2_image_describe_first',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'communicationOutput',
    kind: 'image',
    imageUrl: '/horse.png',
    prompt: 'If you had to describe this image to your partner, what would you say first?',
    reportAnchor: 'description task',
    options: [
      {
        id: 'name-central-thing',
        label: 'Name the central thing first',
        scores: lensScores({ semanticAnchor: 2, objectCategory: 2, communicationOutput: 1 }),
        tags: [lensTag('semanticAnchor')],
      },
      {
        id: 'set-scene',
        label: 'Set the scene around it first',
        scores: lensScores({ sceneContext: 3, communicationOutput: 1 }),
        tags: [lensTag('sceneContext')],
      },
      {
        id: 'mention-detail',
        label: 'Mention a specific visual detail first',
        scores: lensScores({ detailFeatures: 3, communicationOutput: 1 }),
        tags: [lensTag('detailFeatures')],
      },
      {
        id: 'describe-layout',
        label: 'Describe the layout or relationship between parts',
        scores: lensScores({ spatialLayout: 3, communicationOutput: 1 }),
        tags: [lensTag('spatialLayout')],
      },
      {
        id: 'tell-mini-story',
        label: 'Tell a small story about what might be happening',
        scores: lensScores({ narrativeSequence: 3, gistAtmosphere: 1, communicationOutput: 1 }),
        tags: [lensTag('narrativeSequence')],
      },
    ],
  },
  {
    id: 'c3_predict_partner_first_grab',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'partnerPrediction',
    kind: 'scenario',
    prompt: 'What do you think your partner would notice first in the same image?',
    helper: 'This is not a test of being right. It helps show what each of you assumes is shared.',
    reportAnchor: 'prediction item',
    options: [
      {
        id: 'main-object',
        label: 'The main object/person/thing',
        scores: emptyLensScores(),
        tags: [partnerPredictionTag('objectCategory')],
      },
      {
        id: 'surrounding-scene',
        label: 'The surrounding scene or context',
        scores: emptyLensScores(),
        tags: [partnerPredictionTag('sceneContext')],
      },
      {
        id: 'specific-details',
        label: 'Specific details like color, shape, texture, or movement',
        scores: emptyLensScores(),
        tags: [partnerPredictionTag('detailFeatures')],
      },
      {
        id: 'layout',
        label: 'Where things are in relation to each other',
        scores: emptyLensScores(),
        tags: [partnerPredictionTag('spatialLayout')],
      },
      {
        id: 'mood',
        label: 'The mood or atmosphere of the whole image',
        scores: emptyLensScores(),
        tags: [partnerPredictionTag('gistAtmosphere')],
      },
    ],
  },
  {
    id: 'c4_shared_memory_first',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'mixed',
    kind: 'memory',
    prompt: 'When you remember a shared moment, what appears first?',
    reportAnchor: 'shared-memory item',
    options: [
      {
        id: 'scene-snapshot',
        label: 'A scene or snapshot',
        scores: lensScores({ sceneContext: 2, gistAtmosphere: 1 }),
        tags: [lensTag('sceneContext')],
      },
      {
        id: 'sequence',
        label: 'The sequence of what happened',
        scores: lensScores({ narrativeSequence: 3 }),
        tags: [lensTag('narrativeSequence')],
      },
      {
        id: 'words-said',
        label: 'Words people said or the exact phrasing',
        scores: lensScores({ semanticAnchor: 2, narrativeSequence: 1 }),
        tags: [lensTag('semanticAnchor')],
      },
      {
        id: 'feeling',
        label: 'The feeling or atmosphere',
        scores: lensScores({ gistAtmosphere: 3 }),
        tags: [lensTag('gistAtmosphere')],
      },
      {
        id: 'key-point',
        label: 'The key point, label, or takeaway',
        scores: lensScores({ semanticAnchor: 3 }),
        tags: [lensTag('semanticAnchor')],
      },
    ],
  },
  {
    id: 'c5_assumed_obvious',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'mixed',
    kind: 'scenario',
    prompt: 'In conversation, what do you most often assume is already obvious?',
    reportAnchor: 'assumed-obvious item',
    options: [
      {
        id: 'topic',
        label: 'The central topic or object',
        scores: lensScores({ objectCategory: 2, semanticAnchor: 1 }),
        tags: [lensTag('objectCategory')],
      },
      {
        id: 'context',
        label: 'The surrounding context',
        scores: lensScores({ sceneContext: 3 }),
        tags: [lensTag('sceneContext')],
      },
      {
        id: 'why-matters',
        label: 'Why it matters or what it means',
        scores: lensScores({ gistAtmosphere: 2, semanticAnchor: 1 }),
        tags: [lensTag('gistAtmosphere')],
      },
      {
        id: 'order',
        label: 'The order things happened',
        scores: lensScores({ narrativeSequence: 3 }),
        tags: [lensTag('narrativeSequence')],
      },
      {
        id: 'layout',
        label: 'Where things are or how pieces connect',
        scores: lensScores({ spatialLayout: 3 }),
        tags: [lensTag('spatialLayout')],
      },
    ],
  },
  {
    id: 'c6_explain_location_to_new_person',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'mixed',
    kind: 'scenario',
    prompt: 'You need to explain where something is to someone who has never been in the space. What do you lead with?',
    reportAnchor: 'location-explanation item',
    options: [
      {
        id: 'label-place',
        label: 'Name the place or container first',
        scores: lensScores({ semanticAnchor: 3, objectCategory: 1 }),
        tags: [lensTag('semanticAnchor')],
      },
      {
        id: 'surrounding-context',
        label: 'Describe what is around it',
        scores: lensScores({ sceneContext: 3 }),
        tags: [lensTag('sceneContext')],
      },
      {
        id: 'step-by-step',
        label: 'Give step-by-step directions',
        scores: lensScores({ narrativeSequence: 2, spatialLayout: 1 }),
        tags: [lensTag('narrativeSequence')],
      },
      {
        id: 'layout-map',
        label: 'Describe the layout like a map',
        scores: lensScores({ spatialLayout: 3 }),
        tags: [lensTag('spatialLayout')],
      },
      {
        id: 'example',
        label: 'Give a concrete example they can picture',
        scores: lensScores({ objectCategory: 1, sceneContext: 1, communicationOutput: 2 }),
        tags: [lensTag('objectCategory')],
      },
    ],
  },
  {
    id: 'c7_translation_help',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'communicationOutput',
    kind: 'repair',
    prompt: 'When your partner is not following you, what helps you translate fastest?',
    reportAnchor: 'translation-help item',
    options: [
      {
        id: 'clearer-label',
        label: 'A clearer name, label, or main point',
        scores: lensScores({ semanticAnchor: 3, communicationOutput: 1 }),
        tags: [lensTag('semanticAnchor')],
      },
      {
        id: 'more-context',
        label: 'More surrounding context',
        scores: lensScores({ sceneContext: 3, communicationOutput: 1 }),
        tags: [lensTag('sceneContext')],
      },
      {
        id: 'sequence',
        label: 'A step-by-step sequence',
        scores: lensScores({ narrativeSequence: 3, communicationOutput: 1 }),
        tags: [lensTag('narrativeSequence')],
      },
      {
        id: 'concrete-example',
        label: 'A concrete example',
        scores: lensScores({ objectCategory: 1, sceneContext: 1, communicationOutput: 2 }),
        tags: [lensTag('objectCategory')],
      },
      {
        id: 'diagram-layout',
        label: 'A diagram, layout, or relationship map',
        scores: lensScores({ spatialLayout: 3, communicationOutput: 1 }),
        tags: [lensTag('spatialLayout')],
      },
    ],
  },
  {
    id: 'c8_output_format',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'communicationOutput',
    kind: 'scenario',
    prompt: 'When explaining a plan or situation, what do you usually produce first?',
    reportAnchor: 'output-format item',
    options: [
      {
        id: 'one-line-summary',
        label: 'A one-line summary or label',
        scores: lensScores({ semanticAnchor: 3, communicationOutput: 1 }),
        tags: [lensTag('semanticAnchor')],
      },
      {
        id: 'bullet-list',
        label: 'A bullet list of key points',
        scores: lensScores({ semanticAnchor: 2, narrativeSequence: 1, communicationOutput: 1 }),
        tags: [lensTag('semanticAnchor')],
      },
      {
        id: 'walkthrough',
        label: 'A story or walkthrough',
        scores: lensScores({ narrativeSequence: 3, communicationOutput: 1 }),
        tags: [lensTag('narrativeSequence')],
      },
      {
        id: 'diagram',
        label: 'A diagram or layout',
        scores: lensScores({ spatialLayout: 3, communicationOutput: 1 }),
        tags: [lensTag('spatialLayout')],
      },
      {
        id: 'scene-setting',
        label: 'The surrounding context before the point',
        scores: lensScores({ sceneContext: 3, communicationOutput: 1 }),
        tags: [lensTag('sceneContext')],
      },
    ],
  },
  {
    id: 'c9_imagery_band',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'imageryBand',
    kind: 'imagery',
    prompt: 'Picture a familiar room. How clear is the inner image?',
    helper: 'This is a coarse experience band, not a score or clinical assessment.',
    reportAnchor: 'imagery item',
    options: [
      {
        id: 'vivid',
        label: 'Vivid — close to seeing it',
        scores: emptyLensScores(),
        tags: [imageryBandTag('vivid')],
      },
      {
        id: 'moderate',
        label: 'Moderate — a usable picture with some gaps',
        scores: emptyLensScores(),
        tags: [imageryBandTag('moderate')],
      },
      {
        id: 'faint',
        label: 'Faint — mostly partial or vague',
        scores: emptyLensScores(),
        tags: [imageryBandTag('faint')],
      },
      {
        id: 'absent',
        label: 'Absent — more like facts/knowledge than a picture',
        scores: emptyLensScores(),
        tags: [imageryBandTag('absent')],
      },
    ],
  },
  {
    id: 'c10_crossed_wire_repair',
    model: activeCouplesModel,
    version: '1.0',
    construct: 'mixed',
    kind: 'repair',
    prompt: 'In a crossed-wire conversation, what would help fastest?',
    reportAnchor: 'repair item',
    options: [
      {
        id: 'name-main-thing',
        label: 'Name the main thing first.',
        scores: lensScores({ semanticAnchor: 2, objectCategory: 1 }),
        tags: [lensTag('semanticAnchor'), repairMoveTag('nameMainThing')],
      },
      {
        id: 'give-context',
        label: 'Give me the context.',
        scores: lensScores({ sceneContext: 3 }),
        tags: [lensTag('sceneContext'), repairMoveTag('addContext')],
      },
      {
        id: 'tell-sequence',
        label: 'Tell me the sequence.',
        scores: lensScores({ narrativeSequence: 3 }),
        tags: [lensTag('narrativeSequence'), repairMoveTag('giveSequence')],
      },
      {
        id: 'say-emotional-meaning',
        label: 'Say what this means emotionally.',
        scores: lensScores({ gistAtmosphere: 3 }),
        tags: [lensTag('gistAtmosphere'), repairMoveTag('nameEmotion')],
      },
      {
        id: 'show-layout',
        label: 'Show me the layout or relationship.',
        scores: lensScores({ spatialLayout: 3 }),
        tags: [lensTag('spatialLayout'), repairMoveTag('showLayout')],
      },
    ],
  },
];

export const couplesQuestionIds = couplesQuestions.map((question) => question.id);

export const couplesQuestionsById: Record<string, CouplesQuestion> = Object.fromEntries(
  couplesQuestions.map((question) => [question.id, question]),
);
