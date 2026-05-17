import {
  couplesBlendThresholdPct,
  couplesQuestions,
  couplesScoringVersion,
  emptyLensScores,
  lensConstructs,
  lensLabels,
  type CouplesAnswerTag,
  type CouplesQuestion,
  type ImageryBand,
  type LensConstruct,
  type LensScores,
  type ParticipantRole,
  type RepairMove,
} from './couples-questions';

export type LensProfileDimension = {
  key: LensConstruct;
  label: string;
  rawValue: number;
  maxValue: number;
  normalizedPct: number;
  sharePct: number;
};

export type EnrichedCouplesAnswer = {
  questionId: string;
  itemVersion: string;
  model: 'C';
  construct: CouplesQuestion['construct'];
  prompt: string;
  displayOrder: number;
  answerId: string;
  answerLabel: string;
  scores: LensScores;
  tags: CouplesAnswerTag[];
  responseTimeMs: number | null;
};

export type ParticipantLensProfile = {
  scoringVersion: typeof couplesScoringVersion;
  dimensions: LensProfileDimension[];
  top: LensProfileDimension;
  second: LensProfileDimension;
  topLenses: LensProfileDimension[];
  isBlended: boolean;
  gapPct: number;
  confidence: 'blended' | 'moderate' | 'clear';
  imageryBand?: ImageryBand;
  selectedLensByQuestion: Record<string, LensConstruct | null>;
  partnerPredictionByQuestion: Record<string, LensConstruct | null>;
  repairMove?: RepairMove;
};

export type PairComparisonInput = {
  pairId: string;
  participants: [
    { role: 'partner_a'; profile: ParticipantLensProfile; answers: EnrichedCouplesAnswer[] },
    { role: 'partner_b'; profile: ParticipantLensProfile; answers: EnrichedCouplesAnswer[] },
  ];
};

export type PairDifferencePattern =
  | 'object_vs_scene'
  | 'label_vs_context'
  | 'sequence_vs_gist'
  | 'layout_vs_story'
  | 'detail_vs_atmosphere'
  | 'different_repair_moves'
  | 'blended_or_low_contrast';

export type TranslationMove = {
  pattern: PairDifferencePattern;
  forPartnerA: string;
  forPartnerB: string;
  sharedPractice: string;
};

export type PairComparisonReport = {
  frame: string;
  isLowContrast: boolean;
  sharedGround: string[];
  differences: Array<{
    pattern: PairDifferencePattern;
    title: string;
    body: string;
    evidence: Array<{
      questionId: string;
      partnerAAnswer: string;
      partnerBAnswer: string;
    }>;
  }>;
  assumedSimilarity: {
    body: string;
    partnerAPredicted?: string;
    partnerBActual?: string;
    partnerBPredicted?: string;
    partnerAActual?: string;
  };
  translationMoves: TranslationMove[];
  imageryNote?: string;
  whatThisIsNot: string;
};

export type EnrichCouplesAnswersOptions = {
  requireComplete?: boolean;
};

export type CouplesProfileBuildResult = {
  answers: EnrichedCouplesAnswer[];
  rawScores: LensScores;
  profile: ParticipantLensProfile;
};

export const pairReportBannedTerms = [
  'compatibility',
  'incompatible',
  'match score',
  'diagnosis',
  'disorder',
  'deficit',
  'normal/abnormal',
  'better',
  'worse',
  'more accurate',
  'less accurate',
  'the visual one',
  'the verbal one',
] as const;

const questionById = new Map(couplesQuestions.map((question) => [question.id, question]));

export function addLensScores(a: LensScores, b: LensScores): LensScores {
  return {
    objectCategory: a.objectCategory + b.objectCategory,
    sceneContext: a.sceneContext + b.sceneContext,
    detailFeatures: a.detailFeatures + b.detailFeatures,
    spatialLayout: a.spatialLayout + b.spatialLayout,
    gistAtmosphere: a.gistAtmosphere + b.gistAtmosphere,
    narrativeSequence: a.narrativeSequence + b.narrativeSequence,
    semanticAnchor: a.semanticAnchor + b.semanticAnchor,
    communicationOutput: a.communicationOutput + b.communicationOutput,
  };
}

export function maxLensScoresForQuestions(items: CouplesQuestion[] = couplesQuestions): LensScores {
  return items.reduce((totals, question) => {
    if (question.construct === 'partnerPrediction') return totals;

    const next = { ...totals };
    for (const key of lensConstructs) {
      next[key] += Math.max(...question.options.map((option) => option.scores[key]), 0);
    }
    return next;
  }, emptyLensScores());
}

export const maxPossibleCouplesLensScores = maxLensScoresForQuestions(couplesQuestions);

export function normalizeLensScores(
  rawScores: LensScores,
  maximums: LensScores = maxPossibleCouplesLensScores,
): LensProfileDimension[] {
  const rawTotal = lensConstructs.reduce((total, key) => total + (rawScores[key] ?? 0), 0) || 1;

  return lensConstructs
    .map((key) => {
      const rawValue = rawScores[key] ?? 0;
      const maxValue = maximums[key] ?? 0;
      const normalizedPct = maxValue > 0 ? Math.min(100, Math.round((rawValue / maxValue) * 100)) : 0;
      const sharePct = Math.round((rawValue / rawTotal) * 100);

      return {
        key,
        label: lensLabels[key],
        rawValue,
        maxValue,
        normalizedPct,
        sharePct,
      };
    })
    .sort((a, b) => b.normalizedPct - a.normalizedPct || b.rawValue - a.rawValue || a.label.localeCompare(b.label));
}

export function enrichCouplesAnswers(
  selectedAnswerIds: Record<string, string>,
  responseTimes: Record<string, number | null | undefined> = {},
  items: CouplesQuestion[] = couplesQuestions,
  options: EnrichCouplesAnswersOptions = {},
): EnrichedCouplesAnswer[] {
  const requireComplete = options.requireComplete ?? true;
  const answers: EnrichedCouplesAnswer[] = [];

  items.forEach((question, index) => {
    const answerId = selectedAnswerIds[question.id];
    if (!answerId) {
      if (requireComplete) {
        throw new Error(`Missing answer for Model C question: ${question.id}`);
      }
      return;
    }

    const option = question.options.find((candidate) => candidate.id === answerId);
    if (!option) {
      throw new Error(`Invalid answer '${answerId}' for Model C question: ${question.id}`);
    }

    const responseTime = responseTimes[question.id];
    const responseTimeMs = typeof responseTime === 'number' && Number.isFinite(responseTime)
      ? Math.max(0, Math.round(responseTime))
      : null;

    answers.push({
      questionId: question.id,
      itemVersion: question.version,
      model: 'C',
      construct: question.construct,
      prompt: question.prompt,
      displayOrder: index,
      answerId: option.id,
      answerLabel: option.label,
      scores: option.scores,
      tags: option.tags ?? [],
      responseTimeMs,
    });
  });

  return answers;
}

export function scoreCouplesAnswers(answers: EnrichedCouplesAnswer[]): LensScores {
  return answers.reduce((totals, answer) => addLensScores(totals, answer.scores), emptyLensScores());
}

export function buildCouplesProfile(
  selectedAnswerIds: Record<string, string>,
  responseTimes: Record<string, number | null | undefined> = {},
  items: CouplesQuestion[] = couplesQuestions,
  options: EnrichCouplesAnswersOptions = {},
): CouplesProfileBuildResult {
  const answers = enrichCouplesAnswers(selectedAnswerIds, responseTimes, items, options);
  const rawScores = scoreCouplesAnswers(answers);
  const profile = profileFromLensScores(rawScores, answers);

  return { answers, rawScores, profile };
}

export function profileFromLensScores(rawScores: LensScores, answers: EnrichedCouplesAnswer[]): ParticipantLensProfile {
  const dimensions = normalizeLensScores(rawScores);
  const top = dimensions[0];
  const second = dimensions[1];
  const gapPct = Math.max(0, top.normalizedPct - second.normalizedPct);
  const hasLensEvidence = dimensions.some((dimension) => dimension.rawValue > 0);
  const topLenses = hasLensEvidence
    ? dimensions.filter((dimension) => dimension.normalizedPct > 0 && top.normalizedPct - dimension.normalizedPct <= couplesBlendThresholdPct)
    : [];
  const selectedLensByQuestion: Record<string, LensConstruct | null> = {};
  const partnerPredictionByQuestion: Record<string, LensConstruct | null> = {};
  let imageryBand: ImageryBand | undefined;
  let repairMove: RepairMove | undefined;

  for (const answer of answers) {
    selectedLensByQuestion[answer.questionId] = primaryLensFromAnswer(answer);
    partnerPredictionByQuestion[answer.questionId] = partnerPredictionFromAnswer(answer);
    imageryBand = imageryBand ?? imageryBandFromAnswer(answer);
    repairMove = repairMove ?? repairMoveFromAnswer(answer);
  }

  const isBlended = topLenses.length !== 1 || gapPct <= couplesBlendThresholdPct;
  const confidence = confidenceForProfile(top, gapPct, topLenses, answers);

  return {
    scoringVersion: couplesScoringVersion,
    dimensions,
    top,
    second,
    topLenses,
    isBlended,
    gapPct,
    confidence,
    imageryBand,
    selectedLensByQuestion,
    partnerPredictionByQuestion,
    repairMove,
  };
}

function confidenceForProfile(
  top: LensProfileDimension,
  gapPct: number,
  topLenses: LensProfileDimension[],
  answers: EnrichedCouplesAnswer[],
): ParticipantLensProfile['confidence'] {
  if (topLenses.length !== 1 || top.normalizedPct === 0 || gapPct <= couplesBlendThresholdPct) {
    return 'blended';
  }

  const support = evidenceSupportForLens(top.key, answers);
  if (gapPct >= 18 && support.questionCount >= 2 && support.families.size >= 2) {
    return 'clear';
  }

  return 'moderate';
}

function evidenceSupportForLens(lens: LensConstruct, answers: EnrichedCouplesAnswer[]): { questionCount: number; families: Set<string> } {
  const families = new Set<string>();
  let questionCount = 0;

  for (const answer of answers) {
    if (answer.construct === 'partnerPrediction' || answer.construct === 'imageryBand') continue;
    if ((answer.scores[lens] ?? 0) <= 0) continue;

    questionCount += 1;
    families.add(taskFamilyForQuestion(answer.questionId));
  }

  return { questionCount, families };
}

function taskFamilyForQuestion(questionId: string): string {
  if (questionId === 'c1_image_first_grab' || questionId === 'c2_image_describe_first') return 'image';
  if (questionId === 'c4_shared_memory_first') return 'memory';
  if (questionId === 'c5_assumed_obvious' || questionId === 'c6_explain_location_to_new_person') return 'grounding';
  if (questionId === 'c7_translation_help' || questionId === 'c10_crossed_wire_repair') return 'repair';
  if (questionId === 'c8_output_format') return 'output';
  return questionById.get(questionId)?.kind ?? 'unknown';
}

function primaryLensFromAnswer(answer: EnrichedCouplesAnswer): LensConstruct | null {
  const lens = answer.tags.find((tag): tag is Extract<CouplesAnswerTag, { type: 'lens' }> => tag.type === 'lens')?.lens;
  if (lens) return lens;

  let bestLens: LensConstruct | null = null;
  let bestScore = 0;
  for (const key of lensConstructs) {
    const score = answer.scores[key] ?? 0;
    if (score > bestScore) {
      bestLens = key;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestLens : null;
}

function partnerPredictionFromAnswer(answer: EnrichedCouplesAnswer): LensConstruct | null {
  return answer.tags.find((tag): tag is Extract<CouplesAnswerTag, { type: 'partnerPrediction' }> => tag.type === 'partnerPrediction')?.lens ?? null;
}

function imageryBandFromAnswer(answer: EnrichedCouplesAnswer): ImageryBand | undefined {
  return answer.tags.find((tag): tag is Extract<CouplesAnswerTag, { type: 'imageryBand' }> => tag.type === 'imageryBand')?.band;
}

function repairMoveFromAnswer(answer: EnrichedCouplesAnswer): RepairMove | undefined {
  return answer.tags.find((tag): tag is Extract<CouplesAnswerTag, { type: 'repairMove' }> => tag.type === 'repairMove')?.move;
}

type ParticipantComparisonSide = PairComparisonInput['participants'][number];

type CandidateDifference = {
  pattern: PairDifferencePattern;
  partnerALens?: LensConstruct;
  partnerBLens?: LensConstruct;
};

type LeaningPatternDefinition = {
  pattern: Exclude<PairDifferencePattern, 'different_repair_moves' | 'blended_or_low_contrast'>;
  firstLens: LensConstruct;
  secondLens: LensConstruct;
  title: string;
  body: string;
};

const leaningPatternDefinitions: LeaningPatternDefinition[] = [
  {
    pattern: 'object_vs_scene',
    firstLens: 'objectCategory',
    secondLens: 'sceneContext',
    title: 'Central handle and surrounding frame',
    body: 'In this round, the pair showed one path that started with the central handle and another that protected the surrounding frame. Naming both can keep the short version and the context-rich version connected.',
  },
  {
    pattern: 'label_vs_context',
    firstLens: 'semanticAnchor',
    secondLens: 'sceneContext',
    title: 'Label and context order',
    body: 'In this round, one selected-answer path led with the short label while the other led with surrounding context. The pair can reduce friction by naming which handle comes first before expanding.',
  },
  {
    pattern: 'sequence_vs_gist',
    firstLens: 'narrativeSequence',
    secondLens: 'gistAtmosphere',
    title: 'Sequence and overall meaning',
    body: 'In this round, one path preserved the steps while the other protected the overall meaning. The useful move is to say whether the pair needs the path or the bottom line first.',
  },
  {
    pattern: 'layout_vs_story',
    firstLens: 'spatialLayout',
    secondLens: 'narrativeSequence',
    title: 'Layout and walkthrough',
    body: 'In this round, one selected-answer path organized pieces by relationship while the other organized them as a walkthrough. A quick map plus a short sequence can help both handles stay visible.',
  },
  {
    pattern: 'detail_vs_atmosphere',
    firstLens: 'detailFeatures',
    secondLens: 'gistAtmosphere',
    title: 'Specific detail and whole atmosphere',
    body: 'In this round, one path grabbed concrete detail while the other protected the whole atmosphere. The pair can connect them by asking which detail carries the overall feeling.',
  },
];

const repairDifferenceCopy = {
  title: 'Different repair requests',
  body: 'In this round, the crossed-wire item showed different repair formats. The pair may get unstuck faster by asking for the format needed in the moment instead of assuming one format is shared.',
};

const lowContrastDifferenceCopy = {
  title: 'Blended or low-contrast signal',
  body: 'This short round did not create a strong contrast between the selected answers. That is still useful: the pair can ask which handle matters in the moment instead of assuming a fixed pattern.',
};

const translationMovesByPattern = {
  object_vs_scene: {
    forObjectLeaning: 'After naming the main thing, add one sentence of surrounding context.',
    forSceneLeaning: 'Name the central object or decision earlier, then add the scene around it.',
    sharedPractice: 'Try: "Main thing first, then one sentence of context."',
  },
  label_vs_context: {
    forLabelLeaning: 'Pair the short label with why it matters in this situation.',
    forContextLeaning: 'Give the short label before expanding the background.',
    sharedPractice: 'Try: "What handle are we using for this?"',
  },
  sequence_vs_gist: {
    forSequenceLeaning: 'Start with the bottom-line meaning before walking through the order.',
    forGistLeaning: 'Add the key steps that led to the meaning so the path is visible.',
    sharedPractice: 'Try: "Meaning first or sequence first?"',
  },
  layout_vs_story: {
    forLayoutLeaning: 'Add a brief walkthrough so the map does not stay only in your head.',
    forStoryLeaning: 'Mark the pieces and relationships explicitly as the story unfolds.',
    sharedPractice: 'Try sketching the relationship, then narrating the sequence.',
  },
  detail_vs_atmosphere: {
    forDetailLeaning: 'Say which detail changes the point, not every detail you noticed.',
    forAtmosphereLeaning: 'Name one concrete detail that supports the overall feeling.',
    sharedPractice: 'Try: "What detail carries the vibe?"',
  },
  different_repair_moves: {
    forPartnerA: 'Ask for the repair format you need instead of assuming it is obvious.',
    forPartnerB: 'Offer your preferred repair format, then ask what format would help them.',
    sharedPractice: 'Try: "Do you need the label, context, sequence, emotion, or layout?"',
  },
  blended_or_low_contrast: {
    sharedPractice: 'Try: "Which handle matters most right now: label, context, sequence, atmosphere, or layout?"',
  },
} as const;

export function comparePairProfiles(input: PairComparisonInput): PairComparisonReport {
  const partnerA = input.participants.find((participant) => participant.role === 'partner_a') ?? input.participants[0];
  const partnerB = input.participants.find((participant) => participant.role === 'partner_b') ?? input.participants[1];
  const candidateDifferences = selectCandidateDifferences(partnerA, partnerB);
  const isLowContrast = candidateDifferences.length === 0;
  const finalCandidates = isLowContrast ? [{ pattern: 'blended_or_low_contrast' as const }] : candidateDifferences.slice(0, 3);

  return {
    frame: 'This report stays with selected answers in this round. It is a prompt for translation, not a verdict about either partner.',
    isLowContrast,
    sharedGround: buildSharedGround(partnerA, partnerB),
    differences: finalCandidates.map((candidate) => buildDifference(candidate, partnerA, partnerB)),
    assumedSimilarity: buildAssumedSimilarity(partnerA, partnerB),
    translationMoves: finalCandidates.map((candidate) => buildTranslationMove(candidate)),
    imageryNote: buildImageryNote(partnerA.profile.imageryBand, partnerB.profile.imageryBand),
    whatThisIsNot: 'This is not a verdict about the relationship or either person. It is a short reflection on selected answers from this round.',
  };
}

function selectCandidateDifferences(partnerA: ParticipantComparisonSide, partnerB: ParticipantComparisonSide): CandidateDifference[] {
  const candidates: CandidateDifference[] = [];
  const largestDelta = largestConstructDelta(partnerA.profile, partnerB.profile);

  for (const definition of leaningPatternDefinitions) {
    const match = matchLeaningPattern(definition, partnerA.profile, partnerB.profile);
    if (match) candidates.push(match);
  }

  candidates.sort((left, right) => differenceStrength(right, partnerA.profile, partnerB.profile) - differenceStrength(left, partnerA.profile, partnerB.profile));

  if (partnerA.profile.repairMove && partnerB.profile.repairMove && partnerA.profile.repairMove !== partnerB.profile.repairMove) {
    candidates.push({ pattern: 'different_repair_moves' });
  }

  if (candidates.length === 0) return [];
  if (partnerA.profile.confidence === 'blended' && partnerB.profile.confidence === 'blended' && largestDelta < 12) {
    return candidates.some((candidate) => candidate.pattern === 'different_repair_moves')
      ? candidates.filter((candidate) => candidate.pattern === 'different_repair_moves')
      : [];
  }

  return candidates;
}

function matchLeaningPattern(
  definition: LeaningPatternDefinition,
  profileA: ParticipantLensProfile,
  profileB: ParticipantLensProfile,
): CandidateDifference | null {
  const aHasFirst = hasTopLens(profileA, definition.firstLens);
  const aHasSecond = hasTopLens(profileA, definition.secondLens);
  const bHasFirst = hasTopLens(profileB, definition.firstLens);
  const bHasSecond = hasTopLens(profileB, definition.secondLens);

  if (aHasFirst && bHasSecond && !(aHasSecond && bHasFirst)) {
    return { pattern: definition.pattern, partnerALens: definition.firstLens, partnerBLens: definition.secondLens };
  }

  if (aHasSecond && bHasFirst && !(aHasFirst && bHasSecond)) {
    return { pattern: definition.pattern, partnerALens: definition.secondLens, partnerBLens: definition.firstLens };
  }

  return null;
}

function hasTopLens(profile: ParticipantLensProfile, lens: LensConstruct): boolean {
  return profile.topLenses.some((dimension) => dimension.key === lens);
}

function largestConstructDelta(profileA: ParticipantLensProfile, profileB: ParticipantLensProfile): number {
  return Math.max(
    ...lensConstructs.map((key) => Math.abs(dimensionFor(profileA, key).normalizedPct - dimensionFor(profileB, key).normalizedPct)),
  );
}

function differenceStrength(candidate: CandidateDifference, profileA: ParticipantLensProfile, profileB: ParticipantLensProfile): number {
  if (candidate.pattern === 'different_repair_moves') return 1;
  if (!candidate.partnerALens || !candidate.partnerBLens) return 0;

  return Math.abs(dimensionFor(profileA, candidate.partnerALens).normalizedPct - dimensionFor(profileB, candidate.partnerALens).normalizedPct)
    + Math.abs(dimensionFor(profileA, candidate.partnerBLens).normalizedPct - dimensionFor(profileB, candidate.partnerBLens).normalizedPct);
}

function dimensionFor(profile: ParticipantLensProfile, lens: LensConstruct): LensProfileDimension {
  const found = profile.dimensions.find((dimension) => dimension.key === lens);
  if (found) return found;
  return { key: lens, label: lensLabels[lens], rawValue: 0, maxValue: 0, normalizedPct: 0, sharePct: 0 };
}

function buildSharedGround(partnerA: ParticipantComparisonSide, partnerB: ParticipantComparisonSide): string[] {
  const shared: string[] = [];
  const partnerATopLensKeys = new Set(partnerA.profile.topLenses.map((dimension) => dimension.key));
  const sharedTopLens = partnerB.profile.topLenses.find((dimension) => partnerATopLensKeys.has(dimension.key));

  if (sharedTopLens) {
    shared.push(
      `In this round, both partners' selected answers included ${sharedTopLens.label.toLowerCase()} among the strongest handles.`,
    );
  }

  const partnerBAnswers = answerMap(partnerB.answers);
  for (const answerA of partnerA.answers) {
    if (shared.length >= 3) break;
    if (answerA.construct === 'partnerPrediction') continue;

    const answerB = partnerBAnswers.get(answerA.questionId);
    if (!answerB || answerA.answerId !== answerB.answerId) continue;

    shared.push(`On the ${reportAnchorFor(answerA.questionId)}, both partners selected "${answerA.answerLabel}".`);
  }

  if (shared.length === 0) {
    shared.push('The shared ground was not very visible in this short round; that does not mean the pair lacks common handles.');
  }

  return shared;
}

function buildDifference(
  candidate: CandidateDifference,
  partnerA: ParticipantComparisonSide,
  partnerB: ParticipantComparisonSide,
): PairComparisonReport['differences'][number] {
  if (candidate.pattern === 'blended_or_low_contrast') {
    return {
      pattern: candidate.pattern,
      title: lowContrastDifferenceCopy.title,
      body: lowContrastDifferenceCopy.body,
      evidence: findEvidence(candidate, partnerA, partnerB),
    };
  }

  if (candidate.pattern === 'different_repair_moves') {
    return {
      pattern: candidate.pattern,
      title: repairDifferenceCopy.title,
      body: repairDifferenceCopy.body,
      evidence: findEvidence(candidate, partnerA, partnerB),
    };
  }

  const definition = leaningPatternDefinitions.find((item) => item.pattern === candidate.pattern);

  return {
    pattern: candidate.pattern,
    title: definition?.title ?? 'Visible answer contrast',
    body: definition?.body ?? 'In this round, the pair selected different handles for the same task.',
    evidence: findEvidence(candidate, partnerA, partnerB),
  };
}

function findEvidence(
  candidate: CandidateDifference,
  partnerA: ParticipantComparisonSide,
  partnerB: ParticipantComparisonSide,
): PairComparisonReport['differences'][number]['evidence'] {
  const evidence: PairComparisonReport['differences'][number]['evidence'] = [];
  const partnerBAnswers = answerMap(partnerB.answers);

  if (candidate.pattern === 'different_repair_moves') {
    const repairA = partnerA.answers.find((answer) => answer.questionId === 'c10_crossed_wire_repair');
    const repairB = partnerBAnswers.get('c10_crossed_wire_repair');
    if (repairA && repairB) {
      return [evidenceFromAnswers(repairA, repairB)];
    }
  }

  for (const answerA of partnerA.answers) {
    if (evidence.length >= 2) break;
    if (answerA.construct === 'partnerPrediction' || answerA.construct === 'imageryBand') continue;
    const answerB = partnerBAnswers.get(answerA.questionId);
    if (!answerB) continue;

    const lensA = primaryLensFromAnswer(answerA);
    const lensB = primaryLensFromAnswer(answerB);
    const lensMatch = candidate.partnerALens && candidate.partnerBLens
      ? lensA === candidate.partnerALens && lensB === candidate.partnerBLens
      : answerA.answerId !== answerB.answerId;

    if (lensMatch) evidence.push(evidenceFromAnswers(answerA, answerB));
  }

  if (evidence.length > 0) return evidence;

  const fallbackA = partnerA.answers.find((answer) => answer.construct !== 'partnerPrediction' && answer.construct !== 'imageryBand');
  const fallbackB = fallbackA ? partnerBAnswers.get(fallbackA.questionId) : undefined;
  return fallbackA && fallbackB ? [evidenceFromAnswers(fallbackA, fallbackB)] : [];
}

function evidenceFromAnswers(answerA: EnrichedCouplesAnswer, answerB: EnrichedCouplesAnswer): PairComparisonReport['differences'][number]['evidence'][number] {
  return {
    questionId: answerA.questionId,
    partnerAAnswer: answerA.answerLabel,
    partnerBAnswer: answerB.answerLabel,
  };
}

function buildAssumedSimilarity(partnerA: ParticipantComparisonSide, partnerB: ParticipantComparisonSide): PairComparisonReport['assumedSimilarity'] {
  const aAnswers = answerMap(partnerA.answers);
  const bAnswers = answerMap(partnerB.answers);
  const partnerAPrediction = aAnswers.get('c3_predict_partner_first_grab');
  const partnerBPrediction = bAnswers.get('c3_predict_partner_first_grab');
  const partnerAActual = aAnswers.get('c1_image_first_grab');
  const partnerBActual = bAnswers.get('c1_image_first_grab');

  const aPredictedLens = partnerAPrediction ? partnerPredictionFromAnswer(partnerAPrediction) : null;
  const bPredictedLens = partnerBPrediction ? partnerPredictionFromAnswer(partnerBPrediction) : null;
  const aActualLens = partnerAActual ? primaryLensFromAnswer(partnerAActual) : null;
  const bActualLens = partnerBActual ? primaryLensFromAnswer(partnerBActual) : null;
  const partnerAClose = Boolean(aPredictedLens && bActualLens && aPredictedLens === bActualLens);
  const partnerBClose = Boolean(bPredictedLens && aActualLens && bPredictedLens === aActualLens);
  const partnerAExpectedOwnHandle = Boolean(aPredictedLens && aActualLens && aPredictedLens === aActualLens && !partnerAClose);
  const partnerBExpectedOwnHandle = Boolean(bPredictedLens && bActualLens && bPredictedLens === bActualLens && !partnerBClose);

  let body: string;
  if (partnerAClose && partnerBClose) {
    body = 'In this round, both of you predicted each other closely on the image task.';
  } else if (partnerAExpectedOwnHandle && partnerBExpectedOwnHandle) {
    body = 'In this round, both of you expected your partner to start close to your own first handle. That is a cue to check the shared handle before continuing.';
  } else if (partnerAClose || partnerBClose) {
    body = 'In this round, one prediction landed close to the partner selected first handle, while the other pointed to a different starting handle. That is a cue to name the handle before continuing.';
  } else if (partnerAExpectedOwnHandle || partnerBExpectedOwnHandle) {
    body = 'In this round, one of you expected your partner to start close to your own first handle. The pair can use that as a cue to check which handle is shared.';
  } else {
    body = 'This was mixed in this round: the predictions and selected first handles did not form one simple pattern.';
  }

  return {
    body,
    partnerAPredicted: partnerAPrediction?.answerLabel,
    partnerBActual: partnerBActual?.answerLabel,
    partnerBPredicted: partnerBPrediction?.answerLabel,
    partnerAActual: partnerAActual?.answerLabel,
  };
}

function buildTranslationMove(candidate: CandidateDifference): TranslationMove {
  if (candidate.pattern === 'different_repair_moves') {
    const copy = translationMovesByPattern.different_repair_moves;
    return {
      pattern: candidate.pattern,
      forPartnerA: copy.forPartnerA,
      forPartnerB: copy.forPartnerB,
      sharedPractice: copy.sharedPractice,
    };
  }

  if (candidate.pattern === 'blended_or_low_contrast') {
    const sharedPractice = translationMovesByPattern.blended_or_low_contrast.sharedPractice;
    return {
      pattern: candidate.pattern,
      forPartnerA: sharedPractice,
      forPartnerB: sharedPractice,
      sharedPractice,
    };
  }

  return {
    pattern: candidate.pattern,
    forPartnerA: translationCopyForLens(candidate.pattern, candidate.partnerALens, 'partner_a'),
    forPartnerB: translationCopyForLens(candidate.pattern, candidate.partnerBLens, 'partner_b'),
    sharedPractice: sharedPracticeForPattern(candidate.pattern),
  };
}

function translationCopyForLens(pattern: PairDifferencePattern, lens: LensConstruct | undefined, role: ParticipantRole): string {
  switch (pattern) {
    case 'object_vs_scene':
      if (lens === 'objectCategory') return translationMovesByPattern.object_vs_scene.forObjectLeaning;
      if (lens === 'sceneContext') return translationMovesByPattern.object_vs_scene.forSceneLeaning;
      break;
    case 'label_vs_context':
      if (lens === 'semanticAnchor') return translationMovesByPattern.label_vs_context.forLabelLeaning;
      if (lens === 'sceneContext') return translationMovesByPattern.label_vs_context.forContextLeaning;
      break;
    case 'sequence_vs_gist':
      if (lens === 'narrativeSequence') return translationMovesByPattern.sequence_vs_gist.forSequenceLeaning;
      if (lens === 'gistAtmosphere') return translationMovesByPattern.sequence_vs_gist.forGistLeaning;
      break;
    case 'layout_vs_story':
      if (lens === 'spatialLayout') return translationMovesByPattern.layout_vs_story.forLayoutLeaning;
      if (lens === 'narrativeSequence') return translationMovesByPattern.layout_vs_story.forStoryLeaning;
      break;
    case 'detail_vs_atmosphere':
      if (lens === 'detailFeatures') return translationMovesByPattern.detail_vs_atmosphere.forDetailLeaning;
      if (lens === 'gistAtmosphere') return translationMovesByPattern.detail_vs_atmosphere.forAtmosphereLeaning;
      break;
    default:
      break;
  }

  return role === 'partner_a'
    ? 'Partner A can try the shared practice first, then ask which handle would help.'
    : 'Partner B can try the shared practice first, then ask which handle would help.';
}

function sharedPracticeForPattern(pattern: PairDifferencePattern): string {
  switch (pattern) {
    case 'object_vs_scene':
      return translationMovesByPattern.object_vs_scene.sharedPractice;
    case 'label_vs_context':
      return translationMovesByPattern.label_vs_context.sharedPractice;
    case 'sequence_vs_gist':
      return translationMovesByPattern.sequence_vs_gist.sharedPractice;
    case 'layout_vs_story':
      return translationMovesByPattern.layout_vs_story.sharedPractice;
    case 'detail_vs_atmosphere':
      return translationMovesByPattern.detail_vs_atmosphere.sharedPractice;
    case 'different_repair_moves':
      return translationMovesByPattern.different_repair_moves.sharedPractice;
    case 'blended_or_low_contrast':
      return translationMovesByPattern.blended_or_low_contrast.sharedPractice;
  }
}

function buildImageryNote(partnerABand?: ImageryBand, partnerBBand?: ImageryBand): string | undefined {
  if (!partnerABand || !partnerBBand || partnerABand === partnerBBand) return undefined;

  return 'In this round, one of you reported a more vivid inner picture. That can quietly change how "just picture it" lands.';
}

function answerMap(answers: EnrichedCouplesAnswer[]): Map<string, EnrichedCouplesAnswer> {
  return new Map(answers.map((answer) => [answer.questionId, answer]));
}

function reportAnchorFor(questionId: string): string {
  return questionById.get(questionId)?.reportAnchor ?? 'shared item';
}

export function findBannedPairReportTerms(text: string): string[] {
  const lowerText = text.toLowerCase();
  return pairReportBannedTerms.filter((term) => lowerText.includes(term));
}
